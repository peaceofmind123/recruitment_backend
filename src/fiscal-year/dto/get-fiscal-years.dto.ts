import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum FiscalYearSortBy {
    YEAR = 'year',
    STARTED_ON = 'startedOn',
    CLOSED_ON = 'closedOn',
}

export enum SortOrder {
    ASC = 'ASC',
    DESC = 'DESC',
}

export class GetFiscalYearsDto {
    @ApiPropertyOptional({ description: 'Filter by year' })
    @IsOptional()
    @IsString()
    year?: string;

    @ApiPropertyOptional({ description: 'Filter by status (open/closed)' })
    @IsOptional()
    @IsEnum(['open', 'closed'])
    status?: 'open' | 'closed';

    @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', default: 10 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    limit?: number = 10;

    @ApiPropertyOptional({
        description: 'Sort by field',
        enum: FiscalYearSortBy,
        default: FiscalYearSortBy.YEAR
    })
    @IsOptional()
    @IsEnum(FiscalYearSortBy)
    sortBy?: FiscalYearSortBy = FiscalYearSortBy.YEAR;

    @ApiPropertyOptional({
        description: 'Sort order',
        enum: SortOrder,
        default: SortOrder.DESC
    })
    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder = SortOrder.DESC;
} 