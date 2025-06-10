import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vacancy } from './entities/vacancy.entity';
import { VacancyController } from './vacancy.controller';
import { VacancyService } from './vacancy.service';
import { FiscalYear } from '../fiscal-year/entities/fiscal-year.entity';
import { ApplicantModule } from '../applicant/applicant.module';
import { ApplicantService } from '../applicant/applicant.service';
import { Applicant } from '../applicant/entities/applicant.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Qualification } from './entities/qualification.entity';
import { QualificationController } from './qualification.controller';
import { QualificationService } from './qualification.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Vacancy, FiscalYear, Applicant, Employee, Qualification]),
        ApplicantModule
    ],
    controllers: [VacancyController, QualificationController],
    providers: [VacancyService, ApplicantService, QualificationService],
    exports: [TypeOrmModule],
})
export class VacancyModule { } 