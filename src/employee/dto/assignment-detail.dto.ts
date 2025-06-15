import { ApiProperty } from '@nestjs/swagger';

export class AssignmentDetailDto {
    @ApiProperty({ description: 'Unique identifier for the assignment' })
    id: string;

    @ApiProperty({ description: 'Position of the employee' })
    position: string;

    @ApiProperty({ description: 'Jobs assigned to the employee' })
    jobs: string;

    @ApiProperty({ description: 'Function of the employee' })
    function: string;

    @ApiProperty({ description: 'Employee category' })
    empCategory: string;

    @ApiProperty({ description: 'Employee type' })
    empType: string;

    @ApiProperty({ description: 'Work office location' })
    workOffice: string;

    @ApiProperty({ description: 'Start date in BS format', required: false })
    startDateBS?: string;

    @ApiProperty({ description: 'End date in BS format', required: false })
    endDateBS?: string;

    @ApiProperty({ description: 'Seniority date in BS format', required: false })
    seniorityDateBS?: string;

    @ApiProperty({ description: 'Level of the employee (1-12)' })
    level: number;

    @ApiProperty({ description: 'Permanent level date in BS format', required: false })
    permLevelDateBS?: string;

    @ApiProperty({ description: 'Reason for position', required: false })
    reasonForPosition?: string;

    @ApiProperty({ description: 'Start date', required: false })
    startDate?: Date;

    @ApiProperty({ description: 'Seniority date', required: false })
    seniorityDate?: Date;

    @ApiProperty({ description: 'Employee ID' })
    employeeId: number;
} 