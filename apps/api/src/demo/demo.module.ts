import { Module } from '@nestjs/common';
import { DemoResetService } from './demo-reset.service';

@Module({ providers: [DemoResetService] })
export class DemoModule {}
