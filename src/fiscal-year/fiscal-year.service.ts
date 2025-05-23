import { Injectable, ConflictException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalYear } from './entities/fiscal-year.entity';
import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';
import { BusinessException } from '../common/exceptions/business.exception';

@Injectable()
export class FiscalYearService {
    constructor(
        @InjectRepository(FiscalYear)
        private fiscalYearRepository: Repository<FiscalYear>,
    ) { }

    async create(createFiscalYearDto: CreateFiscalYearDto): Promise<FiscalYear> {
        try {
            const fiscalYear = this.fiscalYearRepository.create(createFiscalYearDto);
            return await this.fiscalYearRepository.save(fiscalYear);
        } catch (error) {
            if (error.message?.includes('duplicate key value violates unique constraint')) {
                throw new BusinessException(
                    `Fiscal year ${createFiscalYearDto.year} already exists`,
                    HttpStatus.CONFLICT,
                );
            }
            throw error; // Let the global filter handle other errors
        }
    }
} 