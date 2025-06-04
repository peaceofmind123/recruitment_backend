import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateApplicantDto {
    @ApiProperty({ description: 'Employee ID (4 digit number)' })
    @IsInt()
    @Min(1000)
    @Max(9999)
    employeeId: number;

    @ApiProperty({ description: 'Bigyapan number (foreign key to vacancy)' })
    @IsString()
    bigyapanNo: string;

    @ApiProperty({ description: 'Full name of the applicant', required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ description: 'Level of the position (1-12)', required: false })
    @IsInt()
    @Min(1)
    @Max(12)
    @IsOptional()
    level?: number;

    @ApiProperty({ description: 'Position title', required: false })
    @IsString()
    @IsOptional()
    post?: string;

    @ApiProperty({ description: 'Group category', required: false })
    @IsString()
    @IsOptional()
    group?: string;

    @ApiProperty({ description: 'Sub-group category', required: false })
    @IsString()
    @IsOptional()
    subGroup?: string;

    @ApiProperty({ description: 'Service category', required: false })
    @IsString()
    @IsOptional()
    service?: string;
} 