import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { FiscalYear } from './entities/fiscal-year.entity';
import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';

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
            if (error instanceof QueryFailedError) {
                // Check if it's a unique constraint violation
                if (error.message.includes('duplicate key value violates unique constraint')) {
                    throw new ConflictException(`Fiscal year ${createFiscalYearDto.year} already exists`);
                }
            }
            throw new InternalServerErrorException('Failed to create fiscal year');
        }
    }
} 