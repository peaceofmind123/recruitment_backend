import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { FiscalYear } from '../../fiscal-year/entities/fiscal-year.entity';

@Entity()
export class Vacancy {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'int', check: 'level >= 1 AND level <= 12' })
    level: number;

    @Column()
    service: string;

    @Column()
    group: string;

    @Column()
    subGroup: string;

    @Column()
    position: string;

    @ManyToOne(() => FiscalYear, fiscalYear => fiscalYear.vacancies)
    @JoinColumn()
    fiscalYear: FiscalYear;
} 