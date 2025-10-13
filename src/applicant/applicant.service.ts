import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Applicant } from './entities/applicant.entity';
import { CreateApplicantDto } from './dto/create-applicant.dto';
import { SeniorityDetailsDto } from './dto/seniority-details.dto';
import { ScorecardDto, AssignmentDetailDto } from './dto/scorecard.dto';
import { ApplicantCompleteDetailsDto } from './dto/applicant-complete-details.dto';
import { EmployeeService } from '../employee/employee.service';
import { Employee } from '../employee/entities/employee.entity';
import { Vacancy } from '../vacancy/entities/vacancy.entity';
import { AssignmentDetail } from '../employee/entities/assignment-detail.entity';
import { Office } from '../common/entities/office.entity';
import { District } from '../common/entities/district.entity';
import { CategoryMarks } from '../common/entities/category-marks.entity';

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
        @InjectRepository(Office)
        private officeRepository: Repository<Office>,
        @InjectRepository(District)
        private districtRepository: Repository<District>,
        @InjectRepository(CategoryMarks)
        private categoryMarksRepository: Repository<CategoryMarks>,
        private readonly employeeService: EmployeeService,
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

    async getScorecard(employeeId: number, bigyapanNo: string): Promise<ApplicantCompleteDetailsDto> {
        // Find the applicant with relations
        const applicant = await this.applicantRepository.findOne({
            where: { employeeId, bigyapanNo },
            relations: ['employee', 'vacancy']
        });

        if (!applicant) {
            throw new NotFoundException(`Applicant with employee ID ${employeeId} and bigyapan number ${bigyapanNo} not found`);
        }

        // Reuse employee service to build the base complete-details shape
        const details = await this.employeeService.getEmployeeBasicDetails(employeeId);
        if (!details) {
            throw new NotFoundException('Employee not found');
        }

        const endDateBS = await (async () => {
            // Bigyapan end date is AD; convert to BS string used by employee endpoints
            const { formatBS } = await import('../common/utils/nepali-date.utils');
            return await formatBS(applicant.vacancy.bigyapanEndDate as any);
        })();

        // Compute seniority in BS directly; if end < start, diff util returns zeros (no throw)
        const seniority = await (async () => {
            const { formatBS, diffNepaliYMD } = await import('../common/utils/nepali-date.utils');
            const startBS = await formatBS(applicant.employee.seniorityDate as any);
            const ymd = await diffNepaliYMD(startBS, endDateBS);
            return {
                seniorityDateBS: startBS,
                endDateBS,
                years: ymd.years,
                months: ymd.months,
                days: ymd.days,
            };
        })();

        const [assignments, absents, leaves, rewardsPunishments] = await Promise.all([
            this.employeeService.getEmployeeAssignmentsWithExtras(employeeId, details.level ?? undefined, undefined, endDateBS),
            this.employeeService.getEmployeeAbsents(employeeId),
            this.employeeService.getEmployeeLeaves(employeeId),
            this.employeeService.getEmployeeRewardsPunishments(employeeId),
        ]);

        // Normalize absents/leaves/rewards BS dates and durations like employee endpoint
        const ymdFromDurationDaysBS = (await import('../common/utils/nepali-date.utils')).ymdFromDurationDaysBS;
        const normalizeList = async (items: any[]) => {
            return Promise.all(items.map(async (it: any) => {
                const durationDays = Math.max(0, parseInt(it.duration, 10) || 0);
                const ymd = await ymdFromDurationDaysBS(durationDays);
                return { ...it, years: ymd.years, months: ymd.months, days: ymd.days, totalNumDays: durationDays };
            }));
        };

        const normAbsents = await normalizeList(absents as any[]);
        const normLeaves = await normalizeList(leaves as any[]);
        const normRps = await normalizeList(rewardsPunishments as any[]);

        const response: ApplicantCompleteDetailsDto = {
            employeeId: details.employeeId,
            name: details.name,
            level: details.level,
            workingOffice: details.workingOffice,
            position: details.position,
            dob: details.dob,
            group: details.group,
            seniorityDateBS: seniority.seniorityDateBS,
            endDateBS: seniority.endDateBS,
            years: seniority.years,
            months: seniority.months,
            days: seniority.days,
            assignments: assignments as any,
            absents: normAbsents as any,
            leaves: normLeaves as any,
            rewardsPunishments: normRps as any,
            // Extras from vacancy
            service: applicant.vacancy.service,
            subgroup: applicant.vacancy.subGroup,
            appliedPosition: applicant.vacancy.position,
            bigyapanEndDateBS: endDateBS,
        };

        return response;
    }
} 