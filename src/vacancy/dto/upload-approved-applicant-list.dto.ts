import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UploadApprovedApplicantListDto {
    @ApiProperty({ description: 'Bigyapan number of the vacancy' })
    @IsString()
    @IsNotEmpty()
    bigyapanNo: string;

    @ApiProperty({
        description: 'Excel file containing the approved applicant list',
        type: 'string',
        format: 'binary'
    })
    file: Express.Multer.File;
} 