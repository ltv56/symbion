import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { demoLimitsOn } from '../demo/demo-limits';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { Merchant } from './merchant.entity';
import { CreatedMerchant, MerchantsService } from './merchants.service';

@Controller('merchants')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class MerchantsController {
  constructor(
    private readonly merchantsService: MerchantsService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  findAll(): Promise<Merchant[]> {
    return this.merchantsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Merchant> {
    const merchant = await this.merchantsService.findOne(id);

    if (!merchant) {
      throw new NotFoundException(`Merchant with id ${id} not found`);
    }

    return merchant;
  }

  @Post()
  create(@Body() body: CreateMerchantDto): Promise<CreatedMerchant> {
    return this.merchantsService.create(body.name);
  }

  @Patch(':id')
  @ApiNotFoundResponse({ description: 'Unknown merchant' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMerchantDto,
  ): Promise<Merchant> {
    const merchant = await this.merchantsService.update(id, body);
    if (!merchant) {
      throw new NotFoundException(`Merchant with id ${id} not found`);
    }
    return merchant;
  }

  @Post(':id/api-key')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'New API key, shown only here' })
  @ApiNotFoundResponse({ description: 'Unknown merchant' })
  @ApiForbiddenResponse({ description: 'Disabled in the demo' })
  async rotateApiKey(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CreatedMerchant> {
    // Rotating would break the demo keys shown on the login page until the nightly reset
    if (demoLimitsOn(this.config)) {
      throw new ForbiddenException('API keys cannot be rotated in the demo');
    }
    const merchant = await this.merchantsService.rotateApiKey(id);
    if (!merchant) {
      throw new NotFoundException(`Merchant with id ${id} not found`);
    }
    return merchant;
  }
}
