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
}


