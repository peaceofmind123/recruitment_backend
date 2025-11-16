import { Controller, Get, Post, Body, Param, Delete, HttpCode, HttpStatus, Query, NotFoundException, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ApplicantService } from './applicant.service';
import { CreateApplicantDto } from './dto/create-applicant.dto';
import { Applicant } from './entities/applicant.entity';
import { SeniorityDetailsDto } from './dto/seniority-details.dto';
import { ScorecardDto } from './dto/scorecard.dto';
import { ApplicantCompleteDetailsDto } from './dto/applicant-complete-details.dto';
import { TemplateRendererService } from '../common/template-renderer.service';
import { EmployeeService } from '../employee/employee.service';
import { Sex } from '../employee/entities/employee.entity';
import { Response } from 'express';

@ApiTags('applicants')
@Controller('applicant')
export class ApplicantController {
    constructor(
        private readonly applicantService: ApplicantService,
        private readonly templateRenderer: TemplateRendererService,
        private readonly employeeService: EmployeeService,
    ) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new applicant' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'The applicant has been successfully created.',
        type: Applicant
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid input data.'
    })
    create(@Body() createApplicantDto: CreateApplicantDto): Promise<Applicant> {
        return this.applicantService.create(createApplicantDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all applicants' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns a list of all applicants.',
        type: [Applicant]
    })
    findAll(): Promise<Applicant[]> {
        return this.applicantService.findAll();
    }

    @Get('find')
    @ApiOperation({ summary: 'Get an applicant by employee ID and bigyapan number' })
    @ApiQuery({
        name: 'employeeId',
        required: true,
        description: 'Employee ID (4 digit number)',
        type: Number
    })
    @ApiQuery({
        name: 'bigyapanNo',
        required: true,
        description: 'Bigyapan number of the vacancy',
        type: String
    })
    @ApiQuery({
        name: 'leaveType',
        required: false,
        description: 'Optional filter to include only leaves of a specific type',
        type: String
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns the applicant with the specified employee ID and bigyapan number.',
        type: Applicant
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Applicant not found.'
    })
    findOne(
        @Query('employeeId') employeeId: string,
        @Query('bigyapanNo') bigyapanNo: string
    ): Promise<Applicant> {
        return this.applicantService.findOne(+employeeId, bigyapanNo);
    }

    @Delete('remove')
    @ApiOperation({ summary: 'Delete an applicant' })
    @ApiQuery({
        name: 'employeeId',
        required: true,
        description: 'Employee ID (4 digit number)',
        type: Number
    })
    @ApiQuery({
        name: 'bigyapanNo',
        required: true,
        description: 'Bigyapan number of the vacancy',
        type: String
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'The applicant has been successfully deleted.'
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Applicant not found.'
    })
    remove(
        @Query('employeeId') employeeId: string,
        @Query('bigyapanNo') bigyapanNo: string
    ): Promise<void> {
        return this.applicantService.remove(+employeeId, bigyapanNo);
    }

    @Get('scorecard')
    @ApiOperation({ summary: 'Get scorecard for an applicant with assignment details and calculated time periods' })
    @ApiQuery({
        name: 'employeeId',
        required: true,
        description: 'Employee ID (4 digit number)',
        type: Number
    })
    @ApiQuery({
        name: 'bigyapanNo',
        required: true,
        description: 'Bigyapan number of the vacancy',
        type: String
    })
    @ApiQuery({
        name: 'leaveType',
        required: false,
        description: 'Optional filter to include only leaves of a specific type',
        type: String
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns applicant complete details identical to employee complete-details plus vacancy fields.',
        type: ApplicantCompleteDetailsDto
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Applicant not found or bigyapan end date not found.'
    })
    getScorecard(
        @Query('employeeId') employeeId: string,
        @Query('bigyapanNo') bigyapanNo: string,
        @Query('leaveType') leaveType?: string
    ): Promise<ApplicantCompleteDetailsDto> {
        return this.applicantService.getScorecard(+employeeId, bigyapanNo, leaveType);
    }

    @Get('scorecard/html')
    @ApiOperation({ summary: 'Render applicant scorecard as HTML (templated)' })
    @ApiQuery({ name: 'employeeId', type: Number, required: true })
    @ApiQuery({ name: 'bigyapanNo', type: String, required: true })
    @ApiQuery({ name: 'leaveType', type: String, required: false })
    async renderApplicantScorecardHtml(
        @Query('employeeId') employeeId: string,
        @Query('bigyapanNo') bigyapanNo: string,
        @Query('leaveType') leaveType?: string,
        @Res() res?: Response,
    ) {
        const id = parseInt(employeeId, 10);
        if (isNaN(id)) {
            throw new NotFoundException('Invalid employeeId');
        }

        const details = await this.applicantService.getScorecard(id, bigyapanNo, leaveType);

        // Augment with education and gender from base entity
        const base = await this.employeeService.getEmployeeById(id);
        const gender = base?.sex === Sex.M ? 'M' : (base?.sex === Sex.F ? 'F' : '');
        const employee = {
            employeeId: details.employeeId,
            name: details.name,
            level: details.level,
            workingOffice: details.workingOffice,
            position: details.position,
            dob: details.dob,
            group: details.group,
            education: base?.education || '',
            gender
        } as any;

        const seniorityTotalMarks =
            Array.isArray(details.seniorityDetails)
                ? (details.seniorityDetails as any[]).flat().reduce((sum, seg: any) => {
                    const v = typeof seg?.marks === 'number' ? seg.marks : Number(seg?.marks) || 0;
                    return sum + v;
                }, 0)
                : 0;

        const geographicalTotalMarks =
            Array.isArray(details.assignments)
                ? (details.assignments as any[]).reduce((sum, seg: any) => {
                    const v = typeof seg?.totalMarks === 'number' ? seg.totalMarks : Number(seg?.totalMarks) || 0;
                    return sum + v;
                }, 0)
                : 0;

        const combinedTotalMarks = seniorityTotalMarks + geographicalTotalMarks;

        const html = this.templateRenderer.render('applicant-report', {
            employee,
            seniorityDetails: details.seniorityDetails,
            absents: details.absents,
            leaves: details.leaves,
            assignments: details.assignments,
            seniorityTotalMarks,
            geographicalTotalMarks,
            combinedTotalMarks,
            endDateBS: details.bigyapanEndDateBS,
            bigyapanNo,
            appliedPosition: details.appliedPosition,
            appliedLevel: details.appliedLevel
        });

        if (res) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);
        }
        return html;
    }
} 