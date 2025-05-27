import { Injectable, ConflictException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull, Not } from 'typeorm';
import { FiscalYear } from './entities/fiscal-year.entity';
import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';
import { GetFiscalYearsDto, FiscalYearSortBy, SortOrder } from './dto/get-fiscal-years.dto';
import { BusinessException } from '../common/exceptions/business.exception';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class FiscalYearService {
    constructor(
        @InjectRepository(FiscalYear)
        private fiscalYearRepository: Repository<FiscalYear>,
    ) { }

    async create(createFiscalYearDto: CreateFiscalYearDto): Promise<FiscalYear> {
        // Check if fiscal year already exists
        const existingFiscalYear = await this.fiscalYearRepository.findOne({
            where: { year: createFiscalYearDto.year }
        });

        if (existingFiscalYear) {
            throw new BusinessException(
                `Fiscal year ${createFiscalYearDto.year} already exists`,
                HttpStatus.CONFLICT,
            );
        }

        // Create new fiscal year
        const fiscalYear = this.fiscalYearRepository.create(createFiscalYearDto);
        return await this.fiscalYearRepository.save(fiscalYear);
    }

    async findAll(query: GetFiscalYearsDto): Promise<PaginatedResponseDto<FiscalYear>> {
        const { page = 1, limit = 10, year, status, sortBy = FiscalYearSortBy.YEAR, sortOrder = SortOrder.DESC } = query;

        // Build where clause
        const where: any = {};
        if (year) {
            where.year = Like(`%${year}%`);
        }
        if (status === 'open') {
            where.closedOn = IsNull();
        } else if (status === 'closed') {
            where.closedOn = Not(IsNull());
        }

        // Execute query with pagination and relations
        const [items, total] = await this.fiscalYearRepository.findAndCount({
            where,
            relations: {
                vacancies: true
            },
            order: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
        });

        return new PaginatedResponseDto(items, total, page, limit);
    }
} 