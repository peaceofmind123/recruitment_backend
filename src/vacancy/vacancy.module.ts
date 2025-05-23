import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vacancy } from './entities/vacancy.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Vacancy])],
    exports: [TypeOrmModule],
})
export class VacancyModule { } 