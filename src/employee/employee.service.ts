import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, Sex } from './entities/employee.entity';
import { Qualification } from '../vacancy/entities/qualification.entity';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { FilterByEmployeeIdDto } from './dto/filter-by-employee-id.dto';
import { In } from 'typeorm';
import { EmployeeDetailDto } from './dto/employee-detail.dto';
import { AssignmentDetailDto } from './dto/assignment-detail.dto';
import * as crypto from 'crypto';
import { Office } from '../common/entities/office.entity';
import { District } from '../common/entities/district.entity';
import { CategoryMarks } from '../common/entities/category-marks.entity';
import { AssignmentDetail } from './entities/assignment-detail.entity';
import { EmployeeServiceDetailResponseDto } from './dto/employee-detail-response.dto';
import { EmployeeBasicDetailsDto } from './dto/employee-basic-details.dto';
import { EmployeeSeniorityDataDto } from './dto/employee-seniority-data.dto';
import { diffNepaliYMD, formatBS } from '../common/utils/nepali-date.utils';
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
    ) {
        // Removed log file setup
    }

    // Removed writeLog method

    private parseDate(dateStr: string): Date | undefined {
        if (!dateStr) return undefined;

        // Try parsing as Excel date (number of days since 1900-01-01)
        const excelDate = Number(dateStr);
        if (!isNaN(excelDate)) {
            // Convert Excel date to JavaScript date
            const millisecondsPerDay = 24 * 60 * 60 * 1000;
            const excelEpoch = new Date(1900, 0, 1);
            return new Date(excelEpoch.getTime() + (excelDate - 1) * millisecondsPerDay);
        }

        // Try parsing as regular date string
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

    async getEmployeeAssignments(employeeId: number): Promise<AssignmentDetail[]> {
        return this.assignmentDetailRepository.find({
            where: { employeeId },
            order: { startDateBS: 'ASC' }
        });
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
     * Expected format: "2079/03/31" or "2079-03/31"
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
     * Calculate marks for old system (before 2079/03/31)
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
     * Calculate marks for new system (after 2079/03/31)
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

        // Calculate days in old system (before 2079/03/31)
        let numDaysOld = 0;
        let numDaysNew = 0;

        const cutoffDate = '2079/03/31';
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

                    // Create a new object to ensure all properties are included
                    const employeeDetail: EmployeeDetailDto = {
                        employeeId: currentEmployee.employeeId,
                        name: currentEmployee.name,
                        dob: currentEmployee.dob,
                        dor: currentEmployee.dor,
                        joinDate: currentEmployee.joinDate,
                        permDate: currentEmployee.permDate,
                        assignments: [...currentAssignments] // Create a new array with all assignments
                    };
                    employeeDetails.push(employeeDetail);
                }
                currentEmployee = {
                    employeeId: employeeIdMatch[1],
                    assignments: []
                };
                currentAssignments = [];
                isProcessingAssignments = false;
                continue;
            }

            // Check for Assignment Details section
            if (firstCell === 'Assignment Details:') {
                isProcessingAssignments = true;
                // Get headers from next row
                if (i + 1 < data.length) {
                    const headerRow = data[i + 1];
                    if (Array.isArray(headerRow)) {
                        assignmentHeaders = headerRow.map(h => h?.toString() || '');
                    }
                }
                i += 2; // Skip header row
                continue;
            }

            // Check for end of assignments section
            if (firstCell === 'Qualification Details:') {
                isProcessingAssignments = false;
                if (currentEmployee.employeeId) {
                    // Save assignments to database
                    await this.saveAssignmentsToDatabase(currentEmployee.employeeId, currentAssignments, currentEmployeeGender);

                    // Create a new object to ensure all properties are included
                    const employeeDetail: EmployeeDetailDto = {
                        employeeId: currentEmployee.employeeId,
                        name: currentEmployee.name,
                        dob: currentEmployee.dob,
                        dor: currentEmployee.dor,
                        joinDate: currentEmployee.joinDate,
                        permDate: currentEmployee.permDate,
                        assignments: [...currentAssignments] // Create a new array with all assignments
                    };
                    employeeDetails.push(employeeDetail);
                }
                currentAssignments = [];
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
                // Only add assignment if it has more than just employeeId and has startDateBS
                // Note: endDateBS can be null/undefined for current assignments
                if (
                    Object.keys(assignment).length > 2 &&
                    assignment.startDateBS
                ) {
                    currentAssignments.push(assignment as AssignmentDetailDto);
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

            // Also add to employeeDetails if not already added
            if (currentAssignments.length > 0) {
                const employeeDetail: EmployeeDetailDto = {
                    employeeId: currentEmployee.employeeId,
                    name: currentEmployee.name,
                    dob: currentEmployee.dob,
                    dor: currentEmployee.dor,
                    joinDate: currentEmployee.joinDate,
                    permDate: currentEmployee.permDate,
                    assignments: [...currentAssignments]
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

        // Excel date numbers are typically between 1 and 100000
        // For BS dates, we're looking for numbers that would convert to years around 2000-2100
        // Excel number 36526 converts to 2000-01-01, and 73050 converts to 2100-01-01
        const isInExcelDateRange = isNumber && num >= 36526 && num <= 73050;

        return isInExcelDateRange;
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

    async getEmployeeSeniorityData(employeeId: number): Promise<EmployeeSeniorityDataDto | null> {
        const employee = await this.employeeRepository.findOne({ where: { employeeId } });
        if (!employee || !employee.seniorityDate) return null;

        const { years, months, days } = await diffNepaliYMD(new Date(employee.seniorityDate));
        return {
            seniorityDateBS: await formatBS(new Date(employee.seniorityDate)),
            years,
            months,
            days
        };

    }
} 