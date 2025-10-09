import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './entities/employee.entity';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { Qualification } from '../vacancy/entities/qualification.entity';
import { EmployeeDetail } from './entities/employee-detail.entity';
import { AssignmentDetail } from './entities/assignment-detail.entity';
import { CommonModule } from '../common/common.module';
import { AbsentDetailEntity } from './entities/absent-detail.entity';
import { LeaveDetailEntity } from './entities/leave-detail.entity';
import { RewardPunishmentDetailEntity } from './entities/reward-punishment-detail.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Employee, Qualification, EmployeeDetail, AssignmentDetail, AbsentDetailEntity, LeaveDetailEntity, RewardPunishmentDetailEntity]), CommonModule],
    controllers: [EmployeeController],
    providers: [EmployeeService],
    exports: [TypeOrmModule],
})
export class EmployeeModule { } 