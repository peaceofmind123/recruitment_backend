import { ApiProperty } from '@nestjs/swagger';

export class SeniorityDetailsDto {
    @ApiProperty({ description: 'Employee ID' })
    employeeId: number;

    @ApiProperty({ description: 'Employee name' })
    name: string;

    @ApiProperty({ description: 'Employee level' })
    level: number;

    @ApiProperty({ description: 'Current position from service detail' })
    currentPosition: string;

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
} 