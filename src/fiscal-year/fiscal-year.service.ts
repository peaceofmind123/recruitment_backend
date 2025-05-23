import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalYear } from './entities/fiscal-year.entity';
import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';

@Injectable()
export class FiscalYearService {
    constructor(
        @InjectRepository(FiscalYear)
        private fiscalYearRepository: Repository<FiscalYear>,
    ) { }

    async create(createFiscalYearDto: CreateFiscalYearDto): Promise<FiscalYear> {
        const fiscalYear = this.fiscalYearRepository.create(createFiscalYearDto);
        return await this.fiscalYearRepository.save(fiscalYear);
    }
} 