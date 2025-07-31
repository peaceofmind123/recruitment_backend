import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vacancy } from './entities/vacancy.entity';
import { VacancyController } from './vacancy.controller';
import { VacancyService } from './vacancy.service';
import { FiscalYear } from '../fiscal-year/entities/fiscal-year.entity';
import { ApplicantModule } from '../applicant/applicant.module';
import { ApplicantService } from '../applicant/applicant.service';
import { Applicant } from '../applicant/entities/applicant.entity';
import { Employee } from '../employee/entities/employee.entity';
import { EmployeeModule } from '../employee/employee.module';
import { Qualification } from './entities/qualification.entity';
import { QualificationController } from './qualification.controller';
import { QualificationService } from './qualification.service';
import { PostDetail } from './entities/post-detail.entity';
import { PostDetailService } from './post-detail.service';
import { PostDetailController } from './post-detail.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([Vacancy, FiscalYear, Applicant, Employee, Qualification, PostDetail]),
        forwardRef(() => ApplicantModule),
        EmployeeModule
    ],
    controllers: [VacancyController, QualificationController, PostDetailController],
    providers: [VacancyService, ApplicantService, QualificationService, PostDetailService],
    exports: [TypeOrmModule],
})
export class VacancyModule { } 