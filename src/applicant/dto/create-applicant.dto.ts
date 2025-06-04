import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max } from 'class-validator';

export class CreateApplicantDto {
    @ApiProperty({ description: 'Employee ID (4 digit number)' })
    @IsInt()
    @Min(1000)
    @Max(9999)
    employeeId: number;

    @ApiProperty({ description: 'Bigyapan number (foreign key to vacancy)' })
    @IsString()
    bigyapanNo: string;
} 