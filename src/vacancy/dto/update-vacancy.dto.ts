import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max } from 'class-validator';

export class UpdateVacancyDto {
    @ApiProperty({ description: 'New bigyapan number (optional)' })
    @IsString()
    bigyapanNo?: string;

    @ApiProperty({ description: 'Number of positions available' })
    @IsInt()
    @Min(1)
    numPositions: number;

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
} 