import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Vacancy } from '../../vacancy/entities/vacancy.entity';

@Entity()
export class FiscalYear {
    @ApiProperty({ description: 'Unique identifier' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ description: 'Fiscal year (e.g., "2024")' })
    @Column()
    year: string;

    @ApiProperty({ description: 'Start date of the fiscal year' })
    @Column({ type: 'date' })
    startedOn: Date;

    @ApiProperty({ description: 'End date of the fiscal year', required: false })
    @Column({ type: 'date', nullable: true })
    closedOn: Date;

    @ApiProperty({ description: 'List of vacancies in this fiscal year', type: () => [Vacancy] })
    @OneToMany(() => Vacancy, vacancy => vacancy.fiscalYear)
    vacancies: Vacancy[];
} 