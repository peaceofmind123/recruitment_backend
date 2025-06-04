import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max, IsString } from 'class-validator';
import { Vacancy } from '../../vacancy/entities/vacancy.entity';

@Entity()
export class Applicant {
    @ApiProperty({ description: 'Employee ID (4 digit number)' })
    @PrimaryColumn()
    @IsInt()
    @Min(1000)
    @Max(9999)
    employeeId: number;

    @ApiProperty({ description: 'Bigyapan number (foreign key to vacancy)' })
    @PrimaryColumn()
    @IsString()
    bigyapanNo: string;

    @ApiProperty({ description: 'Associated vacancy', type: () => Vacancy })
    @ManyToOne(() => Vacancy, vacancy => vacancy.applicants)
    @JoinColumn({ name: 'bigyapanNo' })
    vacancy: Vacancy;
} 