import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UploadApprovedApplicantListDto {
    @ApiProperty({ description: 'Bigyapan number of the vacancy' })
    @IsString()
    @IsNotEmpty()
    bigyapanNo: string;
} 