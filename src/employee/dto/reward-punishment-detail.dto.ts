import { ApiProperty } from '@nestjs/swagger';

export class RewardPunishmentDetailDto {
    @ApiProperty({ description: 'Reward or punishment type', required: false })
    rpType?: string;

    @ApiProperty({ description: 'From date in BS', required: false })
    fromDateBS?: string;

    @ApiProperty({ description: 'To date in BS', required: false })
    toDateBS?: string;

    @ApiProperty({ description: 'Reward/Punishment name', required: false })
    rpName?: string;

    @ApiProperty({ description: 'Reason', required: false })
    reason?: string;

    @ApiProperty({ description: 'Derived years between fromDateBS and toDateBS', required: false })
    years?: number;

    @ApiProperty({ description: 'Derived months between fromDateBS and toDateBS', required: false })
    months?: number;

    @ApiProperty({ description: 'Derived days between fromDateBS and toDateBS', required: false })
    days?: number;

    @ApiProperty({ description: 'Derived total days between fromDateBS and toDateBS', required: false })
    totalNumDays?: number;
}


