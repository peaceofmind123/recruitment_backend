import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vacancy } from './entities/vacancy.entity';
import { VacancyController } from './vacancy.controller';
import { VacancyService } from './vacancy.service';
import { FiscalYear } from '../fiscal-year/entities/fiscal-year.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Vacancy, FiscalYear])],
    controllers: [VacancyController],
    providers: [VacancyService],
    exports: [TypeOrmModule],
})
export class VacancyModule { } 