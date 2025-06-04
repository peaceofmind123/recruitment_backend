import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';
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

    @ApiProperty({ description: 'Full name of the applicant', required: false })
    @IsString()
    @IsOptional()
    @Column({ nullable: true })
    name: string;

    @ApiProperty({ description: 'Level of the position (1-12)', required: false })
    @IsInt()
    @Min(1)
    @Max(12)
    @IsOptional()
    @Column({ nullable: true })
    level: number;

    @ApiProperty({ description: 'Position title', required: false })
    @IsString()
    @IsOptional()
    @Column({ nullable: true })
    post: string;

    @ApiProperty({ description: 'Group category', required: false })
    @IsString()
    @IsOptional()
    @Column({ nullable: true })
    group: string;

    @ApiProperty({ description: 'Sub-group category', required: false })
    @IsString()
    @IsOptional()
    @Column({ nullable: true })
    subGroup: string;

    @ApiProperty({ description: 'Service category', required: false })
    @IsString()
    @IsOptional()
    @Column({ nullable: true })
    service: string;
} 