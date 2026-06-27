import { PartialType } from '@nestjs/swagger';
import { CreateDropDto } from './create-drop.dto';

export class UpdateDropDto extends PartialType(CreateDropDto) {}
