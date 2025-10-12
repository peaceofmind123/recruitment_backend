import { Controller, Post, UploadedFile, UseInterceptors, Get, Query, Body, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags, ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { FilterByEmployeeIdDto } from './dto/filter-by-employee-id.dto';
import { EmployeeDetailDto } from './dto/employee-detail.dto';
import { EmployeeDetailResponseDto, EmployeeServiceDetailResponseDto } from './dto/employee-detail-response.dto';
import { EmployeeBasicDetailsDto } from './dto/employee-basic-details.dto';
import { EmployeeSeniorityDataDto } from './dto/employee-seniority-data.dto';
import { AssignmentDetail } from './entities/assignment-detail.entity';
import { AssignmentWithExtrasDto } from './dto/assignment-with-extras.dto';
import { EmployeeCompleteDetailsDto } from './dto/employee-complete-details.dto';
import { ymdFromDurationDaysBS, formatBS } from '../common/utils/nepali-date.utils';

@ApiTags('Employee')
@Controller('employee')
export class EmployeeController {
    constructor(private readonly employeeService: EmployeeService) { }

    @Get('service-detail')
    @ApiOperation({ summary: 'Get all employees with their qualifications' })
    @ApiResponse({
        status: 200,
        description: 'Successfully retrieved all employees with qualifications',
        type: EmployeeServiceDetailResponseDto
    })
    async getServiceDetail(): Promise<EmployeeServiceDetailResponseDto> {
        return this.employeeService.getServiceDetail();
    }

    @Post('upload-service-detail')
    @ApiOperation({ summary: 'Upload service detail Excel file' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file', {
        fileFilter: (req, file, cb) => {
            if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                file.mimetype === 'application/vnd.ms-excel') {
                cb(null, true);
            } else {
                cb(new Error('Only Excel files are allowed!'), false);
            }
        },
    }))
    async uploadServiceDetail(@UploadedFile() file: Express.Multer.File) {
        await this.employeeService.uploadServiceDetail(file);
        return { message: 'File uploaded and processed successfully' };
    }

    @Post('filter-by-employeeId')
    @ApiOperation({ summary: 'Get employees by their IDs' })
    async filterByEmployeeIds(@Body() filterDto: FilterByEmployeeIdDto) {
        return this.employeeService.filterByEmployeeIds(filterDto);
    }

    @Post('upload-employee-detail')
    @ApiOperation({ summary: 'Upload employee detail Excel file' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Excel file containing employee details'
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Successfully processed employee details',
        type: EmployeeDetailResponseDto
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid file format or missing file'
    })
    @UseInterceptors(FileInterceptor('file', {
        fileFilter: (req, file, cb) => {
            if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                file.mimetype === 'application/vnd.ms-excel') {
                cb(null, true);
            } else {
                cb(new Error('Only Excel files are allowed!'), false);
            }
        },
    }))
    async uploadEmployeeDetail(@UploadedFile() file: Express.Multer.File): Promise<EmployeeDetailResponseDto> {
        const employeeDetails = await this.employeeService.uploadEmployeeDetail(file);
        // For each employee, sum totalGeographicalMarks across their assignments
        // Only consider assignments with the same level as the employee
        for (const emp of employeeDetails) {
            // Get employee's level from database
            const employee = await this.employeeService.getEmployeeById(parseInt(emp.employeeId));
            const employeeLevel = employee?.level || 0;

            emp.totalGeographicalMarksSum = (emp.assignments && Array.isArray(emp.assignments))
                ? emp.assignments
                    .filter(assignment => assignment.level === employeeLevel)
                    .reduce((sum, a) => sum + (a.totalGeographicalMarks || 0), 0)
                : 0;
        }
        return {
            employeeDetails,
            employeeCount: employeeDetails.length
        };
    }

    @Get('details')
    @ApiOperation({ summary: 'Get basic employee details by employeeId' })
    @ApiQuery({ name: 'employeeId', type: Number, required: true })
    @ApiResponse({ status: 200, type: EmployeeBasicDetailsDto })
    async getEmployeeDetails(@Query('employeeId') employeeId: string): Promise<EmployeeBasicDetailsDto> {
        const id = parseInt(employeeId, 10);
        if (isNaN(id)) {
            throw new NotFoundException('Invalid employeeId');
        }
        const details = await this.employeeService.getEmployeeBasicDetails(id);
        if (!details) {
            throw new NotFoundException('Employee not found');
        }
        return details;
    }

    @Get('seniority-data')
    @ApiOperation({ summary: 'Get seniority data in BS (years, months, days since seniority date)' })
    @ApiQuery({ name: 'employeeId', type: Number, required: true })
    @ApiQuery({ name: 'endDateBS', type: String, required: false, description: 'Optional BS end date (YYYY-MM-DD or YYYY/MM/DD). Must be on/after seniorityDateBS.' })
    @ApiResponse({ status: 200, type: EmployeeSeniorityDataDto })
    async getEmployeeSeniorityData(@Query('employeeId') employeeId: string, @Query('endDateBS') endDateBS?: string): Promise<EmployeeSeniorityDataDto> {
        const id = parseInt(employeeId, 10);
        if (isNaN(id)) {
            throw new NotFoundException('Invalid employeeId');
        }
        const data = await this.employeeService.getEmployeeSeniorityData(id, endDateBS);
        if (!data) {
            throw new NotFoundException('Employee not found or missing seniority date');
        }
        return data;
    }

    @Get('assignments')
    @ApiOperation({ summary: 'Get employee assignments, optionally filtered by level range' })
    @ApiQuery({ name: 'employeeId', type: Number, required: true })
    @ApiQuery({ name: 'startLevel', type: Number, required: false })
    @ApiQuery({ name: 'endLevel', type: Number, required: false })
    @ApiQuery({ name: 'defaultEndDateBS', type: String, required: false, description: 'Use for the last assignment if its endDateBS is null' })
    @ApiResponse({ status: 200, description: 'Assignment list with district, category, and Y/M/D between BS dates', type: [AssignmentWithExtrasDto] })
    async getEmployeeAssignments(
        @Query('employeeId') employeeId: string,
        @Query('startLevel') startLevel?: string,
        @Query('endLevel') endLevel?: string,
        @Query('defaultEndDateBS') defaultEndDateBS?: string,
    ) {
        const id = parseInt(employeeId, 10);
        if (isNaN(id)) {
            throw new NotFoundException('Invalid employeeId');
        }
        const start = startLevel !== undefined ? parseInt(startLevel, 10) : undefined;
        const end = endLevel !== undefined ? parseInt(endLevel, 10) : undefined;
        return this.employeeService.getEmployeeAssignmentsWithExtras(id, isNaN(start as any) ? undefined : start, isNaN(end as any) ? undefined : end, defaultEndDateBS);
    }

    // Alias endpoint: singular form
    @Get('assignment')
    @ApiOperation({ summary: 'Alias of GET /employee/assignments with the same response' })
    @ApiQuery({ name: 'employeeId', type: Number, required: true })
    @ApiQuery({ name: 'startLevel', type: Number, required: false })
    @ApiQuery({ name: 'endLevel', type: Number, required: false })
    @ApiQuery({ name: 'defaultEndDateBS', type: String, required: false, description: 'Use for the last assignment if its endDateBS is null' })
    @ApiResponse({ status: 200, type: [AssignmentWithExtrasDto] })
    async getEmployeeAssignmentAlias(
        @Query('employeeId') employeeId: string,
        @Query('startLevel') startLevel?: string,
        @Query('endLevel') endLevel?: string,
        @Query('defaultEndDateBS') defaultEndDateBS?: string,
    ) {
        const id = parseInt(employeeId, 10);
        if (isNaN(id)) {
            throw new NotFoundException('Invalid employeeId');
        }
        const start = startLevel !== undefined ? parseInt(startLevel, 10) : undefined;
        const end = endLevel !== undefined ? parseInt(endLevel, 10) : undefined;
        return this.employeeService.getEmployeeAssignmentsWithExtras(id, isNaN(start as any) ? undefined : start, isNaN(end as any) ? undefined : end, defaultEndDateBS);
    }

    @Get('complete-details')
    @ApiOperation({ summary: 'Aggregate details, seniority, and assignments for an employee' })
    @ApiQuery({ name: 'employeeId', type: Number, required: true })
    @ApiQuery({ name: 'startLevel', type: Number, required: false })
    @ApiQuery({ name: 'endLevel', type: Number, required: false })
    @ApiQuery({ name: 'defaultEndDateBS', type: String, required: false })
    @ApiQuery({ name: 'endDateBS', type: String, required: false, description: 'Optional BS end date for seniority (YYYY-MM-DD or YYYY/MM/DD)' })
    @ApiQuery({ name: 'leaveType', type: String, required: false, description: 'Optional filter to include only leaves of a specific type' })
    @ApiResponse({ status: 200, type: EmployeeCompleteDetailsDto })
    async getEmployeeCompleteDetails(
        @Query('employeeId') employeeId: string,
        @Query('startLevel') startLevel?: string,
        @Query('endLevel') endLevel?: string,
        @Query('defaultEndDateBS') defaultEndDateBS?: string,
        @Query('endDateBS') endDateBS?: string,
        @Query('leaveType') leaveType?: string,
    ): Promise<EmployeeCompleteDetailsDto> {
        const id = parseInt(employeeId, 10);
        if (isNaN(id)) {
            throw new NotFoundException('Invalid employeeId');
        }
        const startParsed = startLevel !== undefined ? parseInt(startLevel, 10) : undefined;
        const endParsed = endLevel !== undefined ? parseInt(endLevel, 10) : undefined;

        // Fetch details first to derive default start level if missing
        const details = await this.employeeService.getEmployeeBasicDetails(id);
        if (!details) {
            throw new NotFoundException('Employee not found');
        }

        const effectiveStart = (startParsed !== undefined && !isNaN(startParsed as any)) ? startParsed : (details.level ?? undefined);
        const effectiveEnd = (endParsed !== undefined && !isNaN(endParsed as any)) ? endParsed : undefined;

        // Use provided endDateBS as defaultEndDateBS for assignments
        const defaultEndForAssignments = endDateBS;

        const [seniority, assignments, absents, leaves, rewardsPunishments] = await Promise.all([
            this.employeeService.getEmployeeSeniorityData(id, endDateBS),
            this.employeeService.getEmployeeAssignmentsWithExtras(id, effectiveStart, effectiveEnd, defaultEndForAssignments),
            this.employeeService.getEmployeeAbsents(id),
            this.employeeService.getEmployeeLeaves(id, leaveType),
            this.employeeService.getEmployeeRewardsPunishments(id),
        ]);

        if (!seniority) {
            throw new NotFoundException('Employee not found or missing seniority date');
        }

        // Normalize BS dates for absents, leaves, rewards/punishments; compute Y/M/D from duration days
        const normAbsents = await Promise.all((absents as any[]).map(async a => {
            let fromBS = await this.employeeService.normalizeBsDateValue(a.fromDateBS);
            let toBS = await this.employeeService.normalizeBsDateValue(a.toDateBS);
            // If still AD-like after normalization, force AD->BS conversion
            const yFrom = fromBS && /^\d{4}-\d{2}-\d{2}$/.test(fromBS) ? parseInt(fromBS.slice(0, 4), 10) : undefined;
            if (yFrom !== undefined && yFrom < 2000) {
                try { fromBS = (await formatBS(new Date(fromBS))).replace(/\//g, '-'); } catch { }
            }
            const yTo = toBS && /^\d{4}-\d{2}-\d{2}$/.test(toBS) ? parseInt(toBS.slice(0, 4), 10) : undefined;
            if (yTo !== undefined && yTo < 2000) {
                try { toBS = (await formatBS(new Date(toBS))).replace(/\//g, '-'); } catch { }
            }
            const durationDays = Math.max(0, parseInt(a.duration, 10) || 0);
            let { years, months, days } = await ymdFromDurationDaysBS(durationDays);
            if (durationDays > 0 && years === 0 && months === 0 && days === 0) {
                const y = Math.floor(durationDays / 365);
                const remAfterY = durationDays - y * 365;
                const m = Math.floor(remAfterY / 30);
                const d = remAfterY - m * 30;
                years = y; months = m; days = d;
            }
            const totalNumDays = durationDays;
            return { ...a, fromDateBS: fromBS, toDateBS: toBS, years, months, days, totalNumDays };
        }));
        const normLeaves = await Promise.all((leaves as any[]).map(async l => {
            let fromBS = await this.employeeService.normalizeBsDateValue(l.fromDateBS);
            let toBS = await this.employeeService.normalizeBsDateValue(l.toDateBS);
            const yFrom = fromBS && /^\d{4}-\d{2}-\d{2}$/.test(fromBS) ? parseInt(fromBS.slice(0, 4), 10) : undefined;
            if (yFrom !== undefined && yFrom < 2000) {
                try { fromBS = (await formatBS(new Date(fromBS))).replace(/\//g, '-'); } catch { }
            }
            const yTo = toBS && /^\d{4}-\d{2}-\d{2}$/.test(toBS) ? parseInt(toBS.slice(0, 4), 10) : undefined;
            if (yTo !== undefined && yTo < 2000) {
                try { toBS = (await formatBS(new Date(toBS))).replace(/\//g, '-'); } catch { }
            }
            const durationDays = Math.max(0, parseInt(l.duration, 10) || 0);
            let { years, months, days } = await ymdFromDurationDaysBS(durationDays);
            if (durationDays > 0 && years === 0 && months === 0 && days === 0) {
                const y = Math.floor(durationDays / 365);
                const remAfterY = durationDays - y * 365;
                const m = Math.floor(remAfterY / 30);
                const d = remAfterY - m * 30;
                years = y; months = m; days = d;
            }
            const totalNumDays = durationDays;
            return { ...l, fromDateBS: fromBS, toDateBS: toBS, years, months, days, totalNumDays };
        }));
        const normRps = await Promise.all((rewardsPunishments as any[]).map(async r => {
            let fromBS = await this.employeeService.normalizeBsDateValue(r.fromDateBS);
            let toBS = await this.employeeService.normalizeBsDateValue(r.toDateBS);
            const yFrom = fromBS && /^\d{4}-\d{2}-\d{2}$/.test(fromBS) ? parseInt(fromBS.slice(0, 4), 10) : undefined;
            if (yFrom !== undefined && yFrom < 2000) {
                try { fromBS = (await formatBS(new Date(fromBS))).replace(/\//g, '-'); } catch { }
            }
            const yTo = toBS && /^\d{4}-\d{2}-\d{2}$/.test(toBS) ? parseInt(toBS.slice(0, 4), 10) : undefined;
            if (yTo !== undefined && yTo < 2000) {
                try { toBS = (await formatBS(new Date(toBS))).replace(/\//g, '-'); } catch { }
            }
            const durationDays = Math.max(0, parseInt(r.duration, 10) || 0);
            let { years, months, days } = await ymdFromDurationDaysBS(durationDays);
            if (durationDays > 0 && years === 0 && months === 0 && days === 0) {
                const y = Math.floor(durationDays / 365);
                const remAfterY = durationDays - y * 365;
                const m = Math.floor(remAfterY / 30);
                const d = remAfterY - m * 30;
                years = y; months = m; days = d;
            }
            const totalNumDays = durationDays;
            return { ...r, fromDateBS: fromBS, toDateBS: toBS, years, months, days, totalNumDays };
        }));

        return {
            // Flatten details
            employeeId: details.employeeId,
            name: details.name,
            level: details.level,
            workingOffice: details.workingOffice,
            position: details.position,
            dob: details.dob,
            group: details.group,
            // Flatten seniority
            seniorityDateBS: seniority.seniorityDateBS,
            endDateBS: seniority.endDateBS,
            years: seniority.years,
            months: seniority.months,
            days: seniority.days,
            // Keep assignments array
            assignments: assignments as any,
            absents: normAbsents as any,
            leaves: normLeaves as any,
            rewardsPunishments: normRps as any
        };
    }
} 