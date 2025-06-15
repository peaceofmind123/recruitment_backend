import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { AssignmentDetail } from './assignment-detail.entity';

@Entity('employee_details')
export class EmployeeDetail {
    @PrimaryColumn({ type: 'int' })
    employeeId: number;

    @Column()
    name: string;

    @Column()
    dob: string;

    @Column()
    dor: string;

    @Column()
    joinDate: string;

    @Column()
    permDate: string;

    @OneToMany(() => AssignmentDetail, assignment => assignment.employee)
    assignments: AssignmentDetail[];
} 