import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max } from 'class-validator';

export class CreateApplicantDto {
    @ApiProperty({ description: 'Employee ID (4 digit number)' })
    @IsInt()
    @Min(1000)
    @Max(9999)
    employeeId: number;

    @ApiProperty({ description: 'Full name of the applicant' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Level of the position (1-12)' })
    @IsInt()
    @Min(1)
    @Max(12)
    level: number;

    @ApiProperty({ description: 'Position title' })
    @IsString()
    post: string;

    @ApiProperty({ description: 'Group category' })
    @IsString()
    group: string;

    @ApiProperty({ description: 'Sub-group category' })
    @IsString()
    subGroup: string;

    @ApiProperty({ description: 'Service department' })
    @IsString()
    service: string;
} 