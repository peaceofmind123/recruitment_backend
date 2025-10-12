import { ApiProperty } from '@nestjs/swagger';

export class LeaveDetailDto {
    @ApiProperty({ description: 'From date in BS', required: false })
    fromDateBS?: string;

    @ApiProperty({ description: 'To date in BS', required: false })
    toDateBS?: string;

    @ApiProperty({ description: 'Leave type', required: false })
    leaveType?: string;

    @ApiProperty({ description: 'Duration text/number', required: false })
    duration?: string;

    @ApiProperty({ description: 'Remarks', required: false })
    remarks?: string;

    @ApiProperty({ description: 'Derived years between fromDateBS and toDateBS', required: false })
    years?: number;

    @ApiProperty({ description: 'Derived months between fromDateBS and toDateBS', required: false })
    months?: number;

    @ApiProperty({ description: 'Derived days between fromDateBS and toDateBS', required: false })
    days?: number;

    @ApiProperty({ description: 'Derived total days between fromDateBS and toDateBS', required: false })
    totalNumDays?: number;
}


