import { ApiProperty } from '@nestjs/swagger';
import { AssignmentDetailDto } from './assignment-detail.dto';

export class EmployeeDetailDto {
    @ApiProperty({ description: 'Employee ID' })
    employeeId: string;

    @ApiProperty({ description: 'Full name of the employee', required: false })
    name?: string;

    @ApiProperty({ description: 'Date of birth', required: false })
    dob?: string;

    @ApiProperty({ description: 'Date of retirement', required: false })
    dor?: string;

    @ApiProperty({ description: 'Join date', required: false })
    joinDate?: string;

    @ApiProperty({ description: 'Permanent date', required: false })
    permDate?: string;

    @ApiProperty({
        description: 'Array of assignment details',
        type: [AssignmentDetailDto],
        required: false
    })
    assignments?: AssignmentDetailDto[];

    @ApiProperty({
        description: 'Sum of totalGeographicalMarks across all assignments for this employee',
        type: Number,
        required: false
    })
    totalGeographicalMarksSum?: number;
} 