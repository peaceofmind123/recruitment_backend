import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicantService } from './applicant.service';
import { ApplicantController } from './applicant.controller';
import { Applicant } from './entities/applicant.entity';
import { EmployeeModule } from '../employee/employee.module';
import { VacancyModule } from '../vacancy/vacancy.module';
import { CommonModule } from '../common/common.module';
import { Office } from '../common/entities/office.entity';
import { District } from '../common/entities/district.entity';
import { CategoryMarks } from '../common/entities/category-marks.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Applicant, Office, District, CategoryMarks]),
        EmployeeModule,
        CommonModule,
        forwardRef(() => VacancyModule)
    ],
    controllers: [ApplicantController],
    providers: [ApplicantService],
    exports: [ApplicantService],
})
export class ApplicantModule { } 