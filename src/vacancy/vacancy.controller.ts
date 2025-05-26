import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
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
} 