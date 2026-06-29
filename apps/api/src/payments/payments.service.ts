import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { OrderStatus, PaymentStatus } from '@limitwear/shared';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { DropsService } from '../drops/drops.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import type { PublicUser } from '../users/users.service';
import { CreatePaymentHoldDto, validateCreatePaymentHoldDto } from './dto/create-payment-hold.dto';
import { MonobankWebhookDto } from './dto/monobank-webhook.dto';
import { MonobankService } from './monobank.service';
import {
  Payment,
  PaymentDocument,
  PaymentProvider,
  RawWebhookEvent,
} from './schemas/payment.schema';

export interface PaymentHoldResponse {
  paymentId: string;
  orderId: string;
  providerInvoiceId: string;
  paymentUrl: string;
  holdExpiresAt: Date;
}

export interface MonobankWebhookResult {
  ok: true;
  duplicate: boolean;
  paymentId?: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly monobankService: MonobankService,
    private readonly dropsService: DropsService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createPaymentHold(
    user: PublicUser,
    dto: CreatePaymentHoldDto,
  ): Promise<PaymentHoldResponse> {
    const input = validateCreatePaymentHoldDto(dto);
    const order = await this.findUserPendingPaymentOrder(user, input.orderId);
    const amount = order.priceAtPurchase * order.quantity;
    const holdExpiresAt = this.getDefaultHoldExpiresAt();

    const payment = await this.paymentModel.create({
      orderId: order._id,
      userId: order.userId,
      dropId: order.dropId,
      provider: PaymentProvider.Monobank,
      amount,
      currency: order.currency,
      status: PaymentStatus.Created,
      holdExpiresAt,
      rawWebhookEvents: [],
    });

    try {
      const invoice = await this.monobankService.createHoldInvoice({
        orderId: order._id.toHexString(),
        amount,
        currency: order.currency,
      });

      payment.providerInvoiceId = invoice.invoiceId;
      payment.invoiceUrl = invoice.pageUrl;
      await payment.save();

      order.paymentId = payment._id;
      await order.save();

      return {
        paymentId: payment._id.toHexString(),
        orderId: order._id.toHexString(),
        providerInvoiceId: invoice.invoiceId,
        paymentUrl: invoice.pageUrl,
        holdExpiresAt,
      };
    } catch (error) {
      payment.status = PaymentStatus.Failed;
      payment.failedAt = new Date();
      payment.failureReason = 'Monobank invoice creation failed.';
      await payment.save();
      throw error;
    }
  }

  async handleMonobankWebhook(
    dto: MonobankWebhookDto,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<MonobankWebhookResult> {
    this.verifyWebhookSecret(headers);

    if (!dto.invoiceId?.trim()) {
      throw new BadRequestException('invoiceId is required.');
    }

    const payment = await this.paymentModel.findOne({ providerInvoiceId: dto.invoiceId }).exec();
    if (!payment) {
      throw new NotFoundException('Payment was not found.');
    }

    const event = this.toWebhookEvent(dto);
    if (payment.rawWebhookEvents.some((existing) => existing.eventId === event.eventId)) {
      return {
        ok: true,
        duplicate: true,
        paymentId: payment._id.toHexString(),
      };
    }

    payment.rawWebhookEvents.push(event);
    await this.applyWebhookStatus(payment, dto);
    await payment.save();

    await this.auditService.recordWebhookAction({
      action: 'payment.webhook_received',
      entity: { type: 'payment', id: payment._id.toHexString() },
      new: {
        provider: payment.provider,
        providerInvoiceId: payment.providerInvoiceId,
        status: payment.status,
        eventId: event.eventId,
      },
    });

    return {
      ok: true,
      duplicate: false,
      paymentId: payment._id.toHexString(),
    };
  }

  private async findUserPendingPaymentOrder(
    user: PublicUser,
    orderId: string,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findById(orderId).exec();

    if (!order) {
      throw new NotFoundException('Order was not found.');
    }

    if (order.userId.toHexString() !== user.id) {
      throw new ForbiddenException('Order does not belong to the current user.');
    }

    if (order.status !== OrderStatus.PendingPayment) {
      throw new BadRequestException('Payment hold can be created only for pending payment orders.');
    }

    if (order.paymentId) {
      throw new BadRequestException('Order already has a payment.');
    }

    return order;
  }

  private verifyWebhookSecret(headers: Record<string, string | string[] | undefined>): void {
    const expectedSecret = this.configService.get<string>('MONO_WEBHOOK_SECRET');
    if (!expectedSecret) {
      return;
    }

    const providedSecret = this.getHeader(headers, 'x-limitwear-webhook-secret');
    if (!providedSecret || providedSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid webhook signature.');
    }
  }

  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    key: string,
  ): string | undefined {
    const value = headers[key] ?? headers[key.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }

  private toWebhookEvent(dto: MonobankWebhookDto): RawWebhookEvent {
    const status = dto.status?.trim();
    const modifiedDate = dto.modifiedDate?.toString() ?? 'no-date';

    return {
      eventId: `${dto.invoiceId}:${status ?? 'unknown'}:${modifiedDate}`,
      invoiceId: dto.invoiceId,
      status,
      receivedAt: new Date(),
      payload: this.sanitizeWebhookPayload(dto),
    };
  }

  private sanitizeWebhookPayload(dto: MonobankWebhookDto): Record<string, unknown> {
    return JSON.parse(JSON.stringify(dto)) as Record<string, unknown>;
  }

  private async applyWebhookStatus(
    payment: PaymentDocument,
    dto: MonobankWebhookDto,
  ): Promise<void> {
    const status = dto.status?.trim().toLowerCase();

    if (status === PaymentStatus.HoldCreated || status === 'success' || status === 'hold') {
      if (payment.status === PaymentStatus.HoldCreated) {
        return;
      }

      await this.confirmHold(payment);
      return;
    }

    if (status === PaymentStatus.Finalized) {
      payment.status = PaymentStatus.Finalized;
      payment.finalizedAt = new Date();
      await this.orderModel
        .findByIdAndUpdate(payment.orderId, {
          status: OrderStatus.Paid,
          paidAt: new Date(),
        })
        .exec();
      return;
    }

    if (status === PaymentStatus.Cancelled || status === PaymentStatus.Expired) {
      payment.status =
        status === PaymentStatus.Expired ? PaymentStatus.Expired : PaymentStatus.Cancelled;
      payment.cancelledAt = new Date();
      await this.orderModel
        .findByIdAndUpdate(payment.orderId, {
          status: OrderStatus.Cancelled,
          cancelledAt: new Date(),
        })
        .exec();
      return;
    }

    if (status === PaymentStatus.Failed || status === 'failure' || status === 'reversed') {
      payment.status = PaymentStatus.Failed;
      payment.failedAt = new Date();
      payment.failureReason = status;
      await this.orderModel
        .findByIdAndUpdate(payment.orderId, {
          status: OrderStatus.PaymentFailed,
        })
        .exec();
      await this.notifyPaymentFailed(payment);
    }
  }

  private async confirmHold(payment: PaymentDocument): Promise<void> {
    const order = await this.orderModel.findById(payment.orderId).exec();
    if (!order) {
      throw new NotFoundException('Order was not found.');
    }

    await this.dropsService.confirmPaymentHoldQuantity({
      dropId: order.dropId.toHexString(),
      size: order.size,
      quantity: order.quantity,
    });

    payment.status = PaymentStatus.HoldCreated;
    await this.orderModel
      .findByIdAndUpdate(order._id, {
        status: OrderStatus.Reserved,
      })
      .exec();
    await this.notifyHoldCreated(payment, order);
  }

  private getDefaultHoldExpiresAt(): Date {
    const holdExpiresAt = new Date();
    holdExpiresAt.setDate(holdExpiresAt.getDate() + 9);
    return holdExpiresAt;
  }

  private async notifyHoldCreated(payment: PaymentDocument, order: OrderDocument): Promise<void> {
    await this.notificationsService.safelyCreateServiceNotification({
      userId: payment.userId,
      type: 'payment.hold_created',
      title: 'Кошти зарезервовано',
      message: 'Місце в дропі зарезервовано. Кошти будуть списані тільки якщо дроп відбудеться.',
      relatedEntityType: 'order',
      relatedEntityId: order._id,
      metadata: {
        paymentId: payment._id.toHexString(),
        dropId: order.dropId.toHexString(),
        status: PaymentStatus.HoldCreated,
      },
    });
  }

  private async notifyPaymentFailed(payment: PaymentDocument): Promise<void> {
    await this.notificationsService.safelyCreateServiceNotification({
      userId: payment.userId,
      type: 'payment.failed',
      title: 'Оплату не підтверджено',
      message: 'Monobank не підтвердив резервування коштів. Місце в дропі не було зайняте.',
      relatedEntityType: 'payment',
      relatedEntityId: payment._id,
      metadata: {
        orderId: payment.orderId.toHexString(),
        dropId: payment.dropId.toHexString(),
        status: PaymentStatus.Failed,
      },
    });
  }
}
