import { Module, forwardRef } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { InventoryModule } from '../inventory/inventory.module';
import { ItemsModule } from '../items/items.module';
import { AuditModule } from '../audit/audit.module';
import { PrintingModule } from '../printing/printing.module';
import { TenantsModule } from '../tenants/tenants.module';
import { KotModule } from '../kot/kot.module';

@Module({
  imports: [
    InventoryModule, 
    ItemsModule, 
    AuditModule, 
    forwardRef(() => PrintingModule), 
    TenantsModule, 
    forwardRef(() => KotModule)
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
