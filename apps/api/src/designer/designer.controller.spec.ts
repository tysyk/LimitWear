import { UserRole, UserStatus } from '@limitwear/shared';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { DesignerController } from './designer.controller';
import { DesignsService } from '../designs/designs.service';
import { FilesService } from '../files/files.service';
import { RequestsService } from '../requests/requests.service';

describe('DesignerController', () => {
  let controller: DesignerController;
  let requestsService: jest.Mocked<Pick<RequestsService, 'createDesignerApplication'>>;
  let designsService: jest.Mocked<
    Pick<
      DesignsService,
      | 'createDesignerDesign'
      | 'findDesignerDesigns'
      | 'submitDesignerDesign'
      | 'updateDesignerDesign'
    >
  >;
  let filesService: jest.Mocked<Pick<FilesService, 'upload'>>;

  const request = {
    user: {
      id: 'user-id',
      email: 'designer@example.com',
      role: UserRole.Designer,
      permissions: [],
      status: UserStatus.Active,
      isEmailVerified: false,
      isPhoneVerified: false,
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(() => {
    requestsService = {
      createDesignerApplication: jest.fn(),
    };
    designsService = {
      createDesignerDesign: jest.fn(),
      findDesignerDesigns: jest.fn(),
      submitDesignerDesign: jest.fn(),
      updateDesignerDesign: jest.fn(),
    };
    filesService = {
      upload: jest.fn(),
    };
    controller = new DesignerController(
      requestsService as unknown as RequestsService,
      designsService as unknown as DesignsService,
      filesService as unknown as FilesService,
    );
  });

  it('uploads a designer application attachment as a private file', async () => {
    filesService.upload.mockResolvedValue({ id: 'file-id' } as never);

    await expect(
      controller.uploadApplicationFile(
        {
          originalname: 'portfolio.pdf',
          mimetype: 'application/pdf',
          size: 4,
          buffer: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
        } as Express.Multer.File,
        request,
      ),
    ).resolves.toEqual({ id: 'file-id' });

    expect(filesService.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'designer_application_file',
        extension: 'pdf',
        visibility: 'private',
      }),
    );
  });

  it('delegates designer applications to the requests service', async () => {
    requestsService.createDesignerApplication.mockResolvedValue({ id: 'request-id' } as never);

    await expect(
      controller.apply(
        {
          displayName: 'LimitWear Studio',
          slug: 'limitwear-studio',
        },
        request,
      ),
    ).resolves.toEqual({ id: 'request-id' });
    expect(requestsService.createDesignerApplication).toHaveBeenCalledWith(request.user, {
      displayName: 'LimitWear Studio',
      slug: 'limitwear-studio',
    });
  });

  it('delegates designer design listing to the designs service', async () => {
    designsService.findDesignerDesigns.mockResolvedValue([]);

    await expect(controller.findDesigns(request)).resolves.toEqual([]);
    expect(designsService.findDesignerDesigns).toHaveBeenCalledWith(request.user);
  });

  it('delegates designer design creation to the designs service', async () => {
    designsService.createDesignerDesign.mockResolvedValue({ id: 'design-id' } as never);

    await expect(
      controller.createDesign(
        {
          title: 'Panther Hoodie',
        },
        request,
      ),
    ).resolves.toEqual({ id: 'design-id' });
    expect(designsService.createDesignerDesign).toHaveBeenCalledWith(request.user, {
      title: 'Panther Hoodie',
    });
  });

  it('delegates designer design updates to the designs service', async () => {
    designsService.updateDesignerDesign.mockResolvedValue({ id: 'design-id' } as never);

    await expect(
      controller.updateDesign(
        'design-id',
        {
          title: 'Updated Hoodie',
        },
        request,
      ),
    ).resolves.toEqual({ id: 'design-id' });
    expect(designsService.updateDesignerDesign).toHaveBeenCalledWith(request.user, 'design-id', {
      title: 'Updated Hoodie',
    });
  });

  it('delegates designer design submission to the designs service', async () => {
    designsService.submitDesignerDesign.mockResolvedValue({ id: 'design-id' } as never);

    await expect(controller.submitDesign('design-id', request)).resolves.toEqual({
      id: 'design-id',
    });
    expect(designsService.submitDesignerDesign).toHaveBeenCalledWith(request.user, 'design-id');
  });
});
