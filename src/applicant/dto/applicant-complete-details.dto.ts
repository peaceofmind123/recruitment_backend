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

    @ApiProperty({ description: 'Applied level from vacancy' })
    appliedLevel: number;

    @ApiProperty({ description: 'Vacancy bigyapan end date in BS (used for calculations)' })
    bigyapanEndDateBS: string;

    @ApiProperty({ description: 'Education marks of the applicant', required: false, type: Number })
    educationMarks?: number;

    @ApiProperty({ description: 'Vacancy minimum qualifications (names)', required: false, type: [String] })
    minQualifications?: string[];

    @ApiProperty({ description: 'Vacancy additional qualifications (names)', required: false, type: [String] })
    additionalQualifications?: string[];
}


