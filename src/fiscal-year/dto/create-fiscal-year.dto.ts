import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDate, IsOptional, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

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
    @Transform(({ value }) => new Date(value))
    @IsDate()
    startedOn: Date;

    @ApiProperty({
        description: 'End date of the fiscal year',
        example: '2025-04-13',
        required: false
    })
    @IsOptional()
    @Transform(({ value }) => value ? new Date(value) : undefined)
    @IsDate()
    closedOn?: Date;
} 