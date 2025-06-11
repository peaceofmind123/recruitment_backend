import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Applicant } from './entities/applicant.entity';
import { CreateApplicantDto } from './dto/create-applicant.dto';

@Injectable()
export class ApplicantService {
    constructor(
        @InjectRepository(Applicant)
        private applicantRepository: Repository<Applicant>,
    ) { }

    async create(createApplicantDto: CreateApplicantDto): Promise<Applicant> {
        const applicant = this.applicantRepository.create(createApplicantDto);
        const savedApplicant = await this.applicantRepository.save(applicant);

        // Load the applicant with employee relations
        const loadedApplicant = await this.applicantRepository.findOne({
            where: { employeeId: savedApplicant.employeeId, bigyapanNo: savedApplicant.bigyapanNo },
            relations: ['employee', 'employee.qualifications']
        });

        if (!loadedApplicant) {
            throw new NotFoundException(`Failed to load created applicant with employee ID ${savedApplicant.employeeId} and bigyapan number ${savedApplicant.bigyapanNo}`);
        }

        return loadedApplicant;
    }

    async findAll(): Promise<Applicant[]> {
        return await this.applicantRepository.find();
    }

    async findOne(employeeId: number, bigyapanNo: string): Promise<Applicant> {
        const applicant = await this.applicantRepository.findOne({
            where: { employeeId, bigyapanNo }
        });
        if (!applicant) {
            throw new NotFoundException(`Applicant with employee ID ${employeeId} and bigyapan number ${bigyapanNo} not found`);
        }
        return applicant;
    }

    async remove(employeeId: number, bigyapanNo: string): Promise<void> {
        const result = await this.applicantRepository.delete({ employeeId, bigyapanNo });
        if (result.affected === 0) {
            throw new NotFoundException(`Applicant with employee ID ${employeeId} and bigyapan number ${bigyapanNo} not found`);
        }
    }
} 