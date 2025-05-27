import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vacancy } from './entities/vacancy.entity';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { FiscalYear } from '../fiscal-year/entities/fiscal-year.entity';

@Injectable()
export class VacancyService {
    constructor(
        @InjectRepository(Vacancy)
        private vacancyRepository: Repository<Vacancy>,
        @InjectRepository(FiscalYear)
        private fiscalYearRepository: Repository<FiscalYear>,
    ) { }

    async create(createVacancyDto: CreateVacancyDto): Promise<Vacancy> {
        const fiscalYear = await this.fiscalYearRepository.findOne({
            where: { year: createVacancyDto.fiscalYearYear }
        });

        if (!fiscalYear) {
            throw new NotFoundException(`Fiscal year ${createVacancyDto.fiscalYearYear} not found`);
        }

        const vacancy = this.vacancyRepository.create({
            ...createVacancyDto,
            fiscalYear
        });

        return this.vacancyRepository.save(vacancy);
    }

    async findByFiscalYear(fiscalYearYear: string): Promise<Vacancy[]> {
        const fiscalYear = await this.fiscalYearRepository.findOne({
            where: { year: fiscalYearYear }
        });

        if (!fiscalYear) {
            throw new NotFoundException(`Fiscal year ${fiscalYearYear} not found`);
        }

        return this.vacancyRepository.find({
            where: { fiscalYearYear },
            relations: ['fiscalYear']
        });
    }
} 