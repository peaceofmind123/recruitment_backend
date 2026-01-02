import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, Sex } from './entities/employee.entity';
import { Qualification } from '../vacancy/entities/qualification.entity';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { FilterByEmployeeIdDto } from './dto/filter-by-employee-id.dto';
import { In, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import { EmployeeDetailDto } from './dto/employee-detail.dto';
import { AssignmentDetailDto } from './dto/assignment-detail.dto';
import * as crypto from 'crypto';
import { Office } from '../common/entities/office.entity';
import { District } from '../common/entities/district.entity';
import { CategoryMarks } from '../common/entities/category-marks.entity';
import { AssignmentDetail } from './entities/assignment-detail.entity';
import { AbsentDetailEntity } from './entities/absent-detail.entity';
import { LeaveDetailEntity } from './entities/leave-detail.entity';
import { RewardPunishmentDetailEntity } from './entities/reward-punishment-detail.entity';
import { EmployeeServiceDetailResponseDto } from './dto/employee-detail-response.dto';
import { EmployeeBasicDetailsDto } from './dto/employee-basic-details.dto';
import { EmployeeSeniorityDataDto } from './dto/employee-seniority-data.dto';
import { diffNepaliYMD, diffNepaliYMDWithTotalDays, formatBS } from '../common/utils/nepali-date.utils';
const NepaliDate = require('nepali-datetime');

interface ExcelRow {
    'EmpNo': number;
    'Full Name': string;
    'Date Of Birth': string;
    'Seniority Date': string;
    'Level No': number;
    'Level'?: number | string;
    'Sex': Sex;
    'Qualification': string;
    'Work Office': string;
    'Jobs'?: string;
    'Job'?: string;
    'Position'?: string;
    'Current Position'?: string;
    [key: string]: any; // Allow for additional columns
}

@Injectable()
export class EmployeeService {
    // Removed logFile property

    constructor(
        @InjectRepository(Employee)
        private employeeRepository: Repository<Employee>,
        @InjectRepository(Qualification)
        private qualificationRepository: Repository<Qualification>,
        @InjectRepository(Office)
        private officeRepository: Repository<Office>,
        @InjectRepository(District)
        private districtRepository: Repository<District>,
        @InjectRepository(CategoryMarks)
        private categoryMarksRepository: Repository<CategoryMarks>,
        @InjectRepository(AssignmentDetail)
        private assignmentDetailRepository: Repository<AssignmentDetail>,
        @InjectRepository(AbsentDetailEntity)
        private absentDetailRepository: Repository<AbsentDetailEntity>,
        @InjectRepository(LeaveDetailEntity)
        private leaveDetailRepository: Repository<LeaveDetailEntity>,
        @InjectRepository(RewardPunishmentDetailEntity)
        private rewardPunishmentDetailRepository: Repository<RewardPunishmentDetailEntity>,
    ) {
        // Removed log file setup
    }

    // Removed writeLog method

    private parseDate(dateStr: string): Date | undefined {
        if (!dateStr) return undefined;

        // Try parsing as Excel serial (AD) with the 1900 leap-year correction
        const excelDate = Number(dateStr);
        if (!isNaN(excelDate)) {
            const excelNum = excelDate;
            let adjustedDays = excelNum - 1; // Excel day 1 is 1900-01-01
            if (excelNum > 59) {
                // Excel incorrectly counts 1900-02-29; subtract one more day for dates after that
                adjustedDays -= 1;
            }
            const excelEpoch = new Date(1900, 0, 1);
            return new Date(excelEpoch.getTime() + adjustedDays * 24 * 60 * 60 * 1000);
        }

        // Try parsing as regular date string (AD)
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            return date;
        }

        return undefined;
    }

    private async extractAndSaveQualifications(qualificationStr: string): Promise<Qualification[]> {
        if (!qualificationStr) return [];

        const savedQualifications: Qualification[] = [];
        const uniqueQualifications = new Set<string>();

        // Split by '|' to get different qualification parts
        const parts = qualificationStr.split('|').map(part => part.trim());

        for (const part of parts) {
            // Split by '-' and take the first subpart
            const subparts = part.split('-').map(subpart => subpart.trim());
            if (subparts.length > 0) {
                const qualification = subparts[0];

                // Skip if we've already processed this qualification
                if (uniqueQualifications.has(qualification)) {
                    continue;
                }
                uniqueQualifications.add(qualification);

                try {
                    // Check if qualification already exists
                    let existingQualification = await this.qualificationRepository.findOne({
                        where: { qualification }
                    });

                    if (!existingQualification) {
                        // Create new qualification if it doesn't exist
                        existingQualification = this.qualificationRepository.create({
                            qualification
                        });
                        await this.qualificationRepository.save(existingQualification);
                    }

                    savedQualifications.push(existingQualification);
                } catch (error) {
                    // If we hit a unique constraint violation, just skip this qualification
                    console.warn(`Skipping duplicate qualification: ${qualification}`);
                    continue;
                }
            }
        }

        return savedQualifications;
    }

    async uploadServiceDetail(file: Express.Multer.File): Promise<void> {
        if (!file || !file.buffer) {
            throw new Error('No file uploaded or file is empty');
        }

        // Ensure directory exists
        const dirPath = path.join(process.cwd(), 'src', 'assets', 'detail-reports');
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        // Save file to assets directory
        const filePath = path.join(dirPath, 'Service Detail.xlsx');
        fs.writeFileSync(filePath, file.buffer);

        // Read and process the Excel file
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        // Skip first 4 rows by setting range
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        range.s.r = 4; // Start from row 5 (0-based index)
        worksheet['!ref'] = XLSX.utils.encode_range(range);

        const data = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

        // Process each row and save to database
        for (const row of data) {
            if (!row['EmpNo'] || !row['Full Name']) {
                continue; // Skip rows without required fields
            }

            const dob = this.parseDate(row['Date Of Birth']);
            const seniorityDate = this.parseDate(row['Seniority Date']);

            if (!dob || !seniorityDate) {
                continue;
            }

            // Extract and save qualifications
            let qualifications: Qualification[] = [];
            if (row['Qualification']) {
                qualifications = await this.extractAndSaveQualifications(row['Qualification']);
            }

            // Check if employee exists
            let employee = await this.employeeRepository.findOne({
                where: { employeeId: row['EmpNo'] },
                relations: ['qualifications']
            });

            if (!employee) {
                // Create new employee if doesn't exist
                employee = new Employee();
                employee.employeeId = row['EmpNo'];
            }

            // Update employee fields
            employee.name = row['Full Name'];
            employee.dob = dob;
            employee.seniorityDate = seniorityDate;
            const levelRaw: any = (row['Level No'] ?? row['Level'] ?? 0);
            const levelNum = typeof levelRaw === 'string' ? parseInt(levelRaw, 10) : Number(levelRaw);
            employee.level = isNaN(levelNum) ? 0 : levelNum;
            employee.sex = row['Sex'] || Sex.U;
            employee.education = row['Qualification'] || '';
            employee.workingOffice = row['Work Office'] || '';

            // Try different possible column names for Jobs/Position
            const jobsValue = row['Jobs'] || row['Job'] || row['Position'] || row['Current Position'] || '';
            employee.position = jobsValue;

            employee.qualifications = qualifications;

            try {
                await this.employeeRepository.save(employee);
            } catch (error) {
                console.error(`Error saving employee ${row['EmpNo']}:`, error);
                throw error;
            }
        }
    }

    async filterByEmployeeIds(filterDto: FilterByEmployeeIdDto): Promise<Employee[]> {
        return this.employeeRepository.find({
            where: {
                employeeId: In(filterDto.employeeIds)
            }
        });
    }

    async getEmployeeById(employeeId: number): Promise<Employee | null> {
        return this.employeeRepository.findOne({
            where: { employeeId }
        });
    }

    async getEmployeeAssignments(employeeId: number, startLevel?: number, endLevel?: number): Promise<AssignmentDetail[]> {
        const where: any = { employeeId };
        if (typeof startLevel === 'number' && typeof endLevel === 'number') {
            where.level = Between(startLevel, endLevel);
        } else if (typeof startLevel === 'number') {
            where.level = MoreThanOrEqual(startLevel);
        } else if (typeof endLevel === 'number') {
            where.level = LessThanOrEqual(endLevel);
        }
        return this.assignmentDetailRepository.find({
            where,
            order: { startDateBS: 'ASC' }
        });
    }

    async getEmployeeAbsents(employeeId: number) {
        return this.absentDetailRepository.find({ where: { employeeId }, order: { id: 'ASC' } });
    }

    async getEmployeeLeaves(employeeId: number, leaveType?: string) {
        const where: any = { employeeId };
        if (leaveType && leaveType.trim()) {
            where.leaveType = leaveType.trim();
        }
        return this.leaveDetailRepository.find({ where, order: { id: 'ASC' } });
    }

    async getEmployeeRewardsPunishments(employeeId: number) {
        return this.rewardPunishmentDetailRepository.find({ where: { employeeId }, order: { id: 'ASC' } });
    }

    /**
     * Get employee assignments with district, category, and Y/M/D diff (BS)
     */
    async getEmployeeAssignmentsWithExtras(employeeId: number, startLevel?: number, endLevel?: number, defaultEndDateBS?: string) {
        const assignments = await this.getEmployeeAssignments(employeeId, startLevel, endLevel);

        // Fetch employee to derive gender for marks calculation
        const employee = await this.getEmployeeById(employeeId);
        const employeeGender: 'male' | 'female' | null = employee?.sex === Sex.M ? 'male' : (employee?.sex === Sex.F ? 'female' : null);

        const lastIndex = assignments.length - 1;
        const normalizedDefaultEnd = defaultEndDateBS ? defaultEndDateBS.replace(/-/g, '/') : undefined;
        const todayBS = await formatBS(new Date());
        const normalizedTodayEnd = todayBS ? todayBS.replace(/-/g, '/') : undefined;
        const breakDateBS = '2079/03/32';
        const nextBreakDateBS = '2079/04/01';
        const breakNdMain = this.parseBSDate(breakDateBS);
        const breakADMain = breakNdMain ? breakNdMain.getDateObject() : null;

        const expanded = await Promise.all(assignments.map(async (a, idx) => {
            // Look up district and category from workOffice -> Office -> District
            let district: string | undefined = undefined;
            let category: string | undefined = undefined;
            const office = await this.officeRepository.findOne({ where: { name: a.workOffice } });
            if (office) {
                district = office.district;
                const districtEntity = await this.districtRepository.findOne({ where: { name: office.district } });
                if (districtEntity) {
                    category = districtEntity.category;
                }
            }

            // Determine effective end date for calculations
            const effectiveEndDateBS = (!a.endDateBS && idx === lastIndex)
                ? (normalizedDefaultEnd && this.isValidBSDate(normalizedDefaultEnd) ? normalizedDefaultEnd : normalizedTodayEnd)
                : (a.endDateBS ? a.endDateBS.replace(/-/g, '/') : undefined);

            const startBS = a.startDateBS ? a.startDateBS.replace(/-/g, '/') : undefined;

            const segments: any[] = [];

            // Helper to compute Y/M/D and build segment object
            const buildSegment = async (segStart: string, segEnd?: string) => {
                let years = 0, months = 0, days = 0;
                let totalNumDays = 0;
                let beforeBreak: boolean | undefined = undefined;
                if (segStart && segEnd && this.isValidBSDate(segStart) && this.isValidBSDate(segEnd)) {
                    try {
                        const diff = await diffNepaliYMDWithTotalDays(segStart, segEnd);
                        years = diff.years;
                        months = diff.months;
                        days = diff.days;
                        totalNumDays = diff.totalNumDays;
                        if (breakADMain) {
                            const segEndNd = this.parseBSDate(segEnd);
                            if (segEndNd) {
                                const segEndAD = segEndNd.getDateObject();
                                beforeBreak = segEndAD.getTime() <= breakADMain.getTime();
                            }
                        }
                    } catch { }
                }
                return {
                    ...a,
                    startDateBS: segStart,
                    endDateBS: segEnd,
                    district,
                    category,
                    years,
                    months,
                    days,
                    totalNumDays,
                    beforeBreak,
                } as any;
            };

            // If valid dates and break date falls between start and end (inclusive), split into two segments
            if (startBS && effectiveEndDateBS && this.isValidBSDate(startBS) && this.isValidBSDate(effectiveEndDateBS) && this.isValidBSDate(breakDateBS)) {
                const startNd = this.parseBSDate(startBS);
                const endNd = this.parseBSDate(effectiveEndDateBS);
                const breakNd = this.parseBSDate(breakDateBS);

                if (startNd && endNd && breakNd) {
                    try {
                        const startAD = startNd.getDateObject();
                        const endAD = endNd.getDateObject();
                        const breakAD = breakNd.getDateObject();

                        if (startAD.getTime() <= breakAD.getTime() && breakAD.getTime() < endAD.getTime()) {
                            // First segment: start -> break (inclusive)
                            segments.push(await buildSegment(startBS, breakDateBS));
                            // Second segment: day after break -> end
                            segments.push(await buildSegment(nextBreakDateBS, effectiveEndDateBS));
                            return segments;
                        }
                    } catch { /* fall through to unsplit */ }
                }
            }

            // No split; single segment as-is
            segments.push(await buildSegment(startBS || a.startDateBS, effectiveEndDateBS));
            return segments;
        }));

        // Flatten segments
        let flattened = expanded.flat();

        // Further split assignment segments by absences and NON STANDARD leaves
        try {
            const rawAbsents = await this.getEmployeeAbsents(employeeId);
            const rawLeaves = await this.getEmployeeLeaves(employeeId);

            const normalize = async (v: any) => (await this.normalizeBsDateValue(v)).replace(/\//g, '-');
            const isValid = (s: string) => /^(\d{4})-(\d{2})-(\d{2})$/.test(s);

            type BreakSeg = { start: string; end: string; remarks: string };
            const breaks: BreakSeg[] = [];
            for (const a of rawAbsents as any[]) {
                const s = await normalize(a.fromDateBS);
                const e = await normalize(a.toDateBS);
                if (isValid(s) && isValid(e) && s < e) {
                    breaks.push({ start: s, end: e, remarks: 'absent' });
                }
            }
            for (const l of rawLeaves as any[]) {
                if ((l.leaveType || '').toString().trim().toUpperCase() !== 'NON STANDARD') continue;
                const s = await normalize(l.fromDateBS);
                const e = await normalize(l.toDateBS);
                if (isValid(s) && isValid(e) && s < e) {
                    breaks.push({ start: s, end: e, remarks: 'non-standard leave' });
                }
            }

            breaks.sort((b1, b2) => (b1.start < b2.start ? -1 : b1.start > b2.start ? 1 : (b1.end < b2.end ? -1 : b1.end > b2.end ? 1 : 0)));

            const splitSegments: any[] = [];
            for (const base of flattened) {
                const segStart = (base.startDateBS || '').replace(/\//g, '-');
                const segEnd = (base.endDateBS || '').replace(/\//g, '-');
                if (!isValid(segStart) || !isValid(segEnd) || !(segStart < segEnd)) {
                    splitSegments.push(base);
                    continue;
                }
                let current = segStart;
                for (const br of breaks) {
                    if (br.end <= current || br.start >= segEnd) {
                        continue;
                    }
                    const normalStart = current;
                    const normalEnd = br.start > segEnd ? segEnd : br.start;
                    if (normalStart < normalEnd) {
                        // normal subsegment
                        let years = 0, months = 0, days = 0, totalNumDays = 0; let beforeBreak: boolean | undefined = undefined;
                        try {
                            const diff = await diffNepaliYMDWithTotalDays(normalStart, normalEnd);
                            years = diff.years; months = diff.months; days = diff.days; totalNumDays = diff.totalNumDays;
                            if (breakADMain) {
                                const segEndNd = this.parseBSDate(normalEnd.replace(/-/g, '/'));
                                if (segEndNd) {
                                    const segEndAD = segEndNd.getDateObject();
                                    beforeBreak = segEndAD.getTime() <= breakADMain.getTime();
                                }
                            }
                        } catch { }
                        splitSegments.push({ ...base, startDateBS: normalStart, endDateBS: normalEnd, years, months, days, totalNumDays, beforeBreak });
                    }
                    const breakStart = br.start < current ? current : br.start;
                    const breakEnd = br.end > segEnd ? segEnd : br.end;
                    if (breakStart < breakEnd) {
                        // absent/non-standard subsegment
                        let years = 0, months = 0, days = 0, totalNumDays = 0; let beforeBreak: boolean | undefined = undefined;
                        try {
                            const diff = await diffNepaliYMDWithTotalDays(breakStart, breakEnd);
                            years = diff.years; months = diff.months; days = diff.days; totalNumDays = diff.totalNumDays;
                            if (breakADMain) {
                                const segEndNd = this.parseBSDate(breakEnd.replace(/-/g, '/'));
                                if (segEndNd) {
                                    const segEndAD = segEndNd.getDateObject();
                                    beforeBreak = segEndAD.getTime() <= breakADMain.getTime();
                                }
                            }
                        } catch { }
                        splitSegments.push({ ...base, startDateBS: breakStart, endDateBS: breakEnd, years, months, days, totalNumDays, beforeBreak, remarks: br.remarks });
                        current = breakEnd;
                    }
                    if (current >= segEnd) break;
                }
                if (current < segEnd) {
                    let years = 0, months = 0, days = 0, totalNumDays = 0; let beforeBreak: boolean | undefined = undefined;
                    try {
                        const diff = await diffNepaliYMDWithTotalDays(current, segEnd);
                        years = diff.years; months = diff.months; days = diff.days; totalNumDays = diff.totalNumDays;
                        if (breakADMain) {
                            const segEndNd = this.parseBSDate(segEnd.replace(/-/g, '/'));
                            if (segEndNd) {
                                const segEndAD = segEndNd.getDateObject();
                                beforeBreak = segEndAD.getTime() <= breakADMain.getTime();
                            }
                        }
                    } catch { }
                    splitSegments.push({ ...base, startDateBS: current, endDateBS: segEnd, years, months, days, totalNumDays, beforeBreak });
                }
            }

            flattened = splitSegments;
        } catch { /* if splitting fails, keep original flattened */ }

        // Initialize presentDays with totalNumDays for each assignment
        for (const seg of flattened) {
            if (seg.remarks) {
                seg.presentDays = 0;
            } else {
                seg.presentDays = seg.totalNumDays || 0;
            }
        }

        // Accumulate presentDays for consecutive same-category segments
        for (let i = 0; i < flattened.length - 1; i++) {
            const currentAssignment = flattened[i];
            const subsequentAssignment = flattened[i + 1];
            if (currentAssignment && subsequentAssignment && currentAssignment.category === subsequentAssignment.category) {
                subsequentAssignment.presentDays = (subsequentAssignment.presentDays || 0) + (currentAssignment.presentDays || 0);
            }
        }

        // Compute totalMarks for each segment based on marks-calculation.md
        for (let i = 0; i < flattened.length; i++) {
            const seg = flattened[i] as any;

            // Default guards
            const years = typeof seg.years === 'number' ? seg.years : 0;
            const months = typeof seg.months === 'number' ? seg.months : 0;
            const days = typeof seg.days === 'number' ? seg.days : 0;
            const presentDays: number = typeof seg.presentDays === 'number' ? seg.presentDays : 0;

            let marksYear = 0; // default fallback

            // For absent/non-standard leave segments, force marks to 0
            if (seg.remarks) {
                seg.yearMarks = 0;
                seg.monthMarks = 0;
                seg.daysMarks = 0;
                seg.marksYear = 0;
                seg.totalMarks = 0;
                continue;
            }

            if (seg.beforeBreak) {
                // Old system
                let effectiveCategory = seg.category as string | undefined;
                if (presentDays < 90) {
                    const prevSeg = i > 0 ? flattened[i - 1] as any : undefined;
                    if (!prevSeg) {
                        marksYear = 0; // new appointment: no previous category
                    } else {
                        effectiveCategory = prevSeg.category;
                    }
                }

                if (effectiveCategory) {
                    // If gender is not known, assign 0 without fallback
                    if (!employeeGender) {
                        marksYear = 0;
                    } else {
                        const cm = await this.categoryMarksRepository.findOne({ where: { category: effectiveCategory, type: 'old', gender: employeeGender } });
                        marksYear = (cm && typeof cm.marks === 'number') ? cm.marks : 0;
                    }
                } else {
                    marksYear = 0;
                }
            } else {
                // New system
                if (presentDays < 233) {
                    marksYear = 1.75;
                } else {
                    const effectiveCategory = seg.category as string | undefined;
                    if (effectiveCategory) {
                        const cm = await this.categoryMarksRepository.findOne({ where: { category: effectiveCategory, type: 'new' } });
                        marksYear = (cm && typeof cm.marks === 'number') ? cm.marks : 0;
                    } else {
                        marksYear = 0;
                    }
                }
            }

            const marksMonth = marksYear / 12;
            const marksDay = marksYear / 365;

            const yearMarks = years * marksYear;
            const monthMarks = months * marksMonth;
            const daysMarks = days * marksDay;
            seg.yearMarks = yearMarks;
            seg.monthMarks = monthMarks;
            seg.daysMarks = daysMarks;
            seg.marksYear = marksYear;
            seg.totalMarks = yearMarks + monthMarks + daysMarks;
        }

        return flattened;
    }

    private parseExcelDate(dateStr: string): string {
        if (!dateStr) return '';

        // Extract date part from the string (e.g., "14-APR-69" from "Date of Birth: 14-APR-69 (2026/01/02)")
        const dateMatch = dateStr.match(/(\d{2})-([A-Z]{3})-(\d{2,4})/);
        if (!dateMatch) return '';

        const [_, day, month, year] = dateMatch;
        const monthMap: { [key: string]: string } = {
            'JAN': 'January', 'FEB': 'February', 'MAR': 'March', 'APR': 'April',
            'MAY': 'May', 'JUN': 'June', 'JUL': 'July', 'AUG': 'August',
            'SEP': 'September', 'OCT': 'October', 'NOV': 'November', 'DEC': 'December'
        };

        // Handle 2-digit years
        const fullYear = year.length === 2 ? (parseInt(year) > 50 ? `19${year}` : `20${year}`) : year;

        return `${day} ${monthMap[month]} ${fullYear}`;
    }

    /**
     * Parse BS date string to NepaliDate object
     * Expected format: "2079/03/32" or "2079-03/31"
     */
    private parseBSDate(bsDateStr: string): any | null {
        if (!bsDateStr) return null;

        // Parse the BS date string
        const parts = bsDateStr.split(/[\/\-]/);
        if (parts.length !== 3) {
            console.error(`Invalid BS date format: ${bsDateStr}`);
            return null;
        }

        const bsYear = parseInt(parts[0]);
        const bsMonth = parseInt(parts[1]);
        const bsDay = parseInt(parts[2]);

        if (isNaN(bsYear) || isNaN(bsMonth) || isNaN(bsDay)) {
            console.error(`Invalid BS date components: ${bsDateStr}`);
            return null;
        }

        try {
            return new NepaliDate(bsYear, bsMonth - 1, bsDay);
        } catch (error) {
            console.error(`Invalid BS date: ${bsDateStr}`, error);
            return null;
        }
    }

    /**
     * Validate if a BS date string is valid
     */
    private isValidBSDate(bsDateStr: string): boolean {
        if (!bsDateStr) return false;

        // Parse the BS date string
        const parts = bsDateStr.split(/[\/\-]/);
        if (parts.length !== 3) {
            return false;
        }

        const bsYear = parseInt(parts[0]);
        const bsMonth = parseInt(parts[1]);
        const bsDay = parseInt(parts[2]);

        if (isNaN(bsYear) || isNaN(bsMonth) || isNaN(bsDay)) {
            return false;
        }

        try {
            new NepaliDate(bsYear, bsMonth - 1, bsDay);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Format NepaliDate to BS date string
     */
    private formatBSDate(nepaliDate: any): string {
        try {
            return nepaliDate.format('YYYY-MM-DD');
        } catch (error) {
            console.error('Error formatting BS date:', error);
            return '';
        }
    }

    /**
     * Calculate days between two BS dates using NepaliDate
     */
    private calculateDaysBetweenBSDates(startDateBS: string, endDateBS: string): number {
        const startDate = this.parseBSDate(startDateBS);
        const endDate = this.parseBSDate(endDateBS);

        if (!startDate || !endDate) return 0;

        try {
            // Convert NepaliDate to JavaScript Date for calculation
            const startDateAD = startDate.getDateObject();
            const endDateAD = endDate.getDateObject();

            const timeDiff = endDateAD.getTime() - startDateAD.getTime();
            return Math.ceil(timeDiff / (1000 * 3600 * 24));
        } catch (error) {
            console.error('Error calculating days between BS dates:', error);
            return 0;
        }
    }

    /**
     * Calculate marks for old system (before 2079/03/32)
     */
    private async marksAccOld(numDays: number, presentDays: number, workOffice: string, gender: 'male' | 'female' | null = null, previousWorkOffice?: string): Promise<number> {
        if (presentDays < 90) {
            const geoMarks = previousWorkOffice ? await this.getGeographicalMarks(previousWorkOffice, gender, 'old') : await this.getGeographicalMarks(workOffice, gender, 'old');
            return geoMarks * numDays / 365;
        } else {
            const geoMarks = await this.getGeographicalMarks(workOffice, gender, 'old');
            return geoMarks * numDays / 365;
        }
    }

    /**
     * Calculate marks for new system (after 2079/03/32)
     */
    private async marksAccNew(numDays: number, presentDays: number, workOffice: string, gender: 'male' | 'female' | null = null): Promise<number> {
        if (presentDays < 233) {
            return numDays * 1.75 / 365;
        } else {
            const geoMarks = await this.getGeographicalMarks(workOffice, gender, 'new');
            return numDays * geoMarks / 365;
        }
    }

    /**
     * Calculate geographical marks for an assignment
     */
    private async calculateGeographicalMarks(assignment: AssignmentDetailDto, gender: 'male' | 'female' | null, previousAssignment?: AssignmentDetailDto): Promise<{
        totalGeographicalMarks: number;
        numDaysOld: number;
        numDaysNew: number;
        totalNumDays: number;
    }> {
        if (!assignment.startDateBS || !assignment.endDateBS) {
            return {
                totalGeographicalMarks: 0,
                numDaysOld: 0,
                numDaysNew: 0,
                totalNumDays: 0
            };
        }

        // Validate BS dates
        if (!this.isValidBSDate(assignment.startDateBS) || !this.isValidBSDate(assignment.endDateBS)) {
            return {
                totalGeographicalMarks: 0,
                numDaysOld: 0,
                numDaysNew: 0,
                totalNumDays: 0
            };
        }

        // Calculate total number of days
        const totalNumDays = this.calculateDaysBetweenBSDates(assignment.startDateBS, assignment.endDateBS);

        // Calculate days in old system (before 2079/03/32)
        let numDaysOld = 0;
        let numDaysNew = 0;

        const cutoffDate = '2079/03/32';
        const startDate = this.parseBSDate(assignment.startDateBS);
        const endDate = this.parseBSDate(assignment.endDateBS);
        const cutoffDateBS = this.parseBSDate(cutoffDate);

        if (startDate && endDate && cutoffDateBS) {
            try {
                // Convert to JavaScript dates for comparison
                const startDateAD = startDate.getDateObject();
                const endDateAD = endDate.getDateObject();
                const cutoffDateAD = cutoffDateBS.getDateObject();

                // If assignment starts before cutoff and ends after cutoff
                if (startDateAD < cutoffDateAD && endDateAD > cutoffDateAD) {
                    numDaysOld = this.calculateDaysBetweenBSDates(assignment.startDateBS, cutoffDate);
                    numDaysNew = this.calculateDaysBetweenBSDates(cutoffDate, assignment.endDateBS);
                }
                // If assignment is entirely before cutoff
                else if (endDateAD <= cutoffDateAD) {
                    numDaysOld = totalNumDays;
                    numDaysNew = 0;
                }
                // If assignment is entirely after cutoff
                else if (startDateAD >= cutoffDateAD) {
                    numDaysOld = 0;
                    numDaysNew = totalNumDays;
                }
            } catch (error) {
                // Fallback to simple calculation
                numDaysOld = this.calculateDaysBetweenBSDates(assignment.startDateBS, cutoffDate);
                numDaysNew = this.calculateDaysBetweenBSDates(cutoffDate, assignment.endDateBS);
            }
        }

        // Calculate present days for the assignment
        const presentDays = totalNumDays;

        let totalGeographicalMarks = 0;

        // Apply the updated calculation logic based on the specification
        if (startDate && endDate && cutoffDateBS) {
            try {
                const startDateAD = startDate.getDateObject();
                const endDateAD = endDate.getDateObject();
                const cutoffDateAD = cutoffDateBS.getDateObject();

                // If assignment spans the cutoff date (starts before and ends after)
                if (startDateAD < cutoffDateAD && endDateAD > cutoffDateAD) {
                    // Use marksAccNew(numDaysNew) + marksAccOld(numDaysOld)
                    const marksOld = await this.marksAccOld(
                        Math.max(0, numDaysOld),
                        presentDays,
                        assignment.workOffice,
                        gender,
                        previousAssignment?.workOffice,
                    );
                    const marksNew = await this.marksAccNew(
                        Math.max(0, numDaysNew),
                        presentDays,
                        assignment.workOffice,
                        gender
                    );
                    totalGeographicalMarks = marksOld + marksNew;
                } else {
                    // If assignment is entirely before or after cutoff date
                    // Use marksAccNew(totalNumDays)
                    totalGeographicalMarks = await this.marksAccNew(totalNumDays, presentDays, assignment.workOffice, gender);
                }
            } catch (error) {
                // Fallback to simple calculation
                totalGeographicalMarks = await this.marksAccNew(totalNumDays, presentDays, assignment.workOffice, gender);
            }
        } else {
            // Fallback if date parsing fails
            totalGeographicalMarks = await this.marksAccNew(totalNumDays, presentDays, assignment.workOffice, gender);
        }

        return {
            totalGeographicalMarks,
            numDaysOld: Math.max(0, numDaysOld),
            numDaysNew: Math.max(0, numDaysNew),
            totalNumDays
        };
    }

    async uploadEmployeeDetail(file: Express.Multer.File): Promise<EmployeeDetailDto[]> {
        if (!file || !file.buffer) {
            throw new Error('No file uploaded or file is empty');
        }

        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const employeeDetails: EmployeeDetailDto[] = [];
        let currentEmployee: Partial<EmployeeDetailDto> = {};
        let isProcessingAssignments = false;
        let assignmentHeaders: string[] = [];
        let currentAssignments: AssignmentDetailDto[] = [];
        let previousAssignmentRow: AssignmentDetailDto | null = null;
        const levelFirstRowProcessed = new Set<number>();
        // New sections state
        let isProcessingAbsents = false;
        let isProcessingLeaves = false;
        let isProcessingRewards = false;
        let absentHeaders: string[] = [];
        let leaveHeaders: string[] = [];
        let rewardHeaders: string[] = [];
        let currentAbsents: any[] = [];
        let currentLeaves: any[] = [];
        let currentRewards: any[] = [];
        let currentEmployeeGender: 'male' | 'female' | null = null;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!Array.isArray(row) || row.length === 0) continue;

            const firstCell = row[0]?.toString().trim() || '';

            // Extract employee ID
            const employeeIdMatch = firstCell.match(/Employee No:\s*(\d+)/);
            if (employeeIdMatch) {
                if (Object.keys(currentEmployee).length > 0 && currentEmployee.employeeId) {
                    // Save assignments to database for previous employee
                    await this.saveAssignmentsToDatabase(currentEmployee.employeeId, currentAssignments, currentEmployeeGender);
                    await this.saveAbsentsToDatabase(currentEmployee.employeeId, currentAbsents);
                    await this.saveLeavesToDatabase(currentEmployee.employeeId, currentLeaves);
                    await this.saveRewardsToDatabase(currentEmployee.employeeId, currentRewards);

                    // Create a new object to ensure all properties are included
                    const employeeDetail: EmployeeDetailDto = {
                        employeeId: currentEmployee.employeeId,
                        name: currentEmployee.name,
                        dob: currentEmployee.dob,
                        dor: currentEmployee.dor,
                        joinDate: currentEmployee.joinDate,
                        permDate: currentEmployee.permDate,
                        assignments: [...currentAssignments], // Create a new array with all assignments
                        absents: [...currentAbsents],
                        leaves: [...currentLeaves],
                        rewardsPunishments: [...currentRewards]
                    };
                    employeeDetails.push(employeeDetail);
                }
                currentEmployee = {
                    employeeId: employeeIdMatch[1],
                    assignments: [],
                    absents: [],
                    leaves: [],
                    rewardsPunishments: []
                };
                currentAssignments = [];
                previousAssignmentRow = null;
                levelFirstRowProcessed.clear();
                currentAbsents = [];
                currentLeaves = [];
                currentRewards = [];
                isProcessingAssignments = false;
                isProcessingAbsents = false;
                isProcessingLeaves = false;
                isProcessingRewards = false;
                continue;
            }

            // Check for Assignment Details section
            if (/^assignment details:?$/i.test(firstCell)) {
                isProcessingAssignments = true;
                isProcessingAbsents = false;
                isProcessingLeaves = false;
                isProcessingRewards = false;
                // Get headers from next row
                if (i + 1 < data.length) {
                    const headerRow = data[i + 1];
                    if (Array.isArray(headerRow)) {
                        assignmentHeaders = headerRow.map(h => h?.toString() || '');
                    }
                }
                i += 1; // move to header row; next loop will read data starting from i+1
                continue;
            }

            // Check for Absent Details section
            if (/^absent details:?$/i.test(firstCell)) {
                isProcessingAssignments = false;
                isProcessingAbsents = true;
                isProcessingLeaves = false;
                isProcessingRewards = false;
                if (i + 1 < data.length) {
                    const headerRow = data[i + 1];
                    if (Array.isArray(headerRow)) {
                        absentHeaders = headerRow.map(h => h?.toString() || '');
                    }
                }
                i += 1;
                continue;
            }

            // Check for Leave Details section
            if (/^leave details:?$/i.test(firstCell)) {
                isProcessingAssignments = false;
                isProcessingAbsents = false;
                isProcessingLeaves = true;
                isProcessingRewards = false;
                if (i + 1 < data.length) {
                    const headerRow = data[i + 1];
                    if (Array.isArray(headerRow)) {
                        leaveHeaders = headerRow.map(h => h?.toString() || '');
                    }
                }
                i += 1;
                continue;
            }

            // Check for Reward/Punishment Details section
            if (/^reward\s*\/\s*punishment details:?$/i.test(firstCell)) {
                isProcessingAssignments = false;
                isProcessingAbsents = false;
                isProcessingLeaves = false;
                isProcessingRewards = true;
                if (i + 1 < data.length) {
                    const headerRow = data[i + 1];
                    if (Array.isArray(headerRow)) {
                        rewardHeaders = headerRow.map(h => h?.toString() || '');
                    }
                }
                i += 1;
                continue;
            }

            // Check for end of assignments section
            if (firstCell === 'Qualification Details:') {
                isProcessingAssignments = false;
                isProcessingAbsents = false;
                isProcessingLeaves = false;
                isProcessingRewards = false;
                previousAssignmentRow = null;
                levelFirstRowProcessed.clear();
                if (currentEmployee.employeeId) {
                    // Save assignments to database
                    await this.saveAssignmentsToDatabase(currentEmployee.employeeId, currentAssignments, currentEmployeeGender);
                    await this.saveAbsentsToDatabase(currentEmployee.employeeId, currentAbsents);
                    await this.saveLeavesToDatabase(currentEmployee.employeeId, currentLeaves);
                    await this.saveRewardsToDatabase(currentEmployee.employeeId, currentRewards);

                    // Create a new object to ensure all properties are included
                    const employeeDetail: EmployeeDetailDto = {
                        employeeId: currentEmployee.employeeId,
                        name: currentEmployee.name,
                        dob: currentEmployee.dob,
                        dor: currentEmployee.dor,
                        joinDate: currentEmployee.joinDate,
                        permDate: currentEmployee.permDate,
                        assignments: [...currentAssignments], // Create a new array with all assignments
                        absents: [...currentAbsents],
                        leaves: [...currentLeaves],
                        rewardsPunishments: [...currentRewards]
                    };
                    employeeDetails.push(employeeDetail);
                }
                currentAssignments = [];
                currentAbsents = [];
                currentLeaves = [];
                currentRewards = [];
                continue;
            }

            // Process assignment data
            if (isProcessingAssignments && row.length > 0) {
                // Skip empty rows or rows without enough data
                if (row.every(cell => !cell)) {
                    continue;
                }

                const assignment: Partial<AssignmentDetailDto> = {
                    employeeId: parseInt(currentEmployee.employeeId || '0'),
                };

                // Map the columns based on headers (robust to casing/spacing variants)
                assignmentHeaders.forEach((header, index) => {
                    const rawValue = row[index];
                    const value = rawValue?.toString().trim() || '';

                    const h = (header ?? '').toString().trim().toLowerCase();

                    // Don't skip empty values for date fields as they might be Excel date numbers
                    if (!value && !this.isExcelDateNumber(rawValue)) return;

                    if (h === 'position') {
                        assignment.position = value;
                        return;
                    }
                    if (h === 'jobs' || h === 'job') {
                        assignment.jobs = value;
                        return;
                    }
                    if (h === 'function') {
                        assignment.function = value;
                        return;
                    }
                    if (h === 'emp. category' || h === 'emp category') {
                        assignment.empCategory = value;
                        return;
                    }
                    if (h === 'emp. type' || h === 'emp type') {
                        assignment.empType = value;
                        return;
                    }
                    if (h === 'work office') {
                        assignment.workOffice = value;
                        return;
                    }
                    if (h === 'start date bs') {
                        if (this.isExcelDateNumber(rawValue)) {
                            assignment.startDateBS = this.convertExcelDateToBS(rawValue);
                        } else {
                            assignment.startDateBS = value;
                        }
                        return;
                    }
                    if (h === 'end date bs') {
                        if (this.isExcelDateNumber(rawValue)) {
                            assignment.endDateBS = this.convertExcelDateToBS(rawValue);
                        } else {
                            assignment.endDateBS = value;
                        }
                        return;
                    }
                    if (h === 'seniority date bs') {
                        if (this.isExcelDateNumber(rawValue)) {
                            assignment.seniorityDateBS = this.convertExcelDateToBS(rawValue);
                        } else {
                            assignment.seniorityDateBS = value;
                        }
                        return;
                    }
                    if (h === 'level' || h === 'level no' || h === 'level number') {
                        const levelNum = parseInt(value, 10);
                        assignment.level = isNaN(levelNum) ? 0 : levelNum;
                        return;
                    }
                    if (h === 'perm. level date bs' || h === 'perm level date bs') {
                        if (this.isExcelDateNumber(rawValue)) {
                            assignment.permLevelDateBS = this.convertExcelDateToBS(rawValue);
                        } else {
                            assignment.permLevelDateBS = value;
                        }
                        return;
                    }
                    if (h === 'reason') {
                        assignment.reasonForPosition = value;
                        return;
                    }
                    if (h === 'start date') {
                        const startDate = this.parseExcelDate(value);
                        assignment.startDate = startDate ? new Date(startDate) : undefined;
                        return;
                    }
                    if (h === 'seniority date') {
                        const seniorityDate = this.parseExcelDate(value);
                        assignment.seniorityDate = seniorityDate ? new Date(seniorityDate) : undefined;
                        return;
                    }
                });

                // Ensure NOT NULL fields are not null or undefined
                assignment.position = assignment.position ?? '';
                assignment.jobs = assignment.jobs ?? '';
                assignment.function = assignment.function ?? '';
                assignment.empCategory = assignment.empCategory ?? '';
                assignment.empType = assignment.empType ?? '';
                assignment.workOffice = assignment.workOffice ?? '';
                assignment.level = assignment.level ?? 0;

                // Handle synthetic pre-level assignment if seniority date is before start date (first row per level)
                const levelValue = assignment.level;
                const isFirstRowForLevel = typeof levelValue === 'number' && !isNaN(levelValue) && !levelFirstRowProcessed.has(levelValue);
                if (isFirstRowForLevel) {
                    levelFirstRowProcessed.add(levelValue);

                    const normalizedStart = assignment.startDateBS ? await this.normalizeBsDateValue(assignment.startDateBS) : '';
                    const normalizedSeniority = assignment.seniorityDateBS ? await this.normalizeBsDateValue(assignment.seniorityDateBS) : '';
                    assignment.startDateBS = normalizedStart || assignment.startDateBS;
                    assignment.seniorityDateBS = normalizedSeniority || assignment.seniorityDateBS;

                    // Coerce common m/d/yyyy BS strings into yyyy-mm-dd so NepaliDate can parse them
                    const coerceToYMD = (raw: string) => {
                        const match = raw?.match?.(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
                        if (match) {
                            const [, m, d, y] = match;
                            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                        }
                        return raw;
                    };
                    const startForCheck = assignment.startDateBS ? coerceToYMD(assignment.startDateBS) : '';
                    const seniorityForCheck = assignment.seniorityDateBS ? coerceToYMD(assignment.seniorityDateBS) : '';
                    const displayStart = startForCheck || assignment.startDateBS;
                    const displaySeniority = seniorityForCheck || assignment.seniorityDateBS;
                    assignment.startDateBS = displayStart;
                    assignment.seniorityDateBS = displaySeniority;

                    const startForCompare = (assignment.startDateBS || '').replace(/\//g, '-');
                    const seniorityForCompare = (assignment.seniorityDateBS || '').replace(/\//g, '-');

                    if (startForCompare && seniorityForCompare && startForCompare > seniorityForCompare) {
                        let endFormatted = startForCompare;
                        try {
                            const [yy, mm, dd] = startForCompare.split('-').map(v => parseInt(v, 10));
                            const jsDate = new Date(yy, (mm ?? 1) - 1, dd ?? 1);
                            jsDate.setDate(jsDate.getDate() - 1);
                            endFormatted = `${jsDate.getFullYear()}-${(jsDate.getMonth() + 1).toString().padStart(2, '0')}-${jsDate.getDate().toString().padStart(2, '0')}`;
                        } catch { /* fallback to startForCompare */ }

                        const base = previousAssignmentRow ? { ...previousAssignmentRow } : { ...assignment };
                        const syntheticAssignment: AssignmentDetailDto = {
                            ...base,
                            employeeId: assignment.employeeId ?? 0,
                            position: assignment.position ?? base.position ?? '',
                            level: levelValue,
                            startDateBS: seniorityForCompare,
                            endDateBS: endFormatted,
                            jobs: base.jobs ?? '',
                            function: base.function ?? '',
                            empCategory: base.empCategory ?? '',
                            empType: base.empType ?? '',
                            workOffice: base.workOffice ?? '',
                            reasonForPosition: base.reasonForPosition ?? '',
                        };
                        currentAssignments.push(syntheticAssignment);
                    }
                }

                // Only add assignment if it has more than just employeeId and has startDateBS
                // Note: endDateBS can be null/undefined for current assignments
                if (
                    Object.keys(assignment).length > 2 &&
                    assignment.startDateBS
                ) {
                    currentAssignments.push(assignment as AssignmentDetailDto);
                }
                previousAssignmentRow = assignment as AssignmentDetailDto;
                continue;
            }

            // Process Absent Details rows
            if (isProcessingAbsents && row.length > 0) {
                if (row.every(cell => !cell)) {
                    continue;
                }
                const absent: any = {};
                absentHeaders.forEach((header, index) => {
                    const rawValue = row[index];
                    const value = rawValue?.toString().trim() || '';
                    const h = (header ?? '').toString().trim().toLowerCase();
                    if ((h === 'from date') && (value || this.isExcelDateNumber(rawValue))) {
                        absent.fromDateBS = this.isExcelDateNumber(rawValue) ? this.convertExcelDateToBS(rawValue) : value;
                        return;
                    }
                    if ((h === 'to date') && (value || this.isExcelDateNumber(rawValue))) {
                        absent.toDateBS = this.isExcelDateNumber(rawValue) ? this.convertExcelDateToBS(rawValue) : value;
                        return;
                    }
                    if (h === 'duration') {
                        absent.duration = value;
                        return;
                    }
                    if (h === 'remarks' || h === 'remark') {
                        absent.remarks = value;
                        return;
                    }
                });
                // Add only if not a header echo (e.g., From Date, To Date)
                const looksLikeHeaderEcho = ['from date', 'to date', 'duration', 'remarks'].every((k, idx) => (row[idx]?.toString().trim().toLowerCase() || '') === k);
                if (!looksLikeHeaderEcho && (absent.fromDateBS || absent.toDateBS || absent.duration || absent.remarks)) {
                    currentAbsents.push(absent);
                }
                continue;
            }

            // Process Leave Details rows
            if (isProcessingLeaves && row.length > 0) {
                if (row.every(cell => !cell)) {
                    continue;
                }
                const leave: any = {};
                leaveHeaders.forEach((header, index) => {
                    const rawValue = row[index];
                    const value = rawValue?.toString().trim() || '';
                    const h = (header ?? '').toString().trim().toLowerCase();
                    if ((h === 'from date') && (value || this.isExcelDateNumber(rawValue))) {
                        leave.fromDateBS = this.isExcelDateNumber(rawValue) ? this.convertExcelDateToBS(rawValue) : value;
                        return;
                    }
                    if ((h === 'to date') && (value || this.isExcelDateNumber(rawValue))) {
                        leave.toDateBS = this.isExcelDateNumber(rawValue) ? this.convertExcelDateToBS(rawValue) : value;
                        return;
                    }
                    if (h === 'leave type') {
                        leave.leaveType = value;
                        return;
                    }
                    if (h === 'duration') {
                        leave.duration = value;
                        return;
                    }
                    if (h === 'remarks' || h === 'remark') {
                        leave.remarks = value;
                        return;
                    }
                });
                const looksLikeHeaderEcho = ['from date', 'to date', 'leave type', 'duration', 'remarks'].every((k, idx) => (row[idx]?.toString().trim().toLowerCase() || '') === k);
                if (!looksLikeHeaderEcho && (leave.fromDateBS || leave.toDateBS || leave.leaveType || leave.duration || leave.remarks)) {
                    currentLeaves.push(leave);
                }
                continue;
            }

            // Process Reward/Punishment Details rows
            if (isProcessingRewards && row.length > 0) {
                if (row.every(cell => !cell)) {
                    continue;
                }
                const rp: any = {};
                rewardHeaders.forEach((header, index) => {
                    const rawValue = row[index];
                    const value = rawValue?.toString().trim() || '';
                    const h = (header ?? '').toString().trim().toLowerCase();
                    if ((h === 'r/p type' || h === 'rp type')) {
                        rp.rpType = value;
                        return;
                    }
                    if ((h === 'date from') && (value || this.isExcelDateNumber(rawValue))) {
                        rp.fromDateBS = this.isExcelDateNumber(rawValue) ? this.convertExcelDateToBS(rawValue) : value;
                        return;
                    }
                    if ((h === 'date to') && (value || this.isExcelDateNumber(rawValue))) {
                        rp.toDateBS = this.isExcelDateNumber(rawValue) ? this.convertExcelDateToBS(rawValue) : value;
                        return;
                    }
                    if (h === 'r/p name' || h === 'rp name') {
                        rp.rpName = value;
                        return;
                    }
                    if (h === 'reason' || h === 'remarks' || h === 'remark') {
                        rp.reason = value;
                        return;
                    }
                });
                const looksLikeHeaderEcho = ['r/p type', 'date from', 'date to', 'r/p name', 'reason'].every((k, idx) => (row[idx]?.toString().trim().toLowerCase() || '') === k);
                if (!looksLikeHeaderEcho && (rp.rpType || rp.fromDateBS || rp.toDateBS || rp.rpName || rp.reason)) {
                    currentRewards.push(rp);
                }
                continue;
            }

            // Extract name
            const nameMatch = firstCell.match(/Full Name:\s*(.+)/);
            if (nameMatch) {
                currentEmployee.name = nameMatch[1].trim();
                continue;
            }

            // Extract DOB
            const dobMatch = firstCell.match(/Date of Birth:\s*(.+?)(?:\s*\(|$)/);
            if (dobMatch) {
                currentEmployee.dob = this.parseExcelDate(dobMatch[1]);
                continue;
            }

            // Extract DOR
            const dorMatch = firstCell.match(/DOR:\s*(.+?)(?:\s*\(|$)/);
            if (dorMatch) {
                currentEmployee.dor = this.parseExcelDate(dorMatch[1]);
                continue;
            }

            // Extract Join Date
            const joinDateMatch = firstCell.match(/Join Date:\s*(.+?)(?:\s*\(|$)/);
            if (joinDateMatch) {
                currentEmployee.joinDate = this.parseExcelDate(joinDateMatch[1]);
                continue;
            }

            // Extract Perm Date
            const permDateMatch = firstCell.match(/Perm Date:\s*(.+?)(?:\s*\(|$)/);
            if (permDateMatch) {
                currentEmployee.permDate = this.parseExcelDate(permDateMatch[1]);
                continue;
            }

            // Extract gender
            const sexMatch = firstCell.match(/Sex:\s*([A-Za-z]+)/);
            if (sexMatch) {
                currentEmployeeGender = this.mapSexToGender(sexMatch[1]);
            }
        }

        // After the loop, save for the last employee
        if (currentEmployee.employeeId) {
            await this.saveAssignmentsToDatabase(currentEmployee.employeeId, currentAssignments, currentEmployeeGender);
            await this.saveAbsentsToDatabase(currentEmployee.employeeId, currentAbsents);
            await this.saveLeavesToDatabase(currentEmployee.employeeId, currentLeaves);
            await this.saveRewardsToDatabase(currentEmployee.employeeId, currentRewards);

            // Also add to employeeDetails if not already added
            if (currentAssignments.length > 0) {
                const employeeDetail: EmployeeDetailDto = {
                    employeeId: currentEmployee.employeeId,
                    name: currentEmployee.name,
                    dob: currentEmployee.dob,
                    dor: currentEmployee.dor,
                    joinDate: currentEmployee.joinDate,
                    permDate: currentEmployee.permDate,
                    assignments: [...currentAssignments],
                    absents: [...currentAbsents],
                    leaves: [...currentLeaves],
                    rewardsPunishments: [...currentRewards]
                };
                employeeDetails.push(employeeDetail);
            }
        }

        return employeeDetails;
    }

    /**
     * Save assignments to database for an employee
     */
    private async saveAssignmentsToDatabase(employeeId: string, assignments: AssignmentDetailDto[], gender: 'male' | 'female' | null): Promise<void> {
        if (!assignments || assignments.length === 0) {
            return;
        }

        // Find the employee in the database
        const employee = await this.employeeRepository.findOne({
            where: { employeeId: parseInt(employeeId, 10) }
        });

        if (!employee) {
            console.error(`Employee not found in database for employeeId=${employeeId}`);
            return;
        }

        // Calculate geographical marks for all assignments
        await this.calculateGeographicalMarksForAssignmentsAsync(assignments, gender);

        for (const assignmentDto of assignments) {
            // Check if assignment already exists
            const whereCondition: any = {
                employeeId: employee.employeeId,
                startDateBS: assignmentDto.startDateBS
            };
            if (assignmentDto.endDateBS) {
                whereCondition.endDateBS = assignmentDto.endDateBS;
            } else {
                whereCondition.endDateBS = null;
            }
            const exists = await this.assignmentDetailRepository.findOne({
                where: whereCondition
            });
            if (exists) {
                continue;
            }
            try {
                const assignment = this.assignmentDetailRepository.create({
                    ...assignmentDto,
                    employeeId: employee.employeeId,
                    employee: employee
                });
                await this.assignmentDetailRepository.save(assignment);
            } catch (error) {
                console.error(`Error saving assignment for employeeId=${employee.employeeId}, startDateBS=${assignmentDto.startDateBS}, endDateBS=${assignmentDto.endDateBS}: ${error.message}`);
            }
        }

        // Update employee level based on current/latest assignment
        try {
            // Prefer assignment with no endDateBS (current assignment)
            const currentAssignment = assignments.find(a => !a.endDateBS);
            const fallbackAssignment = assignments[assignments.length - 1];
            const derivedLevel = currentAssignment?.level ?? fallbackAssignment?.level ?? employee.level ?? 0;
            if (typeof derivedLevel === 'number' && derivedLevel !== employee.level) {
                employee.level = derivedLevel;
                await this.employeeRepository.save(employee);
            }
        } catch (e) {
            console.error(`Failed to update employee level for employeeId=${employee.employeeId}: ${e?.message || e}`);
        }
    }

    /**
     * Save absent rows for an employee
     */
    private async saveAbsentsToDatabase(employeeId: string, absents: any[]): Promise<void> {
        if (!Array.isArray(absents) || absents.length === 0) return;
        const idNum = parseInt(employeeId, 10);
        for (const a of absents) {
            try {
                const entity = this.absentDetailRepository.create({
                    employeeId: idNum,
                    fromDateBS: a.fromDateBS || null,
                    toDateBS: a.toDateBS || null,
                    duration: a.duration || null,
                    remarks: a.remarks || null,
                });
                await this.absentDetailRepository.save(entity);
            } catch (e) {
                console.error(`Failed saving absent for employeeId=${employeeId}: ${e?.message || e}`);
            }
        }
    }

    /**
     * Save leave rows for an employee
     */
    private async saveLeavesToDatabase(employeeId: string, leaves: any[]): Promise<void> {
        if (!Array.isArray(leaves) || leaves.length === 0) return;
        const idNum = parseInt(employeeId, 10);
        for (const l of leaves) {
            try {
                const entity = this.leaveDetailRepository.create({
                    employeeId: idNum,
                    fromDateBS: l.fromDateBS || null,
                    toDateBS: l.toDateBS || null,
                    leaveType: l.leaveType || null,
                    duration: l.duration || null,
                    remarks: l.remarks || null,
                });
                await this.leaveDetailRepository.save(entity);
            } catch (e) {
                console.error(`Failed saving leave for employeeId=${employeeId}: ${e?.message || e}`);
            }
        }
    }

    /**
     * Save reward/punishment rows for an employee
     */
    private async saveRewardsToDatabase(employeeId: string, rewards: any[]): Promise<void> {
        if (!Array.isArray(rewards) || rewards.length === 0) return;
        const idNum = parseInt(employeeId, 10);
        for (const r of rewards) {
            try {
                const entity = this.rewardPunishmentDetailRepository.create({
                    employeeId: idNum,
                    rpType: r.rpType || null,
                    fromDateBS: r.fromDateBS || null,
                    toDateBS: r.toDateBS || null,
                    rpName: r.rpName || null,
                    reason: r.reason || null,
                });
                await this.rewardPunishmentDetailRepository.save(entity);
            } catch (e) {
                console.error(`Failed saving reward/punishment for employeeId=${employeeId}: ${e?.message || e}`);
            }
        }
    }

    /**
     * Convert Excel date number to BS date string
     * For BS dates stored as Excel serial numbers, we need to treat the converted date as BS directly
     * Example: Excel number 57570 converts to 2057-08-13, which should be treated as BS 2057-08-13
     */
    private convertExcelDateToBS(excelDateNumber: string | number): string {
        if (!excelDateNumber) return '';

        const excelNum = typeof excelDateNumber === 'string' ? parseFloat(excelDateNumber) : excelDateNumber;

        if (isNaN(excelNum) || excelNum <= 0) return '';

        try {
            // Excel date numbers represent days since 1900-01-01
            // Excel incorrectly treats 1900 as a leap year, so we need to adjust
            // For dates after 1900-02-28, subtract 1 day
            let adjustedDays = excelNum - 1; // Excel day 1 is 1900-01-01

            // Excel's leap year bug: it treats 1900 as a leap year when it's not
            // So for dates after 1900-02-28, we need to subtract 1 more day
            if (excelNum > 59) { // 1900-02-28 is day 59 in Excel
                adjustedDays -= 1;
            }

            // Convert to JavaScript Date
            const excelEpoch = new Date(1900, 0, 1); // 1900-01-01
            const targetDate = new Date(excelEpoch.getTime() + adjustedDays * 24 * 60 * 60 * 1000);

            // For BS dates, we treat the converted date as BS directly
            // Extract year, month, and day from the converted date
            const year = targetDate.getFullYear();
            const month = targetDate.getMonth() + 1; // getMonth() returns 0-11
            const day = targetDate.getDate();

            // Format as BS date string (YYYY-MM-DD)
            const bsDateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

            return bsDateString;
        } catch (error) {
            console.log(`Error converting Excel date ${excelDateNumber} to BS date: ${error}`);
            return '';
        }
    }

    /**
     * Check if a value is an Excel date number
     */
    private isExcelDateNumber(value: any): boolean {
        if (value === null || value === undefined) return false;

        const num = typeof value === 'string' ? parseFloat(value) : value;
        const isNumber = !isNaN(num) && typeof num === 'number';

        // Excel date numbers (serials) commonly appear as 5-digit integers.
        // Widen the acceptable range to include late 20th century through far future.
        // 25569 => 1970-01-01, 36526 => 2000-01-01, 73050 => 2100-01-01
        // We accept roughly 20000..120000 to capture older dates like 1990s (e.g., 35993) as well.
        const isInExcelDateRange = isNumber && num >= 20000 && num <= 120000;

        return isInExcelDateRange;
    }

    /**
     * Normalize a value to a BS date string (YYYY-MM-DD) if possible.
     * - Excel serial -> treat as BS and convert via convertExcelDateToBS
     * - Valid BS string -> normalize separators to '-'
     * - ISO AD date -> convert to BS using formatBS
     */
    public async normalizeBsDateValue(value: any): Promise<string> {
        if (value === null || value === undefined) return '';
        const raw = typeof value === 'string' ? value.trim() : String(value);
        if (!raw) return '';

        // Ignore obvious header echoes
        const lowered = raw.toLowerCase();
        if (['from date', 'to date', 'date from', 'date to'].includes(lowered)) return '';

        // Excel serial treated as BS directly
        if (this.isExcelDateNumber(raw)) {
            return this.convertExcelDateToBS(raw).replace(/\//g, '-');
        }

        // If looks like AD ISO date, convert to BS first (to avoid misclassifying as BS)
        const adLike = raw.replace(/\//g, '-');
        const adDate = new Date(adLike);
        if (!isNaN(adDate.getTime())) {
            try {
                const bs = await formatBS(adDate);
                return (bs || '').replace(/\//g, '-');
            } catch { /* fallthrough */ }
        }

        // If looks like BS and validates, normalize
        const maybeBs = raw.replace(/\./g, '-').replace(/\//g, '/');
        if (this.isValidBSDate(maybeBs)) {
            return maybeBs.replace(/\//g, '-');
        }

        return raw; // fallback
    }

    public async calculateGeographicalMarksForAssignmentsAsync(assignments: AssignmentDetailDto[], gender: 'male' | 'female' | null): Promise<void> {
        for (let i = 0; i < assignments.length; i++) {
            const assignment = assignments[i];
            const previousAssignment = i > 0 ? assignments[i - 1] : undefined;
            const geoMarksResult = await this.calculateGeographicalMarks(assignment, gender, previousAssignment);
            assignment.totalGeographicalMarks = geoMarksResult.totalGeographicalMarks;
            assignment.numDaysOld = geoMarksResult.numDaysOld;
            assignment.numDaysNew = geoMarksResult.numDaysNew;
            assignment.totalNumDays = geoMarksResult.totalNumDays;
        }
    }

    private async getGeographicalMarks(workOffice: string, gender: 'male' | 'female' | null = null, dateType: 'old' | 'new' = 'new'): Promise<number> {
        // 1. Find the office to get the district
        const office = await this.officeRepository.findOne({ where: { name: workOffice } });
        if (!office) return 1; // fallback
        // 2. Find the district to get the category
        const district = await this.districtRepository.findOne({ where: { name: office.district } });
        if (!district) return 1; // fallback
        // 3. Find the marks for the category
        let marks: CategoryMarks | undefined | null;
        if (dateType === 'old') {
            marks = await this.categoryMarksRepository.findOne({ where: { category: district.category, type: 'old', gender: gender ?? 'male' } });
            if (!marks && gender === 'female') {
                // fallback to male if not found for female
                marks = await this.categoryMarksRepository.findOne({ where: { category: district.category, type: 'old', gender: 'male' } });
            }
        } else {
            marks = await this.categoryMarksRepository.findOne({ where: { category: district.category, type: 'new' } });
        }
        return marks && typeof marks.marks === 'number' ? marks.marks : 1;
    }

    private mapSexToGender(sex: string): 'male' | 'female' | null {
        if (sex === 'Male') return 'male';
        if (sex === 'Female') return 'female';
        return null;
    }

    async getServiceDetail(): Promise<EmployeeServiceDetailResponseDto> {
        const employees = await this.employeeRepository.find({
            relations: ['qualifications']
        });

        return {
            employees,
            totalCount: employees.length
        };
    }

    async getEmployeeBasicDetails(employeeId: number): Promise<EmployeeBasicDetailsDto | null> {
        const employee = await this.employeeRepository.findOne({ where: { employeeId } });
        if (!employee) return null;

        const rawPosition = employee.position || '';
        let group = '';
        let position = rawPosition;
        const parts = rawPosition.split('.');
        if (parts.length >= 2 && parts[0] && parts[1]) {
            group = parts[0];
            position = parts.slice(1).join('.');
        }

        const dobStr = employee.dob ? new Date(employee.dob).toISOString().split('T')[0] : '';

        return {
            employeeId: employee.employeeId,
            name: employee.name,
            level: employee.level,
            workingOffice: employee.workingOffice,
            position,
            dob: dobStr,
            group,
        };
    }

    async getEmployeeSeniorityData(employeeId: number, endDateBS?: string): Promise<EmployeeSeniorityDataDto | null> {
        const employee = await this.employeeRepository.findOne({ where: { employeeId } });
        if (!employee || !employee.seniorityDate) return null;

        // Compute in BS; normalize input
        const startBS = await formatBS(new Date(employee.seniorityDate));

        let endBS: string | undefined;
        if (endDateBS && endDateBS.trim()) {
            // Validate BS format using existing helpers
            const normalized = endDateBS.replace(/-/g, '/');
            if (!this.isValidBSDate(normalized)) {
                throw new BadRequestException('Invalid endDateBS');
            }
            // Ensure end >= start
            const startNd = this.parseBSDate(startBS.replace(/-/g, '/'));
            const endNd = this.parseBSDate(normalized);
            if (!startNd || !endNd) {
                throw new BadRequestException('Invalid BS date inputs');
            }
            const startAD = startNd.getDateObject();
            const endAD = endNd.getDateObject();
            if (endAD.getTime() < startAD.getTime()) {
                throw new BadRequestException('endDateBS must be on or after seniorityDateBS');
            }
            endBS = normalized;
        }

        const { years, months, days } = await diffNepaliYMD(startBS, endBS ?? new Date());
        const effectiveReturnEndBS = endBS ? endBS.replace(/\//g, '-') : await formatBS(new Date());
        return {
            seniorityDateBS: startBS,
            endDateBS: effectiveReturnEndBS,
            years,
            months,
            days
        };

    }
} 