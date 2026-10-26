import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '../members/member.entity';
import { MerchantsModule } from '../merchants/merchants.module';
import { Order } from './order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Member]), MerchantsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
