import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class SeniorityMarksDto {
    @ApiProperty({
        description: 'End date of the bigyapan (vacancy)',
        example: '2024-03-20T00:00:00.000Z'
    })
    @IsISO8601()
    bigyapanEndDate: string;
} 