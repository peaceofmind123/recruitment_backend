import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, Matches, IsOptional } from 'class-validator';
import { FiscalYear } from '../../fiscal-year/entities/fiscal-year.entity';
import { Applicant } from '../../applicant/entities/applicant.entity';
import { Qualification } from './qualification.entity';

@Entity()
export class Vacancy {
    @ApiProperty({ description: 'Bigyapan number (unique identifier)' })
    @PrimaryColumn()
    @IsString()
    bigyapanNo: string;

    @ApiProperty({ description: 'Associated applicants', type: () => [Applicant] })
    @OneToMany(() => Applicant, applicant => applicant.vacancy)
    applicants: Applicant[];

    @ApiProperty({ description: 'Number of positions available' })
    @IsInt()
    @Min(1)
    @Column()
    numPositions: number;

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

    @ApiProperty({ description: 'Path to the approved applicant list file', required: false })
    @IsString()
    @IsOptional()
    @Column({ nullable: true })
    approvedApplicantList: string;

    @ApiProperty({ description: 'Minimum required qualifications', type: () => [Qualification], required: false })
    @IsOptional()
    @ManyToMany(() => Qualification)
    @JoinTable({
        name: 'vacancy_min_qualifications',
        joinColumn: { name: 'vacancy_bigyapan_no', referencedColumnName: 'bigyapanNo' },
        inverseJoinColumn: { name: 'qualification_qualification', referencedColumnName: 'qualification' }
    })
    minQualifications: Qualification[];

    @ApiProperty({ description: 'Additional qualifications', type: () => [Qualification], required: false })
    @IsOptional()
    @ManyToMany(() => Qualification)
    @JoinTable({
        name: 'vacancy_additional_qualifications',
        joinColumn: { name: 'vacancy_bigyapan_no', referencedColumnName: 'bigyapanNo' },
        inverseJoinColumn: { name: 'qualification_qualification', referencedColumnName: 'qualification' }
    })
    additionalQualifications: Qualification[];

    @ApiProperty({ description: 'Bigyapan end date', required: false })
    @IsOptional()
    @Column({ type: 'date', nullable: true })
    bigyapanEndDate: Date;

    @ApiProperty({ description: 'Bigyapan end date (BS)', required: false, readOnly: true })
    @IsOptional()
    bigyapanEndDateBS?: string;
} 