import { Controller, Post, Get, Put, Delete, Body, Query, Res, UseInterceptors, UploadedFile, BadRequestException, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { VacancyService } from './vacancy.service';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { UploadApprovedApplicantListDto } from './dto/upload-approved-applicant-list.dto';
import { Vacancy } from './entities/vacancy.entity';
import { SeniorityMarksDto } from './dto/seniority-marks.dto';
import { TemplateRendererService } from '../common/template-renderer.service';

@ApiTags('vacancies')
@Controller('vacancy')
export class VacancyController {
    constructor(
        private readonly vacancyService: VacancyService,
        private readonly templateRenderer: TemplateRendererService,
    ) { }

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

    @Get(':fiscalYear/:bigyapanNo')
    @ApiOperation({ summary: 'Get a vacancy by fiscal year and bigyapan number' })
    @ApiResponse({ status: 200, description: 'Returns the vacancy.', type: Vacancy })
    @ApiResponse({ status: 404, description: 'Vacancy not found.' })
    findByFiscalYearAndBigyapanNo(
        @Param('fiscalYear') fiscalYear: string,
        @Param('bigyapanNo') bigyapanNo: string
    ): Promise<Vacancy> {
        return this.vacancyService.findByFiscalYearAndBigyapanNo(fiscalYear, bigyapanNo);
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

    @Post('approved-applicant-list')
    @ApiOperation({ summary: 'Upload approved applicant list for a vacancy' })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 201, description: 'The approved applicant list has been successfully uploaded.', type: Vacancy })
    @ApiResponse({ status: 400, description: 'Invalid input data or file already exists.' })
    @ApiResponse({ status: 404, description: 'Vacancy not found.' })
    @UseInterceptors(FileInterceptor('file', {
        fileFilter: (req, file, callback) => {
            if (!file.originalname.match(/\.(xlsx|xls)$/)) {
                return callback(new Error('Only Excel files are allowed!'), false);
            }
            callback(null, true);
        }
    }))
    async uploadApprovedApplicantList(
        @Body() uploadDto: UploadApprovedApplicantListDto,
        @UploadedFile() file: Express.Multer.File
    ): Promise<Vacancy> {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        return this.vacancyService.uploadApprovedApplicantList(uploadDto.bigyapanNo, file);
    }

    @Get('approved-applicant-list')
    @ApiOperation({ summary: 'Download approved applicant list for a vacancy' })
    @ApiQuery({
        name: 'bigyapanNo',
        required: true,
        description: 'Bigyapan number of the vacancy',
        type: String
    })
    @ApiResponse({ status: 200, description: 'Returns the approved applicant list Excel file.' })
    @ApiResponse({ status: 404, description: 'Vacancy or approved applicant list not found.' })
    async downloadApprovedApplicantList(
        @Query('bigyapanNo') bigyapanNo: string,
        @Res() res: Response
    ): Promise<void> {
        const { filePath, fileName } = await this.vacancyService.getApprovedApplicantList(bigyapanNo);
        res.download(filePath, fileName);
    }

    @Post(':bigyapanNo/seniority-marks')
    @ApiOperation({ summary: 'Calculate seniority marks for all applicants of a vacancy' })
    async calculateSeniorityMarks(
        @Param('bigyapanNo') bigyapanNo: string,
        @Body() dto: SeniorityMarksDto
    ) {
        return this.vacancyService.calculateSeniorityMarks(bigyapanNo, dto);
    }

    @Get('report')
    @ApiOperation({ summary: 'Render vacancy applicants report as HTML (templated)' })
    @ApiQuery({ name: 'bigyapanNo', type: String, required: true })
    async renderVacancyApplicantsReportHtml(
        @Query('bigyapanNo') bigyapanNo: string,
        @Res() res: Response
    ) {
        if (!bigyapanNo || !bigyapanNo.toString().trim()) {
            throw new BadRequestException('Query parameter "bigyapanNo" is required');
        }
        const data = await this.vacancyService.getVacancyReportData(bigyapanNo);
        const html = this.templateRenderer.render('vacancy-report', data);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
    }
} 