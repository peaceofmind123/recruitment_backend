import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicantService } from './applicant.service';
import { ApplicantController } from './applicant.controller';
import { Applicant } from './entities/applicant.entity';
import { EmployeeModule } from '../employee/employee.module';
import { VacancyModule } from '../vacancy/vacancy.module';

@Module({
    imports: [TypeOrmModule.forFeature([Applicant]), EmployeeModule, forwardRef(() => VacancyModule)],
    controllers: [ApplicantController],
    providers: [ApplicantService],
    exports: [ApplicantService],
})
export class ApplicantModule { } 