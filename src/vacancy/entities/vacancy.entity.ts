import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, IsUUID, Matches } from 'class-validator';
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
    @IsString()
    @Matches(/^\d{4}\/\d{2}$/, {
        message: 'Year must be in YYYY/YY format (e.g., "2081/82")'
    })
    @ManyToOne(() => FiscalYear, fiscalYear => fiscalYear.vacancies)
    @JoinColumn({ name: 'fiscalYearYear' })
    fiscalYear: FiscalYear;

    @Column()
    fiscalYearYear: string;
} 