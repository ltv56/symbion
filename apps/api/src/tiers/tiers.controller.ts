import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { CreateTierDto } from './dto/create-tier.dto';
import { UpdateTierDto } from './dto/update-tier.dto';
import { Tier } from './tier.entity';
import { TiersService } from './tiers.service';

@Controller('tiers')
export class TiersController {
  constructor(private readonly tiersService: TiersService) {}

  @Get()
  findAll(): Promise<Tier[]> {
    return this.tiersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Tier> {
    const tier = await this.tiersService.findOne(id);

    if (!tier) {
      throw new NotFoundException(`Tier with id ${id} not found`);
    }

    return tier;
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  create(@Body() body: CreateTierDto): Promise<Tier> {
    return this.tiersService.create(body);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiNotFoundResponse({ description: 'Unknown tier' })
  @ApiConflictResponse({ description: 'Name or min_spend already used' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTierDto,
  ): Promise<Tier> {
    const tier = await this.tiersService.update(id, body);

    if (!tier) {
      throw new NotFoundException(`Tier with id ${id} not found`);
    }

    return tier;
  }
}
