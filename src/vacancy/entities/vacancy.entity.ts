import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, IsUUID } from 'class-validator';
import { FiscalYear } from '../../fiscal-year/entities/fiscal-year.entity';

@Entity()
export class Vacancy {
    @ApiProperty({ description: 'Unique identifier' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ description: 'Level of the position (1-12)' })
    @IsInt()
    @Min(1)
    @Max(12)
    @Column()
    level: number;

    @ApiProperty({ description: 'Service department' })
    @IsString()
    @Column()
    service: string;

    @ApiProperty({ description: 'Group category' })
    @IsString()
    @Column()
    group: string;

    @ApiProperty({ description: 'Sub-group category' })
    @IsString()
    @Column()
    subGroup: string;

    @ApiProperty({ description: 'Position title' })
    @IsString()
    @Column()
    position: string;

    @ApiProperty({ description: 'Associated fiscal year', type: () => FiscalYear })
    @IsUUID()
    @ManyToOne(() => FiscalYear, fiscalYear => fiscalYear.vacancies)
    @JoinColumn()
    fiscalYear: FiscalYear;
} 