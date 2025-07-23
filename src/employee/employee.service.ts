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
const NepaliDate = require('nepali-datetime');

interface ExcelRow {
    'EmpNo': number;
    'Full Name': string;
    'Date Of Birth': string;
    'Seniority Date': string;
    'Level No': number;
    'Sex': Sex;
    'Qualification': string;
    'Work Office': string;
}

@Injectable()
export class EmployeeService {
    private logFile: string;

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
        // Create logs directory if it doesn't exist
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        // Create log file with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.logFile = path.join(logsDir, `employee-upload-${timestamp}.log`);

        // Initialize log file
        this.writeLog('=== EMPLOYEE UPLOAD DEBUG LOG START ===');
    }

    /**
     * Write log message to file
     */
    private writeLog(message: string): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;

        try {
            fs.appendFileSync(this.logFile, logMessage);
        } catch (error) {
            console.error('Error writing to log file:', error);
        }

        // Also output to console for immediate feedback
        console.log(message);
    }

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
                console.warn(`Skipping row for employee ${row['EmpNo']} due to invalid dates`);
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
            employee.level = row['Level No'] || 0;
            employee.sex = row['Sex'] || Sex.U;
            employee.education = row['Qualification'] || '';
            employee.workingOffice = row['Work Office'] || '';
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
        this.writeLog(`Calculating geographical marks for assignment employeeId=${assignment.employeeId}, startDateBS=${assignment.startDateBS}, endDateBS=${assignment.endDateBS}`);
        this.writeLog(`  startDateBS: ${assignment.startDateBS}`);
        this.writeLog(`  endDateBS: ${assignment.endDateBS}`);
        this.writeLog(`  workOffice: ${assignment.workOffice}`);

        if (!assignment.startDateBS || !assignment.endDateBS) {
            this.writeLog('  Missing startDateBS or endDateBS, returning 0 marks');
            return {
                totalGeographicalMarks: 0,
                numDaysOld: 0,
                numDaysNew: 0,
                totalNumDays: 0
            };
        }

        // Validate BS dates
        if (!this.isValidBSDate(assignment.startDateBS) || !this.isValidBSDate(assignment.endDateBS)) {
            this.writeLog(`Invalid BS date format for assignment employeeId=${assignment.employeeId}, startDateBS=${assignment.startDateBS}, endDateBS=${assignment.endDateBS}`);
            return {
                totalGeographicalMarks: 0,
                numDaysOld: 0,
                numDaysNew: 0,
                totalNumDays: 0
            };
        }

        // Calculate total number of days
        const totalNumDays = this.calculateDaysBetweenBSDates(assignment.startDateBS, assignment.endDateBS);
        this.writeLog(`  totalNumDays: ${totalNumDays}`);

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

                this.writeLog(`  startDateAD: ${startDateAD.toISOString()}`);
                this.writeLog(`  endDateAD: ${endDateAD.toISOString()}`);
                this.writeLog(`  cutoffDateAD: ${cutoffDateAD.toISOString()}`);

                // If assignment starts before cutoff and ends after cutoff
                if (startDateAD < cutoffDateAD && endDateAD > cutoffDateAD) {
                    numDaysOld = this.calculateDaysBetweenBSDates(assignment.startDateBS, cutoffDate);
                    numDaysNew = this.calculateDaysBetweenBSDates(cutoffDate, assignment.endDateBS);
                    this.writeLog(`  Assignment spans cutoff date: numDaysOld=${numDaysOld}, numDaysNew=${numDaysNew}`);
                }
                // If assignment is entirely before cutoff
                else if (endDateAD <= cutoffDateAD) {
                    numDaysOld = totalNumDays;
                    numDaysNew = 0;
                    this.writeLog(`  Assignment entirely before cutoff: numDaysOld=${numDaysOld}, numDaysNew=${numDaysNew}`);
                }
                // If assignment is entirely after cutoff
                else if (startDateAD >= cutoffDateAD) {
                    numDaysOld = 0;
                    numDaysNew = totalNumDays;
                    this.writeLog(`  Assignment entirely after cutoff: numDaysOld=${numDaysOld}, numDaysNew=${numDaysNew}`);
                }
            } catch (error) {
                this.writeLog(`Error processing date comparison: ${error}`);
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
                    this.writeLog(`  Spans cutoff: marksOld=${marksOld}, marksNew=${marksNew}, total=${totalGeographicalMarks}`);
                } else {
                    // If assignment is entirely before or after cutoff date
                    // Use marksAccNew(totalNumDays)
                    totalGeographicalMarks = await this.marksAccNew(totalNumDays, presentDays, assignment.workOffice, gender);
                    this.writeLog(`  Before/after cutoff: marksNew=${totalGeographicalMarks}`);
                }
            } catch (error) {
                this.writeLog(`Error in geographical marks calculation: ${error}`);
                // Fallback to simple calculation
                totalGeographicalMarks = await this.marksAccNew(totalNumDays, presentDays, assignment.workOffice, gender);
            }
        } else {
            // Fallback if date parsing fails
            totalGeographicalMarks = await this.marksAccNew(totalNumDays, presentDays, assignment.workOffice, gender);
        }

        this.writeLog(`  Final result: totalGeographicalMarks=${totalGeographicalMarks}`);

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

        this.writeLog('=== EXCEL DATA DEBUG ===');
        this.writeLog(`Sheet names: ${JSON.stringify(workbook.SheetNames)}`);
        this.writeLog('First 10 rows of data:');
        for (let i = 0; i < Math.min(10, data.length); i++) {
            this.writeLog(`Row ${i}: ${JSON.stringify(data[i])}`);
        }
        this.writeLog('=== END EXCEL DATA DEBUG ===');

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
                this.writeLog(`Found employee ID: ${employeeIdMatch[1]}`);
                if (Object.keys(currentEmployee).length > 0 && currentEmployee.employeeId) {
                    // Calculate geographical marks for all assignments
                    await this.calculateGeographicalMarksForAssignmentsAsync(currentAssignments, currentEmployeeGender);

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
                    this.writeLog(`Adding employee with assignments: ${JSON.stringify(employeeDetail)}`);
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
                this.writeLog('Found Assignment Details section');
                isProcessingAssignments = true;
                // Get headers from next row
                if (i + 1 < data.length) {
                    const headerRow = data[i + 1];
                    if (Array.isArray(headerRow)) {
                        assignmentHeaders = headerRow.map(h => h?.toString() || '');
                        this.writeLog(`Assignment Headers: ${JSON.stringify(assignmentHeaders)}`);
                    }
                }
                i += 2; // Skip header row
                continue;
            }

            // Check for end of assignments section
            if (firstCell === 'Qualification Details:') {
                this.writeLog('Found Qualification Details section - ending assignments');
                isProcessingAssignments = false;
                if (currentEmployee.employeeId) {
                    // Calculate geographical marks for all assignments
                    await this.calculateGeographicalMarksForAssignmentsAsync(currentAssignments, currentEmployeeGender);

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
                    this.writeLog(`Adding employee with assignments: ${JSON.stringify(employeeDetail)}`);
                }
                currentAssignments = [];
                continue;
            }

            // Process assignment data
            if (isProcessingAssignments && row.length > 0) {
                this.writeLog(`Processing assignment row ${i}: ${JSON.stringify(row)}`);
                // Skip empty rows or rows without enough data
                if (row.every(cell => !cell)) {
                    this.writeLog('Skipping empty row');
                    continue;
                }

                const assignment: Partial<AssignmentDetailDto> = {
                    employeeId: parseInt(currentEmployee.employeeId || '0'),
                };

                // Map the columns based on headers
                assignmentHeaders.forEach((header, index) => {
                    const rawValue = row[index];
                    const value = rawValue?.toString() || '';

                    this.writeLog(`Processing header "${header}" at index ${index}: rawValue=${rawValue}, value="${value}"`);

                    // Don't skip empty values for date fields as they might be Excel date numbers
                    if (!value && !this.isExcelDateNumber(rawValue)) return;

                    switch (header) {
                        case 'Position':
                            assignment.position = value;
                            break;
                        case 'Jobs':
                            assignment.jobs = value;
                            break;
                        case 'Function':
                            assignment.function = value;
                            break;
                        case 'Emp. Category':
                            assignment.empCategory = value;
                            break;
                        case 'Emp. Type':
                            assignment.empType = value;
                            break;
                        case 'Work Office':
                            assignment.workOffice = value;
                            break;
                        case 'Start Date BS':
                            if (this.isExcelDateNumber(rawValue)) {
                                assignment.startDateBS = this.convertExcelDateToBS(rawValue);
                                this.writeLog(`Converted Start Date BS: ${rawValue} -> ${assignment.startDateBS}`);
                            } else {
                                assignment.startDateBS = value;
                                this.writeLog(`Using Start Date BS as-is: ${value}`);
                            }
                            break;
                        case 'End Date BS':
                            if (this.isExcelDateNumber(rawValue)) {
                                assignment.endDateBS = this.convertExcelDateToBS(rawValue);
                                this.writeLog(`Converted End Date BS: ${rawValue} -> ${assignment.endDateBS}`);
                            } else {
                                assignment.endDateBS = value;
                                this.writeLog(`Using End Date BS as-is: ${value}`);
                            }
                            break;
                        case 'Seniority Date BS':
                            if (this.isExcelDateNumber(rawValue)) {
                                assignment.seniorityDateBS = this.convertExcelDateToBS(rawValue);
                                this.writeLog(`Converted Seniority Date BS: ${rawValue} -> ${assignment.seniorityDateBS}`);
                            } else {
                                assignment.seniorityDateBS = value;
                                this.writeLog(`Using Seniority Date BS as-is: ${value}`);
                            }
                            break;
                        case 'Level':
                            assignment.level = parseInt(value) || 0;
                            break;
                        case 'Perm. Level Date BS':
                            if (this.isExcelDateNumber(rawValue)) {
                                assignment.permLevelDateBS = this.convertExcelDateToBS(rawValue);
                                this.writeLog(`Converted Perm Level Date BS: ${rawValue} -> ${assignment.permLevelDateBS}`);
                            } else {
                                assignment.permLevelDateBS = value;
                                this.writeLog(`Using Perm Level Date BS as-is: ${value}`);
                            }
                            break;
                        case 'Reason':
                            assignment.reasonForPosition = value;
                            break;
                        case 'Start Date':
                            const startDate = this.parseExcelDate(value);
                            assignment.startDate = startDate ? new Date(startDate) : undefined;
                            break;
                        case 'Seniority Date':
                            const seniorityDate = this.parseExcelDate(value);
                            assignment.seniorityDate = seniorityDate ? new Date(seniorityDate) : undefined;
                            break;
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
                // Only add assignment if it has more than just employeeId and has startDateBS and endDateBS
                if (
                    Object.keys(assignment).length > 2 &&
                    assignment.startDateBS &&
                    assignment.endDateBS
                ) {
                    this.writeLog(`Adding assignment: ${JSON.stringify(assignment)}`);
                    currentAssignments.push(assignment as AssignmentDetailDto);
                } else {
                    this.writeLog(`Skipping assignment - not enough data: ${JSON.stringify(assignment)}`);
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
        if (currentEmployee.employeeId && currentAssignments.length > 0) {
            // Find the employee in the database
            const employee = await this.employeeRepository.findOne({ where: { employeeId: parseInt(currentEmployee.employeeId as string, 10) } });
            if (employee) {
                let attempted = 0;
                let saved = 0;
                for (const assignmentDto of currentAssignments) {
                    const exists = await this.assignmentDetailRepository.findOne({
                        where: {
                            employeeId: employee.employeeId,
                            startDateBS: assignmentDto.startDateBS,
                            endDateBS: assignmentDto.endDateBS
                        }
                    });
                    if (exists) {
                        this.writeLog(`Duplicate assignment found for employeeId=${employee.employeeId}, startDateBS=${assignmentDto.startDateBS}, endDateBS=${assignmentDto.endDateBS}. Skipping assignment.`);
                        continue;
                    }
                    attempted++;
                    this.writeLog(`Attempting to save assignment: ${JSON.stringify(assignmentDto)}`);
                    try {
                        const assignment = this.assignmentDetailRepository.create({
                            ...assignmentDto,
                            employeeId: employee.employeeId,
                            employee: employee
                        });
                        await this.assignmentDetailRepository.save(assignment);
                        saved++;
                        this.writeLog(`Successfully saved assignment for employeeId=${employee.employeeId}, startDateBS=${assignmentDto.startDateBS}, endDateBS=${assignmentDto.endDateBS}`);
                    } catch (error) {
                        this.writeLog(`Error saving assignment for employeeId=${employee.employeeId}, startDateBS=${assignmentDto.startDateBS}, endDateBS=${assignmentDto.endDateBS}: ${error.message}`);
                    }
                }
                this.writeLog(`Summary for employeeId=${employee.employeeId}: attempted=${attempted}, saved=${saved}`);
            }
        }

        this.writeLog('=== EMPLOYEE UPLOAD DEBUG LOG END ===');

        // Persist assignments for existing employees only, skip empty assignments
        // (Already handled above, so this block is no longer needed)
        // for (const empDetail of employeeDetails) {
        //     if (!empDetail.assignments || empDetail.assignments.length === 0) {
        //         continue; // Skip records with empty assignments
        //     }
        //     const employee = await this.employeeRepository.findOne({ where: { employeeId: parseInt(empDetail.employeeId as string, 10) } });
        //     if (!employee) {
        //         continue; // Only process if employee exists
        //     }
        //     for (const assignmentDto of empDetail.assignments) {
        //         // Create and save AssignmentDetail entity
        //         const assignment = this.assignmentDetailRepository.create({
        //             ...assignmentDto,
        //             employeeId: employee.employeeId,
        //             employee: employee
        //         });
        //         await this.assignmentDetailRepository.save(assignment);
        //     }
        // }
        return employeeDetails;
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

            this.writeLog(`Excel date ${excelDateNumber} converted to BS date: ${bsDateString} (treating as BS directly)`);

            return bsDateString;
        } catch (error) {
            this.writeLog(`Error converting Excel date ${excelDateNumber} to BS date: ${error}`);
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

        this.writeLog(`isExcelDateNumber check: value=${value}, num=${num}, isNumber=${isNumber}, isInExcelDateRange=${isInExcelDateRange}`);

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
} 