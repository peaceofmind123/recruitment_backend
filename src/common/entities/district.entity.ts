import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('districts')
export class District {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @Column({ nullable: false })
    category: string;
} 