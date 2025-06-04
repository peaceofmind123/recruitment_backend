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
        return await this.applicantRepository.save(applicant);
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