import { ApiProperty } from '@nestjs/swagger';

export class EmployeeSeniorityDataDto {
    @ApiProperty({ description: 'Seniority date in BS (YYYY-MM-DD)' })
    seniorityDateBS: string;

    @ApiProperty({ description: 'Years elapsed from seniorityDateBS to today' })
    years: number;

    @ApiProperty({ description: 'Months elapsed from seniorityDateBS to today' })
    months: number;

    @ApiProperty({ description: 'Days elapsed from seniorityDateBS to today' })
    days: number;
}
