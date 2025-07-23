import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from './employee.entity';

@Entity('assignment_details')
export class AssignmentDetail {
    @PrimaryColumn({ type: 'int' })
    employeeId: number;

    @PrimaryColumn()
    startDateBS: string;

    @Column({ nullable: true })
    endDateBS: string;

    @Column()
    position: string;

    @Column()
    jobs: string;

    @Column()
    function: string;

    @Column()
    empCategory: string;

    @Column()
    empType: string;

    @Column()
    workOffice: string;

    @Column({ nullable: true })
    seniorityDateBS: string;

    @Column({ type: 'int', width: 2 })
    level: number;

    @Column({ nullable: true })
    permLevelDateBS: string;

    @Column({ nullable: true })
    reasonForPosition: string;

    @Column({ type: 'date', nullable: true })
    startDate: Date;

    @Column({ type: 'date', nullable: true })
    seniorityDate: Date;

    @ManyToOne(() => Employee, employee => employee.assignments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'employeeId', referencedColumnName: 'employeeId' })
    employee: Employee;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    totalGeographicalMarks: number;

    @Column({ type: 'int', nullable: true })
    numDaysOld: number;

    @Column({ type: 'int', nullable: true })
    numDaysNew: number;

    @Column({ type: 'int', nullable: true })
    totalNumDays: number;
} 