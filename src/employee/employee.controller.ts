import { Controller, Post, UploadedFile, UseInterceptors, Get, Query, Body, NotFoundException, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags, ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { Sex } from './entities/employee.entity';
import { FilterByEmployeeIdDto } from './dto/filter-by-employee-id.dto';
import { EmployeeDetailDto } from './dto/employee-detail.dto';
import { EmployeeDetailResponseDto, EmployeeServiceDetailResponseDto } from './dto/employee-detail-response.dto';
import { EmployeeBasicDetailsDto } from './dto/employee-basic-details.dto';
import { EmployeeSeniorityDataDto } from './dto/employee-seniority-data.dto';
import { AssignmentDetail } from './entities/assignment-detail.entity';
import { AssignmentWithExtrasDto } from './dto/assignment-with-extras.dto';
import { EmployeeCompleteDetailsDto } from './dto/employee-complete-details.dto';
import { ymdFromDurationDaysBS, formatBS } from '../common/utils/nepali-date.utils';
import { TemplateRendererService } from '../common/template-renderer.service';
import { Response } from 'express';

@ApiTags('Employee')
@Controller('employee')
export class EmployeeController {
    constructor(
        private readonly employeeService: EmployeeService,
        private readonly templateRenderer: TemplateRendererService,
    ) { }

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

        // Build seniorityDetails 2D array by splitting seniority period by absents and NON STANDARD leaves
        const seniorityDetails = await (async () => {
            const { diffNepaliYMD } = await import('../common/utils/nepali-date.utils');
            const x = (seniority.seniorityDateBS || '').replace(/\//g, '-');
            const y = (seniority.endDateBS || '').replace(/\//g, '-');
            const segments: any[] = [];

            const validRange = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
            if (!validRange(x) || !validRange(y) || x > y) {
                // Fallback: single segment empty
                return [[]];
            }

            type BreakSeg = { start: string; end: string; remarks: string };
            const breaks: BreakSeg[] = [];
            for (const a of normAbsents as any[]) {
                const s = (a.fromDateBS || '').replace(/\//g, '-');
                const e = (a.toDateBS || '').replace(/\//g, '-');
                if (validRange(s) && validRange(e)) {
                    // Intersect with [x,y]
                    const start = s < x ? x : s;
                    const end = e > y ? y : e;
                    if (start < end) breaks.push({ start, end, remarks: 'absent' });
                }
            }
            for (const l of normLeaves as any[]) {
                if ((l.leaveType || '').toString().trim().toUpperCase() !== 'NON STANDARD') continue;
                const s = (l.fromDateBS || '').replace(/\//g, '-');
                const e = (l.toDateBS || '').replace(/\//g, '-');
                if (validRange(s) && validRange(e)) {
                    const start = s < x ? x : s;
                    const end = e > y ? y : e;
                    if (start < end) breaks.push({ start, end, remarks: 'non-standard leave' });
                }
            }

            // Sort breaks by start, then end
            breaks.sort((b1, b2) => (b1.start < b2.start ? -1 : b1.start > b2.start ? 1 : (b1.end < b2.end ? -1 : b1.end > b2.end ? 1 : 0)));

            // Walk timeline from x to y, carving out break intervals in order
            let current = x;
            for (const br of breaks) {
                if (br.end <= current) {
                    continue; // already passed
                }
                const normalStart = current;
                const normalEnd = br.start > y ? y : br.start;
                if (normalStart < normalEnd) {
                    const ymd = await diffNepaliYMD(normalStart, normalEnd);
                    const marks = ymd.years * 3.75 + ymd.months * (3.75 / 12) + ymd.days * (3.75 / 365);
                    segments.push({ startDateBS: normalStart, endDateBS: normalEnd, years: ymd.years, months: ymd.months, days: ymd.days, marks });
                }
                // Break overlap segment
                const breakStart = br.start < current ? current : br.start;
                const breakEnd = br.end > y ? y : br.end;
                if (breakStart < breakEnd) {
                    const ymd = await diffNepaliYMD(breakStart, breakEnd);
                    segments.push({ startDateBS: breakStart, endDateBS: breakEnd, years: ymd.years, months: ymd.months, days: ymd.days, marks: 0, remarks: br.remarks });
                    current = breakEnd;
                }
                if (current >= y) break;
            }
            if (current < y) {
                const ymd = await diffNepaliYMD(current, y);
                const marks = ymd.years * 3.75 + ymd.months * (3.75 / 12) + ymd.days * (3.75 / 365);
                segments.push({ startDateBS: current, endDateBS: y, years: ymd.years, months: ymd.months, days: ymd.days, marks });
            }

            // If there were no breaks and segments is empty, add single full segment
            if (segments.length === 0) {
                const ymd = await diffNepaliYMD(x, y);
                const marks = ymd.years * 3.75 + ymd.months * (3.75 / 12) + ymd.days * (3.75 / 365);
                segments.push({ startDateBS: x, endDateBS: y, years: ymd.years, months: ymd.months, days: ymd.days, marks });
            }

            return [segments];
        })();

        return {
            // Flatten details
            employeeId: details.employeeId,
            name: details.name,
            level: details.level,
            workingOffice: details.workingOffice,
            position: details.position,
            dob: details.dob,
            group: details.group,
            // Keep assignments array
            assignments: assignments as any,
            absents: normAbsents as any,
            leaves: normLeaves as any,
            rewardsPunishments: normRps as any,
            seniorityDetails
        };
    }

    @Get('report/html')
    @ApiOperation({ summary: 'Render employee report as HTML (templated)' })
    @ApiQuery({ name: 'employeeId', type: Number, required: true })
    @ApiQuery({ name: 'startLevel', type: Number, required: false })
    @ApiQuery({ name: 'endLevel', type: Number, required: false })
    @ApiQuery({ name: 'defaultEndDateBS', type: String, required: false })
    @ApiQuery({ name: 'endDateBS', type: String, required: false })
    @ApiQuery({ name: 'leaveType', type: String, required: false })
    async renderEmployeeReportHtml(
        @Query('employeeId') employeeId: string,
        @Query('startLevel') startLevel?: string,
        @Query('endLevel') endLevel?: string,
        @Query('defaultEndDateBS') defaultEndDateBS?: string,
        @Query('endDateBS') endDateBS?: string,
        @Query('leaveType') leaveType?: string,
        @Res() res?: Response,
    ) {
        const id = parseInt(employeeId, 10);
        if (isNaN(id)) {
            throw new NotFoundException('Invalid employeeId');
        }

        // Reuse existing aggregation
        const details = await this.getEmployeeCompleteDetails(employeeId, startLevel, endLevel, defaultEndDateBS, endDateBS, leaveType);

        // add additional arguments to seniority details

        // Augment with education from base entity
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

        // Compute totals for report consumption
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

        const html = this.templateRenderer.render('employee-report', {
            employee,
            seniorityDetails: details.seniorityDetails,
            absents: details.absents,
            leaves: details.leaves,
            assignments: details.assignments,
            seniorityTotalMarks,
            geographicalTotalMarks,
            combinedTotalMarks,
            endDateBS
        });

        if (res) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);
        }
        return html;
    }
} 