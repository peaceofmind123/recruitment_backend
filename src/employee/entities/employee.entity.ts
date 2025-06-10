import { Entity, Column, PrimaryColumn, ManyToMany, JoinTable } from 'typeorm';
import { Qualification } from '../../vacancy/entities/qualification.entity';

export enum Sex {
    M = 'M',
    F = 'F',
    U = 'Unspecified'
}

@Entity('employees')
export class Employee {
    @PrimaryColumn({ type: 'int', width: 4 })
    employeeId: number;

    @Column({ type: 'date' })
    dob: Date;

    @Column({ type: 'date' })
    seniorityDate: Date;

    @Column()
    name: string;

    @Column({ type: 'int', width: 2 })
    level: number;

    @Column({
        type: 'enum',
        enum: Sex,
    })
    sex: Sex;

    @Column()
    education: string;

    @Column()
    workingOffice: string;

    @ManyToMany(() => Qualification)
    @JoinTable({
        name: 'employee_qualifications',
        joinColumn: { name: 'employee_id', referencedColumnName: 'employeeId' },
        inverseJoinColumn: { name: 'qualification_qualification', referencedColumnName: 'qualification' }
    })
    qualifications: Qualification[];
} 