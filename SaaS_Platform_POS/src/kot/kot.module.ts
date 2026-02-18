import { Module, forwardRef } from '@nestjs/common';
import { KotController } from './kot.controller';
import { KotService } from './kot.service';
import { PrintingModule } from '../printing/printing.module';
import { ItemsModule } from '../items/items.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [forwardRef(() => PrintingModule), ItemsModule, AuditModule],
  controllers: [KotController],
  providers: [KotService],
  exports: [KotService],
})
export class KotModule {}
