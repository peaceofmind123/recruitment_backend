import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString, IsDate, IsEnum } from 'class-validator';
import { Sex } from '../entities/employee.entity';
import { EmployeeDetailDto } from './employee-detail.dto';

export class EmployeeDetailResponseDto {
    @ApiProperty({
        description: 'Array of employee details',
        type: [EmployeeDetailDto]
    })
    employeeDetails: EmployeeDetailDto[];

    @ApiProperty({
        description: 'Total number of employees',
        type: Number
    })
    employeeCount: number;

    @ApiProperty({
        description: 'Sum of totalGeographicalMarks across all assignments for all employees',
        type: Number,
        required: false
    })
    totalGeographicalMarksSum?: number;
}

export class QualificationDto {
    @ApiProperty({ description: 'Qualification name/level' })
    @IsString()
    qualification: string;
}

export class EmployeeServiceDetailDto {
    @ApiProperty({ description: 'Employee ID' })
    @IsNumber()
    employeeId: number;

    @ApiProperty({ description: 'Employee full name' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Date of birth', format: 'date' })
    @IsDate()
    dob: Date;

    @ApiProperty({ description: 'Seniority date', format: 'date' })
    @IsDate()
    seniorityDate: Date;

    @ApiProperty({ description: 'Employee level' })
    @IsNumber()
    level: number;

    @ApiProperty({ description: 'Employee sex', enum: Sex })
    @IsEnum(Sex)
    sex: Sex;

    @ApiProperty({ description: 'Education/qualification string' })
    @IsString()
    education: string;

    @ApiProperty({ description: 'Working office' })
    @IsString()
    workingOffice: string;

    @ApiProperty({ description: 'Employee qualifications', type: [QualificationDto] })
    @IsArray()
    qualifications: QualificationDto[];
}

export class EmployeeServiceDetailResponseDto {
    @ApiProperty({ description: 'List of employees with qualifications', type: [EmployeeServiceDetailDto] })
    @IsArray()
    employees: EmployeeServiceDetailDto[];

    @ApiProperty({ description: 'Total number of employees' })
    @IsNumber()
    totalCount: number;
} 