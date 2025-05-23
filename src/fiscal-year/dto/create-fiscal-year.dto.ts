import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDate, IsOptional, Matches } from 'class-validator';

export class CreateFiscalYearDto {
    @ApiProperty({
        description: 'Fiscal year in YYYY/YY format (e.g., "2081/82")',
        example: '2081/82'
    })
    @IsString()
    @Matches(/^\d{4}\/\d{2}$/, {
        message: 'Year must be in YYYY/YY format (e.g., "2081/82")'
    })
    year: string;

    @ApiProperty({
        description: 'Start date of the fiscal year',
        example: '2024-04-14'
    })
    @IsDate()
    startedOn: Date;

    @ApiProperty({
        description: 'End date of the fiscal year',
        example: '2025-04-13',
        required: false
    })
    @IsOptional()
    @IsDate()
    closedOn?: Date;
} 