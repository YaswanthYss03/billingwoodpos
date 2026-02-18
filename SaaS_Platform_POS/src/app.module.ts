import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { ItemsModule } from './items/items.module';
import { InventoryModule } from './inventory/inventory.module';
import { PurchasesModule } from './purchases/purchases.module';
import { BillingModule } from './billing/billing.module';
import { KotModule } from './kot/kot.module';
import { PrintingModule } from './printing/printing.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLE_TTL || '60'),
      limit: parseInt(process.env.THROTTLE_LIMIT || '100'),
    }]),
    
    // Feature modules
    CommonModule,
    UsersModule,
    AuthModule,
    TenantsModule,
    ItemsModule,
    InventoryModule,
    PurchasesModule,
    BillingModule,
    KotModule,
    PrintingModule,
    ReportsModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
