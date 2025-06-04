import { Entity, Column, PrimaryColumn } from 'typeorm';

export enum Sex {
    M = 'M',
    F = 'F',
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
} 