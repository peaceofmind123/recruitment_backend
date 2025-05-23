import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Vacancy } from '../../vacancy/entities/vacancy.entity';

@Entity()
export class FiscalYear {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    year: string;

    @Column({ type: 'date' })
    startedOn: Date;

    @Column({ type: 'date', nullable: true })
    closedOn: Date;

    @OneToMany(() => Vacancy, vacancy => vacancy.fiscalYear)
    vacancies: Vacancy[];
} 