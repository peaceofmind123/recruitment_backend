import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { FiscalYear } from '../../fiscal-year/entities/fiscal-year.entity';

@Entity()
export class Vacancy {
    @ApiProperty({ description: 'Unique identifier' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ description: 'Level of the position (1-12)' })
    @Column()
    level: number;

    @ApiProperty({ description: 'Service department' })
    @Column()
    service: string;

    @ApiProperty({ description: 'Group category' })
    @Column()
    group: string;

    @ApiProperty({ description: 'Sub-group category' })
    @Column()
    subGroup: string;

    @ApiProperty({ description: 'Position title' })
    @Column()
    position: string;

    @ApiProperty({ description: 'Associated fiscal year', type: () => FiscalYear })
    @ManyToOne(() => FiscalYear, fiscalYear => fiscalYear.vacancies)
    @JoinColumn()
    fiscalYear: FiscalYear;
} 