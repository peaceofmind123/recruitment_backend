import { Entity, PrimaryColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

@Entity()
export class Qualification {
    @ApiProperty({ description: 'Qualification name/level' })
    @PrimaryColumn()
    @IsString()
    qualification: string;
} 