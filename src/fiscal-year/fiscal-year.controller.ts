import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FiscalYearService } from './fiscal-year.service';
import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';
import { FiscalYear } from './entities/fiscal-year.entity';

@ApiTags('fiscal-year')
@Controller('fiscal-year')
export class FiscalYearController {
    constructor(private readonly fiscalYearService: FiscalYearService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new fiscal year' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'The fiscal year has been successfully created.',
        type: FiscalYear
    })
    @ApiResponse({
        status: HttpStatus.CONFLICT,
        description: 'A fiscal year with this year already exists.'
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid input data.'
    })
    @ApiResponse({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        description: 'Internal server error.'
    })
    async create(@Body() createFiscalYearDto: CreateFiscalYearDto): Promise<FiscalYear> {
        return await this.fiscalYearService.create(createFiscalYearDto);
    }
} 