import { ApiProperty } from '@nestjs/swagger';

export class AbsentDetailDto {
    @ApiProperty({ description: 'From date in BS', required: false })
    fromDateBS?: string;

    @ApiProperty({ description: 'To date in BS', required: false })
    toDateBS?: string;

    @ApiProperty({ description: 'Duration text/number', required: false })
    duration?: string;

    @ApiProperty({ description: 'Remarks', required: false })
    remarks?: string;
}


