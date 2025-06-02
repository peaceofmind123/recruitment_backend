import { Controller, Get, Post, Body, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApplicantService } from './applicant.service';
import { CreateApplicantDto } from './dto/create-applicant.dto';
import { Applicant } from './entities/applicant.entity';

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

    @Get(':employeeId')
    @ApiOperation({ summary: 'Get an applicant by employee ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns the applicant with the specified employee ID.',
        type: Applicant
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Applicant not found.'
    })
    findOne(@Param('employeeId') employeeId: string): Promise<Applicant> {
        return this.applicantService.findOne(+employeeId);
    }

    @Delete(':employeeId')
    @ApiOperation({ summary: 'Delete an applicant' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'The applicant has been successfully deleted.'
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Applicant not found.'
    })
    remove(@Param('employeeId') employeeId: string): Promise<void> {
        return this.applicantService.remove(+employeeId);
    }
} 