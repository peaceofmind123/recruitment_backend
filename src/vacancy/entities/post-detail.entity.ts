import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

@Entity({ name: 'post_detail' })
export class PostDetail {
    @ApiProperty({ description: 'Primary key' })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ description: 'Level' })
    @IsInt()
    @Column()
    level: number;

    @ApiProperty({ description: 'Service' })
    @IsString()
    @Column()
    service: string;

    @ApiProperty({ description: 'Group' })
    @IsString()
    @Column()
    group: string;

    @ApiProperty({ description: 'Subgroup' })
    @IsString()
    @Column()
    subgroup: string;

    @ApiProperty({ description: 'Position' })
    @IsString()
    @Column()
    position: string;
} 