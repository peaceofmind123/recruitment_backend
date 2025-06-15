import { ApiProperty } from '@nestjs/swagger';

export class EmployeeDetailDto {
    @ApiProperty({ description: 'Employee ID' })
    employeeId: string;

    @ApiProperty({ description: 'Full name of the employee' })
    name: string;

    @ApiProperty({ description: 'Date of birth' })
    dob: string;

    @ApiProperty({ description: 'Date of retirement' })
    dor: string;

    @ApiProperty({ description: 'Join date' })
    joinDate: string;

    @ApiProperty({ description: 'Permanent date' })
    permDate: string;
} 