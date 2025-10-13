import { ApiProperty } from '@nestjs/swagger';
import { EmployeeCompleteDetailsDto } from '../../employee/dto/employee-complete-details.dto';

export class ApplicantCompleteDetailsDto extends EmployeeCompleteDetailsDto {
    @ApiProperty({ description: 'Service from vacancy' })
    service: string;

    // Note: `group` already exists on EmployeeCompleteDetailsDto (from employee basic details)
    // The endpoint will therefore include that `group` as-is.

    @ApiProperty({ description: 'Sub-group from vacancy' })
    subgroup: string;

    @ApiProperty({ description: 'Applied position from vacancy' })
    appliedPosition: string;

    @ApiProperty({ description: 'Vacancy bigyapan end date in BS (used for calculations)' })
    bigyapanEndDateBS: string;
}


