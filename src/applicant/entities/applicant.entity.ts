import { Entity, Column, PrimaryColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, Matches } from 'class-validator';

@Entity()
export class Applicant {
    @ApiProperty({ description: 'Employee ID (4 digit number)' })
    @PrimaryColumn()
    @IsInt()
    @Min(1000)
    @Max(9999)
    employeeId: number;

    @ApiProperty({ description: 'Full name of the applicant' })
    @IsString()
    @Column()
    name: string;

    @ApiProperty({ description: 'Level of the position (1-12)' })
    @IsInt()
    @Min(1)
    @Max(12)
    @Column()
    level: number;

    @ApiProperty({ description: 'Position title' })
    @IsString()
    @Column()
    post: string;

    @ApiProperty({ description: 'Group category' })
    @IsString()
    @Column()
    group: string;

    @ApiProperty({ description: 'Sub-group category' })
    @IsString()
    @Column()
    subGroup: string;

    @ApiProperty({ description: 'Service category' })
    @IsString()
    @Column()
    service: string;
} 