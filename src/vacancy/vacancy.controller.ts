import { Controller, Post, Get, Put, Delete, Body, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { VacancyService } from './vacancy.service';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
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

    @Put()
    @ApiOperation({ summary: 'Update a vacancy' })
    @ApiQuery({
        name: 'oldBigyapanNo',
        required: true,
        description: 'Current bigyapan number of the vacancy to update',
        type: String
    })
    @ApiResponse({ status: 200, description: 'The vacancy has been successfully updated.', type: Vacancy })
    @ApiResponse({ status: 400, description: 'Invalid input data.' })
    @ApiResponse({ status: 404, description: 'Vacancy not found.' })
    @ApiResponse({ status: 409, description: 'New bigyapan number already exists.' })
    update(
        @Query('oldBigyapanNo') oldBigyapanNo: string,
        @Body() updateVacancyDto: UpdateVacancyDto
    ): Promise<Vacancy> {
        return this.vacancyService.update(oldBigyapanNo, updateVacancyDto);
    }

    @Delete()
    @ApiOperation({ summary: 'Delete a vacancy' })
    @ApiQuery({
        name: 'bigyapanNo',
        required: true,
        description: 'Bigyapan number of the vacancy to delete',
        type: String
    })
    @ApiResponse({ status: 200, description: 'The vacancy has been successfully deleted.' })
    @ApiResponse({ status: 404, description: 'Vacancy not found.' })
    delete(@Query('bigyapanNo') bigyapanNo: string): Promise<void> {
        return this.vacancyService.delete(bigyapanNo);
    }

    @Get('applicant-list-format')
    @ApiOperation({ summary: 'Download applicant list format Excel file' })
    @ApiResponse({ status: 200, description: 'Returns the applicant list format Excel file.' })
    @ApiResponse({ status: 404, description: 'Applicant list format file not found.' })
    async downloadApplicantListFormat(@Res() res: Response): Promise<void> {
        const { filePath, fileName } = await this.vacancyService.getApplicantListFormat();
        res.download(filePath, fileName);
    }
} 