import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from './employee.entity';

@Entity('reward_punishment_details')
export class RewardPunishmentDetailEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    employeeId: number;

    @Column({ nullable: true })
    rpType: string;

    @Column({ nullable: true })
    fromDateBS: string;

    @Column({ nullable: true })
    toDateBS: string;

    @Column({ nullable: true })
    rpName: string;

    @Column({ nullable: true })
    reason: string;

    @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'employeeId', referencedColumnName: 'employeeId' })
    employee: Employee;
}


