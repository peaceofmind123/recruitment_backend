import { ApiProperty } from '@nestjs/swagger';
import { Sex } from '../../employee/entities/employee.entity';

export class AssignmentDetailDto {
    @ApiProperty({ description: 'Employee ID' })
    employeeId: number;

    @ApiProperty({ description: 'Start date in BS format' })
    startDateBS: string;

    @ApiProperty({ description: 'End date in BS format', required: false })
    endDateBS?: string;

    @ApiProperty({ description: 'Position' })
    position: string;

    @ApiProperty({ description: 'Jobs' })
    jobs: string;

    @ApiProperty({ description: 'Function' })
    function: string;

    @ApiProperty({ description: 'Employee category' })
    empCategory: string;

    @ApiProperty({ description: 'Employee type' })
    empType: string;

    @ApiProperty({ description: 'Work office' })
    workOffice: string;

    @ApiProperty({ description: 'Seniority date in BS format', required: false })
    seniorityDateBS?: string;

    @ApiProperty({ description: 'Level' })
    level: number;

    @ApiProperty({ description: 'Permanent level date in BS format', required: false })
    permLevelDateBS?: string;

    @ApiProperty({ description: 'Reason for position', required: false })
    reasonForPosition?: string;

    @ApiProperty({ description: 'Start date', required: false })
    startDate?: Date;

    @ApiProperty({ description: 'Seniority date', required: false })
    seniorityDate?: Date;

    @ApiProperty({ description: 'Total geographical marks', required: false })
    totalGeographicalMarks?: number;

    @ApiProperty({ description: 'Number of days old', required: false })
    numDaysOld?: number;

    @ApiProperty({ description: 'Number of days new', required: false })
    numDaysNew?: number;

    @ApiProperty({ description: 'Total number of days', required: false })
    totalNumDays?: number;

    @ApiProperty({ description: 'Calculated number of years from totalNumDays' })
    numYears: number;

    @ApiProperty({ description: 'Calculated number of months from totalNumDays' })
    numMonths: number;

    @ApiProperty({ description: 'Calculated number of days from totalNumDays' })
    numDays: number;

    @ApiProperty({ description: 'District of the work office', required: false })
    district?: string;

    @ApiProperty({ description: 'District category', required: false })
    districtCategory?: string;

    @ApiProperty({ description: 'Category marks for employee gender', required: false })
    categoryMarks?: number;

    @ApiProperty({ description: 'Category marks type (old/new)', required: false })
    categoryMarksType?: string;
}

export class ScorecardDto {
    @ApiProperty({ description: 'Employee ID' })
    employeeId: number;

    @ApiProperty({ description: 'Employee name' })
    name: string;

    @ApiProperty({ description: 'Employee level' })
    level: number;

    @ApiProperty({ description: 'Current position from service detail' })
    currentPosition: string;

    @ApiProperty({ description: 'Working office' })
    workingOffice: string;

    @ApiProperty({ description: 'Service from vacancy' })
    service: string;

    @ApiProperty({ description: 'Group from vacancy' })
    group: string;

    @ApiProperty({ description: 'Subgroup from vacancy' })
    subgroup: string;

    @ApiProperty({ description: 'Date of birth' })
    dob: Date;

    @ApiProperty({ description: 'Applied position from vacancy' })
    appliedPosition: string;

    @ApiProperty({ description: 'Seniority date' })
    seniorityDate: Date;

    @ApiProperty({ description: 'Bigyapan end date' })
    bigyapanEndDate: Date;

    @ApiProperty({ description: 'Years elapsed between seniority date and bigyapan end date' })
    yearsElapsed: number;

    @ApiProperty({ description: 'Months elapsed (remainder of year elapsed)' })
    monthsElapsed: number;

    @ApiProperty({ description: 'Days elapsed (remainder of months elapsed)' })
    daysElapsed: number;

    @ApiProperty({ description: 'Seniority marks' })
    seniorityMarks: number;

    @ApiProperty({ description: 'Year marks (years * 3.75)' })
    yearMarks: number;

    @ApiProperty({ description: 'Month marks (remainder months * 3.75/12)' })
    monthMarks: number;

    @ApiProperty({ description: 'Day marks (remainder days * 3.75/365)' })
    daysMarks: number;

    @ApiProperty({ description: 'Employee sex', enum: Sex })
    sex: Sex;

    @ApiProperty({ description: 'Assignment details with calculated time periods', type: [AssignmentDetailDto] })
    assignments: AssignmentDetailDto[];
} 