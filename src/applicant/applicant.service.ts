import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Applicant } from './entities/applicant.entity';
import { CreateApplicantDto } from './dto/create-applicant.dto';
import { SeniorityDetailsDto } from './dto/seniority-details.dto';
import { ScorecardDto, AssignmentDetailDto } from './dto/scorecard.dto';
import { Employee } from '../employee/entities/employee.entity';
import { Vacancy } from '../vacancy/entities/vacancy.entity';
import { AssignmentDetail } from '../employee/entities/assignment-detail.entity';

@Injectable()
export class ApplicantService {
    constructor(
        @InjectRepository(Applicant)
        private applicantRepository: Repository<Applicant>,
        @InjectRepository(Employee)
        private employeeRepository: Repository<Employee>,
        @InjectRepository(Vacancy)
        private vacancyRepository: Repository<Vacancy>,
        @InjectRepository(AssignmentDetail)
        private assignmentDetailRepository: Repository<AssignmentDetail>,
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

    async getSeniorityDetails(employeeId: number, bigyapanNo: string): Promise<SeniorityDetailsDto> {
        // Find the applicant with relations
        const applicant = await this.applicantRepository.findOne({
            where: { employeeId, bigyapanNo },
            relations: ['employee', 'vacancy']
        });

        if (!applicant) {
            throw new NotFoundException(`Applicant with employee ID ${employeeId} and bigyapan number ${bigyapanNo} not found`);
        }

        // Find the current position from assignment details
        const currentAssignment = await this.assignmentDetailRepository.findOne({
            where: { employeeId },
            order: { startDate: 'DESC' }
        });

        // Calculate time elapsed between seniority date and bigyapan end date
        const seniorityDate = new Date(applicant.employee.seniorityDate);
        const bigyapanEndDate = applicant.vacancy.bigyapanEndDate;

        if (!bigyapanEndDate) {
            throw new NotFoundException(`Bigyapan end date not found for vacancy ${bigyapanNo}`);
        }

        const endDate = new Date(bigyapanEndDate);
        const timeDiff = endDate.getTime() - seniorityDate.getTime();

        // Calculate years, months, and days
        const yearsElapsed = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 365.25));
        const remainingDays = timeDiff % (1000 * 60 * 60 * 24 * 365.25);
        const monthsElapsed = Math.floor(remainingDays / (1000 * 60 * 60 * 24 * 30.44));
        const daysElapsed = Math.floor((remainingDays % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));

        // Calculate marks
        const yearMarks = yearsElapsed * 3.75;
        const monthMarks = monthsElapsed * (3.75 / 12);
        const daysMarks = daysElapsed * (3.75 / 365);

        const seniorityDetails: SeniorityDetailsDto = {
            employeeId: applicant.employeeId,
            name: applicant.employee.name,
            level: applicant.employee.level,
            currentPosition: applicant.employee.position || currentAssignment?.position || 'Not assigned',
            workingOffice: applicant.employee.workingOffice,
            service: applicant.vacancy.service,
            group: applicant.vacancy.group,
            subgroup: applicant.vacancy.subGroup,
            dob: applicant.employee.dob,
            appliedPosition: applicant.vacancy.position,
            seniorityDate: applicant.employee.seniorityDate,
            bigyapanEndDate: endDate,
            yearsElapsed,
            monthsElapsed,
            daysElapsed,
            seniorityMarks: applicant.seniorityMarks || 0,
            yearMarks,
            monthMarks,
            daysMarks
        };

        return seniorityDetails;
    }

    async getScorecard(employeeId: number, bigyapanNo: string): Promise<ScorecardDto> {
        // Find the applicant with relations
        const applicant = await this.applicantRepository.findOne({
            where: { employeeId, bigyapanNo },
            relations: ['employee', 'vacancy']
        });

        if (!applicant) {
            throw new NotFoundException(`Applicant with employee ID ${employeeId} and bigyapan number ${bigyapanNo} not found`);
        }

        // Find all assignment details for the employee
        const assignments = await this.assignmentDetailRepository.find({
            where: { employeeId },
            order: { startDate: 'ASC' }
        });

        // Calculate time elapsed between seniority date and bigyapan end date
        const seniorityDate = new Date(applicant.employee.seniorityDate);
        const bigyapanEndDate = applicant.vacancy.bigyapanEndDate;

        if (!bigyapanEndDate) {
            throw new NotFoundException(`Bigyapan end date not found for vacancy ${bigyapanNo}`);
        }

        const endDate = new Date(bigyapanEndDate);
        const timeDiff = endDate.getTime() - seniorityDate.getTime();

        // Calculate years, months, and days
        const yearsElapsed = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 365.25));
        const remainingDays = timeDiff % (1000 * 60 * 60 * 24 * 365.25);
        const monthsElapsed = Math.floor(remainingDays / (1000 * 60 * 60 * 24 * 30.44));
        const daysElapsed = Math.floor((remainingDays % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));

        // Calculate marks
        const yearMarks = yearsElapsed * 3.75;
        const monthMarks = monthsElapsed * (3.75 / 12);
        const daysMarks = daysElapsed * (3.75 / 365);

        // Process assignment details with calculated time periods
        const assignmentDetails: AssignmentDetailDto[] = assignments.map(assignment => {
            const totalDays = assignment.totalNumDays || 0;
            const years = Math.floor(totalDays / 365.25);
            const remainingDaysAfterYears = totalDays % 365.25;
            const months = Math.floor(remainingDaysAfterYears / 30.44);
            const days = Math.floor(remainingDaysAfterYears % 30.44);

            return {
                employeeId: assignment.employeeId,
                startDateBS: assignment.startDateBS,
                endDateBS: assignment.endDateBS,
                position: assignment.position,
                jobs: assignment.jobs,
                function: assignment.function,
                empCategory: assignment.empCategory,
                empType: assignment.empType,
                workOffice: assignment.workOffice,
                seniorityDateBS: assignment.seniorityDateBS,
                level: assignment.level,
                permLevelDateBS: assignment.permLevelDateBS,
                reasonForPosition: assignment.reasonForPosition,
                startDate: assignment.startDate,
                seniorityDate: assignment.seniorityDate,
                totalGeographicalMarks: assignment.totalGeographicalMarks,
                numDaysOld: assignment.numDaysOld,
                numDaysNew: assignment.numDaysNew,
                totalNumDays: assignment.totalNumDays,
                numYears: years,
                numMonths: months,
                numDays: days
            };
        });

        const scorecard: ScorecardDto = {
            employeeId: applicant.employeeId,
            name: applicant.employee.name,
            level: applicant.employee.level,
            currentPosition: applicant.employee.position || 'Not assigned',
            workingOffice: applicant.employee.workingOffice,
            service: applicant.vacancy.service,
            group: applicant.vacancy.group,
            subgroup: applicant.vacancy.subGroup,
            dob: applicant.employee.dob,
            appliedPosition: applicant.vacancy.position,
            seniorityDate: applicant.employee.seniorityDate,
            bigyapanEndDate: endDate,
            yearsElapsed,
            monthsElapsed,
            daysElapsed,
            seniorityMarks: applicant.seniorityMarks || 0,
            yearMarks,
            monthMarks,
            daysMarks,
            sex: applicant.employee.sex,
            assignments: assignmentDetails
        };

        return scorecard;
    }
} 