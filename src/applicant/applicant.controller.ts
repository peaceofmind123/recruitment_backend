import { Controller, Get, Post, Body, Param, Delete, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ApplicantService } from './applicant.service';
import { CreateApplicantDto } from './dto/create-applicant.dto';
import { Applicant } from './entities/applicant.entity';
import { SeniorityDetailsDto } from './dto/seniority-details.dto';
import { ScorecardDto } from './dto/scorecard.dto';
import { ApplicantCompleteDetailsDto } from './dto/applicant-complete-details.dto';

@ApiTags('applicants')
@Controller('applicant')
export class ApplicantController {
    constructor(private readonly applicantService: ApplicantService) { }

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
} 