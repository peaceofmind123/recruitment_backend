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

@Module({
    imports: [
        TypeOrmModule.forFeature([Vacancy, FiscalYear, Applicant, Employee]),
        ApplicantModule
    ],
    controllers: [VacancyController],
    providers: [VacancyService, ApplicantService],
    exports: [TypeOrmModule],
})
export class VacancyModule { } 