import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max, IsString, IsNumber, IsOptional } from 'class-validator';
import { Vacancy } from '../../vacancy/entities/vacancy.entity';
import { Employee } from '../../employee/entities/employee.entity';

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

    @ApiProperty({ description: 'Associated employee', type: () => Employee })
    @ManyToOne(() => Employee)
    @JoinColumn({ name: 'employeeId' })
    employee: Employee;

    @ApiProperty({ description: 'Seniority marks of the applicant' })
    @Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
    @IsNumber()
    @Min(0)
    @IsOptional()
    seniorityMarks: number;

    @ApiProperty({ description: 'Education marks of the applicant' })
    @Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
    @IsNumber()
    @Min(0)
    @IsOptional()
    educationMarks: number;

    @ApiProperty({ description: 'Geographical marks of the applicant', nullable: true })
    @Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
    @IsNumber()
    @Min(0)
    @IsOptional()
    geographicalMarks: number | null;
} 