import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FiscalYearService } from './fiscal-year.service';
import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';
import { FiscalYear } from './entities/fiscal-year.entity';

@ApiTags('fiscal-year')
@Controller('fiscal-year')
export class FiscalYearController {
    constructor(private readonly fiscalYearService: FiscalYearService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new fiscal year' })
    @ApiResponse({
        status: 201,
        description: 'The fiscal year has been successfully created.',
        type: FiscalYear
    })
    @ApiResponse({ status: 400, description: 'Bad request.' })
    async create(@Body() createFiscalYearDto: CreateFiscalYearDto): Promise<FiscalYear> {
        return await this.fiscalYearService.create(createFiscalYearDto);
    }
} 