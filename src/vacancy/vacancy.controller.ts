import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { VacancyService } from './vacancy.service';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { Vacancy } from './entities/vacancy.entity';

@ApiTags('vacancies')
@Controller('vacancy')
export class VacancyController {
    constructor(private readonly vacancyService: VacancyService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new vacancy' })
    @ApiResponse({ status: 201, description: 'The vacancy has been successfully created.', type: Vacancy })
    @ApiResponse({ status: 400, description: 'Invalid input data.' })
    @ApiResponse({ status: 404, description: 'Fiscal year not found.' })
    create(@Body() createVacancyDto: CreateVacancyDto): Promise<Vacancy> {
        return this.vacancyService.create(createVacancyDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get vacancies by fiscal year' })
    @ApiQuery({
        name: 'fiscalYearYear',
        required: true,
        description: 'Fiscal year in YYYY/YY format (e.g., "2081/82")',
        type: String
    })
    @ApiResponse({ status: 200, description: 'Returns list of vacancies for the specified fiscal year.', type: [Vacancy] })
    @ApiResponse({ status: 404, description: 'Fiscal year not found.' })
    findByFiscalYear(@Query('fiscalYearYear') fiscalYearYear: string): Promise<Vacancy[]> {
        return this.vacancyService.findByFiscalYear(fiscalYearYear);
    }
} 