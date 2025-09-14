import { ApiProperty } from '@nestjs/swagger';

export class EmployeeBasicDetailsDto {
    @ApiProperty({ description: 'Employee ID' })
    employeeId: number;

    @ApiProperty({ description: 'Full name of the employee' })
    name: string;

    @ApiProperty({ description: 'Employee level' })
    level: number;

    @ApiProperty({ description: 'Working office' })
    workingOffice: string;

    @ApiProperty({ description: 'Position title' })
    position: string;

    @ApiProperty({ description: 'Date of birth', type: String })
    dob: string;

    @ApiProperty({ description: 'Group extracted from position' })
    group: string;
}
