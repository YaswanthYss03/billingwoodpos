import { PartialType } from '@nestjs/swagger';
import { CreateKotDto } from './create-kot.dto';

export class UpdateKotDto extends PartialType(CreateKotDto) {}
