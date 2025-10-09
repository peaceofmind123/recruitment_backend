import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from './employee.entity';

@Entity('absent_details')
export class AbsentDetailEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    employeeId: number;

    @Column({ nullable: true })
    fromDateBS: string;

    @Column({ nullable: true })
    toDateBS: string;

    @Column({ nullable: true })
    duration: string;

    @Column({ nullable: true })
    remarks: string;

    @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'employeeId', referencedColumnName: 'employeeId' })
    employee: Employee;
}


