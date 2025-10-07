import { ApiProperty } from '@nestjs/swagger';

export class AssignmentWithExtrasDto {
    @ApiProperty()
    employeeId: number;

    @ApiProperty()
    startDateBS: string;

    @ApiProperty({ required: false })
    endDateBS?: string;

    @ApiProperty()
    position: string;

    @ApiProperty()
    jobs: string;

    @ApiProperty()
    function: string;

    @ApiProperty()
    empCategory: string;

    @ApiProperty()
    empType: string;

    @ApiProperty()
    workOffice: string;

    @ApiProperty({ required: false })
    seniorityDateBS?: string;

    @ApiProperty()
    level: number;

    @ApiProperty({ required: false })
    permLevelDateBS?: string;

    @ApiProperty({ required: false })
    reasonForPosition?: string;

    @ApiProperty({ required: false })
    startDate?: Date;

    @ApiProperty({ required: false })
    seniorityDate?: Date;

    @ApiProperty({ required: false })
    totalGeographicalMarks?: number;

    @ApiProperty({ description: 'Marks computed per assignment segment per marks-calculation.md', required: false })
    totalMarks?: number;

    @ApiProperty({ description: 'Per-year marks used for this segment', required: false })
    marksYear?: number;

    @ApiProperty({ required: false })
    numDaysOld?: number;

    @ApiProperty({ required: false })
    numDaysNew?: number;

    // Additional fields requested
    @ApiProperty({ description: 'Associated district for the assignment', required: false })
    district?: string;

    @ApiProperty({ description: 'Associated category for the assignment', required: false })
    category?: string;

    @ApiProperty({ description: 'Years between startDateBS and endDateBS', required: false })
    years?: number;

    @ApiProperty({ description: 'Months between startDateBS and endDateBS', required: false })
    months?: number;

    @ApiProperty({ description: 'Days between startDateBS and endDateBS', required: false })
    days?: number;

    @ApiProperty({ description: 'Total days between startDateBS and endDateBS', required: false })
    totalNumDays?: number;

    @ApiProperty({ description: 'True if the segment is at/before break date; false if after', required: false })
    beforeBreak?: boolean;

    @ApiProperty({ description: 'Cumulative present days for consecutive same-category segments', required: false })
    presentDays?: number;
}


