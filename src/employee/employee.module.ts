import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './entities/employee.entity';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { Qualification } from '../vacancy/entities/qualification.entity';
import { EmployeeDetail } from './entities/employee-detail.entity';
import { AssignmentDetail } from './entities/assignment-detail.entity';
import { CommonModule } from '../common/common.module';

@Module({
    imports: [TypeOrmModule.forFeature([Employee, Qualification, EmployeeDetail, AssignmentDetail]), CommonModule],
    controllers: [EmployeeController],
    providers: [EmployeeService],
    exports: [TypeOrmModule],
})
export class EmployeeModule { } 