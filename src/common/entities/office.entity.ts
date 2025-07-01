import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('offices')
export class Office {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @Column({ nullable: false })
    district: string;
} 