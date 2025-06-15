import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { EmployeeDetail } from './employee-detail.entity';

@Entity('assignment_details')
export class AssignmentDetail {
    @PrimaryGeneratedColumn('uuid')
    id: string;

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
    startDateBS: string;

    @Column({ nullable: true })
    endDateBS: string;

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

    @Column({ type: 'int' })
    employeeId: number;

    @ManyToOne(() => EmployeeDetail, employee => employee.assignments)
    @JoinColumn({ name: 'employeeId' })
    employee: EmployeeDetail;
} 