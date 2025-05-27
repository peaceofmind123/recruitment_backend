import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, Matches } from 'class-validator';

export class CreateVacancyDto {
    @ApiProperty({ description: 'Level of the position (1-12)' })
    @IsInt()
    @Min(1)
    @Max(12)
    level: number;

    @ApiProperty({ description: 'Service department' })
    @IsString()
    service: string;

    @ApiProperty({ description: 'Group category' })
    @IsString()
    group: string;

    @ApiProperty({ description: 'Sub-group category' })
    @IsString()
    subGroup: string;

    @ApiProperty({ description: 'Position title' })
    @IsString()
    position: string;

    @ApiProperty({ description: 'Associated fiscal year (e.g., "2081/82")' })
    @IsString()
    @Matches(/^\d{4}\/\d{2}$/, {
        message: 'Year must be in YYYY/YY format (e.g., "2081/82")'
    })
    fiscalYearYear: string;
} 