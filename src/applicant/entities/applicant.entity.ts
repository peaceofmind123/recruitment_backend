import { Entity, Column, PrimaryColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';

@Entity()
export class Applicant {
    @ApiProperty({ description: 'Employee ID (4 digit number)' })
    @PrimaryColumn()
    @IsInt()
    @Min(1000)
    @Max(9999)
    employeeId: number;

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