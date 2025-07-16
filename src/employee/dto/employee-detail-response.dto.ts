import { ApiProperty } from '@nestjs/swagger';
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