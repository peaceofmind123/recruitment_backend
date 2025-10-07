import { ApiProperty } from '@nestjs/swagger';
import { EmployeeBasicDetailsDto } from './employee-basic-details.dto';
import { EmployeeSeniorityDataDto } from './employee-seniority-data.dto';
import { AssignmentWithExtrasDto } from './assignment-with-extras.dto';

export class EmployeeCompleteDetailsDto {
    @ApiProperty({ type: EmployeeBasicDetailsDto })
    details: EmployeeBasicDetailsDto;

    @ApiProperty({ type: EmployeeSeniorityDataDto })
    seniority: EmployeeSeniorityDataDto;

    @ApiProperty({ type: [AssignmentWithExtrasDto] })
    assignments: AssignmentWithExtrasDto[];
}


