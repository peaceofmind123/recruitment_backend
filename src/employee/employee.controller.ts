import { Controller, Post, UploadedFile, UseInterceptors, Get, Query, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags, ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { FilterByEmployeeIdDto } from './dto/filter-by-employee-id.dto';
import { EmployeeDetailDto } from './dto/employee-detail.dto';
import { EmployeeDetailResponseDto, EmployeeServiceDetailResponseDto } from './dto/employee-detail-response.dto';

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
} 