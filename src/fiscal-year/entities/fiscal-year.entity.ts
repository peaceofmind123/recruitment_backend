import { Entity, Column, PrimaryGeneratedColumn, OneToMany, Unique } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDate, IsOptional, Matches } from 'class-validator';
import { Vacancy } from '../../vacancy/entities/vacancy.entity';

@Entity()
@Unique(['year'])
export class FiscalYear {
    @ApiProperty({ description: 'Unique identifier' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ description: 'Fiscal year (e.g., "2081/82")' })
    @IsString()
    @Matches(/^\d{4}\/\d{2}$/, {
        message: 'Year must be in YYYY/YY format (e.g., "2081/82")'
    })
    @Column({ unique: true })
    year: string;

    @ApiProperty({ description: 'Start date of the fiscal year' })
    @IsDate()
    @Column({ type: 'date' })
    startedOn: Date;

    @ApiProperty({ description: 'End date of the fiscal year', required: false })
    @IsOptional()
    @IsDate()
    @Column({ type: 'date', nullable: true })
    closedOn: Date;

    @ApiProperty({ description: 'List of vacancies in this fiscal year', type: () => [Vacancy] })
    @OneToMany(() => Vacancy, vacancy => vacancy.fiscalYear)
    vacancies: Vacancy[];
} 