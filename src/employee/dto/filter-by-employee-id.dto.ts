import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber } from 'class-validator';

export class FilterByEmployeeIdDto {
    @ApiProperty({
        description: 'Array of employee IDs to filter by',
        type: [Number],
        example: [1001, 1002, 1003]
    })
    @IsArray()
    @IsNumber({}, { each: true })
    employeeIds: number[];
} 