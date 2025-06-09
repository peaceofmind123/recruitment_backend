import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { join } from 'path';
import { mkdir, writeFile, access, constants, rm } from 'fs/promises';
import { Vacancy } from './entities/vacancy.entity';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { FiscalYear } from '../fiscal-year/entities/fiscal-year.entity';
import { ApplicantService } from '../applicant/applicant.service';
import { CreateApplicantDto } from '../applicant/dto/create-applicant.dto';
import * as XLSX from 'xlsx';
import { Applicant } from '../applicant/entities/applicant.entity';
import { Employee } from '../employee/entities/employee.entity';
import { SeniorityMarksDto } from './dto/seniority-marks.dto';
import { In } from 'typeorm';

interface ExcelRow {
    'Employee ID': string | number;
    [key: string]: any;
}

@Injectable()
export class VacancyService {
    constructor(
        @InjectRepository(Vacancy)
        private vacancyRepository: Repository<Vacancy>,
        @InjectRepository(FiscalYear)
        private fiscalYearRepository: Repository<FiscalYear>,
        private applicantService: ApplicantService,
        @InjectRepository(Applicant)
        private applicantRepository: Repository<Applicant>,
        @InjectRepository(Employee)
        private employeeRepository: Repository<Employee>,
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

    async findByFiscalYearAndBigyapanNo(fiscalYear: string, bigyapanNo: string): Promise<Vacancy> {
        const vacancy = await this.vacancyRepository.findOne({
            where: {
                fiscalYearYear: fiscalYear,
                bigyapanNo: bigyapanNo
            },
            relations: ['fiscalYear', 'applicants']
        });

        if (!vacancy) {
            throw new NotFoundException(`Vacancy with fiscal year ${fiscalYear} and bigyapan number ${bigyapanNo} not found`);
        }

        return vacancy;
    }

    async update(oldBigyapanNo: string, updateVacancyDto: UpdateVacancyDto): Promise<Vacancy> {
        const vacancy = await this.vacancyRepository.findOne({
            where: { bigyapanNo: oldBigyapanNo },
            relations: ['fiscalYear']
        });

        if (!vacancy) {
            throw new NotFoundException(`Vacancy with bigyapan number ${oldBigyapanNo} not found`);
        }

        // If trying to update to a new bigyapanNo, check if it already exists
        if (updateVacancyDto.bigyapanNo && updateVacancyDto.bigyapanNo !== oldBigyapanNo) {
            const existingVacancy = await this.vacancyRepository.findOne({
                where: { bigyapanNo: updateVacancyDto.bigyapanNo }
            });

            if (existingVacancy) {
                throw new ConflictException(`Vacancy with bigyapan number ${updateVacancyDto.bigyapanNo} already exists`);
            }
        }

        // Update all fields
        Object.assign(vacancy, updateVacancyDto);

        return this.vacancyRepository.save(vacancy);
    }

    async delete(bigyapanNo: string): Promise<void> {
        const vacancy = await this.vacancyRepository.findOne({
            where: { bigyapanNo },
            relations: ['applicants']
        });

        if (!vacancy) {
            throw new NotFoundException(`Vacancy with bigyapan number ${bigyapanNo} not found`);
        }

        // Delete associated applicant records
        if (vacancy.applicants && vacancy.applicants.length > 0) {
            for (const applicant of vacancy.applicants) {
                await this.applicantService.remove(applicant.employeeId, bigyapanNo);
            }
        }

        // If there's an approved applicant list, try to delete it first
        if (vacancy.approvedApplicantList) {
            const uploadDir = join(process.cwd(), 'src', 'assets', 'approved-applicants', `${bigyapanNo.split("/")[0]}-${bigyapanNo.split("/")[1]}`);
            try {
                await rm(uploadDir, { recursive: true, force: true });
            } catch (error) {
                throw new BadRequestException(`Failed to delete approved applicant list directory for vacancy ${bigyapanNo}: ${error.message}`);
            }
        }

        // Only delete from database if file system cleanup was successful
        await this.vacancyRepository.remove(vacancy);
    }

    async getApplicantListFormat(): Promise<{ filePath: string; fileName: string }> {
        const fileName = 'applicant-list-format.xlsx';
        const filePath = join(process.cwd(), 'src', 'assets', fileName);

        try {
            await access(filePath, constants.F_OK);
        } catch {
            throw new NotFoundException('Applicant list format file not found');
        }

        return { filePath, fileName };
    }

    async uploadApprovedApplicantList(bigyapanNo: string, file: Express.Multer.File): Promise<Vacancy> {
        const vacancy = await this.vacancyRepository.findOne({
            where: { bigyapanNo },
            relations: ['fiscalYear']
        });

        if (!vacancy) {
            throw new NotFoundException(`Vacancy with bigyapan number ${bigyapanNo} not found`);
        }

        if (vacancy.approvedApplicantList) {
            throw new BadRequestException('Approved applicant list already exists for this vacancy');
        }

        // Create directory if it doesn't exist
        const uploadDir = join(process.cwd(), 'src', 'assets', 'approved-applicants', `${bigyapanNo.split("/")[0]}-${bigyapanNo.split("/")[1]}`);
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (error) {
            // Ignore error if directory already exists
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }

        // Save the file
        const filePath = join(uploadDir, 'approved-applicant-list.xlsx');
        await writeFile(filePath, file.buffer);

        // Read the Excel file
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

        // Create applicant records
        for (const row of data) {
            if (row['Employee ID']) {
                const createApplicantDto: CreateApplicantDto = {
                    employeeId: parseInt(row['Employee ID'].toString()),
                    bigyapanNo: bigyapanNo
                };
                await this.applicantService.create(createApplicantDto);
            }
        }

        // Update vacancy with file path
        vacancy.approvedApplicantList = filePath;
        return this.vacancyRepository.save(vacancy);
    }

    async getApprovedApplicantList(bigyapanNo: string): Promise<{ filePath: string; fileName: string }> {
        const vacancy = await this.vacancyRepository.findOne({
            where: { bigyapanNo }
        });

        if (!vacancy) {
            throw new NotFoundException(`Vacancy with bigyapan number ${bigyapanNo} not found`);
        }

        if (!vacancy.approvedApplicantList) {
            throw new NotFoundException(`No approved applicant list found for vacancy ${bigyapanNo}`);
        }

        // Construct the expected file path
        const expectedFilePath = join(process.cwd(), 'src', 'assets', 'approved-applicants', `${bigyapanNo.split("/")[0]}-${bigyapanNo.split("/")[1]}`, 'approved-applicant-list.xlsx');

        try {
            await access(expectedFilePath, constants.F_OK);
        } catch {
            throw new NotFoundException(`Approved applicant list file not found for vacancy ${bigyapanNo}`);
        }

        return {
            filePath: expectedFilePath,
            fileName: `approved-applicant-list-${bigyapanNo.split("/")[0]}-${bigyapanNo.split("/")[1]}.xlsx`
        };
    }

    async calculateSeniorityMarks(bigyapanNo: string, dto: SeniorityMarksDto) {
        // Find all applicants for the vacancy
        const applicants = await this.applicantRepository.find({
            where: { bigyapanNo },
            relations: ['vacancy']
        });

        if (!applicants.length) {
            throw new BadRequestException('No applicants found for this vacancy');
        }

        // Get all employee IDs
        const employeeIds = applicants.map(applicant => applicant.employeeId);

        // Find all employees
        const employees = await this.employeeRepository.find({
            where: { employeeId: In(employeeIds) }
        });

        // Calculate seniority marks for each applicant
        for (const applicant of applicants) {
            const employee = employees.find(emp => emp.employeeId === applicant.employeeId) as Employee;

            // Check if seniority date is later than bigyapan end date
            if (employee.seniorityDate > dto.bigyapanEndDate) {
                throw new BadRequestException(
                    `Employee ${employee.employeeId}'s seniority date (${employee.seniorityDate}) is later than bigyapan end date (${dto.bigyapanEndDate})`
                );
            }

            // Calculate number of days between seniority date and bigyapan end date
            const numDays = Math.floor(
                (dto.bigyapanEndDate.getTime() - employee.seniorityDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Calculate seniority marks (max 30)
            const seniorityMarks = Math.min((numDays / 365) * 3.75, 30);

            // Update applicant's seniority marks
            applicant.seniorityMarks = seniorityMarks;
            await this.applicantRepository.save(applicant);
        }

        return { message: 'Seniority marks calculated and updated successfully' };
    }
} 