import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class SeniorityMarksDto {
    @ApiProperty({
        description: 'End date of the bigyapan (vacancy)',
        example: '2024-03-20'
    })
    @IsDateString()
    bigyapanEndDate: Date;
} 