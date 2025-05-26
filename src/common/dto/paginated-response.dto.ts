import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
    @ApiProperty({ description: 'Array of items' })
    items: T[];

    @ApiProperty({ description: 'Total number of items' })
    total: number;

    @ApiProperty({ description: 'Current page number' })
    page: number;

    @ApiProperty({ description: 'Number of items per page' })
    limit: number;

    @ApiProperty({ description: 'Total number of pages' })
    totalPages: number;

    @ApiProperty({ description: 'Whether there is a next page' })
    hasNext: boolean;

    @ApiProperty({ description: 'Whether there is a previous page' })
    hasPrevious: boolean;

    constructor(items: T[], total: number, page: number, limit: number) {
        this.items = items;
        this.total = total;
        this.page = page;
        this.limit = limit;
        this.totalPages = Math.ceil(total / limit);
        this.hasNext = page < this.totalPages;
        this.hasPrevious = page > 1;
    }
} 