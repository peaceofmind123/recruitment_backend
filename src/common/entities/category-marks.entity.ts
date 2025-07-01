import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('category_marks')
export class CategoryMarks {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    category: string;

    @Column('float', { nullable: false })
    marks: number;

    @Column({ nullable: false }) // 'old' or 'new'
    type: string;

    @Column({ nullable: true, type: 'varchar' }) // 'male', 'female', or null for new
    gender: string | null;
} 