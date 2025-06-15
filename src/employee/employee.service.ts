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
    constructor(
        @InjectRepository(Employee)
        private employeeRepository: Repository<Employee>,
        @InjectRepository(Qualification)
        private qualificationRepository: Repository<Qualification>,
    ) { }

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

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!Array.isArray(row) || row.length === 0) continue;

            const firstCell = row[0]?.toString().trim() || '';

            // Extract employee ID
            const employeeIdMatch = firstCell.match(/Employee No:\s*(\d+)/);
            if (employeeIdMatch) {
                if (Object.keys(currentEmployee).length > 0 && currentEmployee.employeeId) {
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
                    console.log('Adding employee with assignments:', employeeDetail); // Debug log
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
                        console.log('Assignment Headers:', assignmentHeaders); // Debug log
                    }
                }
                i += 2; // Skip header row
                continue;
            }

            // Check for end of assignments section
            if (firstCell === 'Qualification Details:') {
                isProcessingAssignments = false;
                if (currentEmployee.employeeId) {
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
                    console.log('Adding employee with assignments:', employeeDetail); // Debug log
                }
                currentAssignments = [];
                continue;
            }

            // Process assignment data
            if (isProcessingAssignments && row.length > 0) {
                // Skip empty rows or rows without enough data
                if (row.every(cell => !cell)) continue;

                const assignment: Partial<AssignmentDetailDto> = {
                    id: crypto.randomUUID(),
                    employeeId: parseInt(currentEmployee.employeeId || '0')
                };

                // Map the columns based on headers
                assignmentHeaders.forEach((header, index) => {
                    const value = row[index]?.toString() || '';
                    if (!value) return; // Skip empty values

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
                            assignment.startDateBS = value;
                            break;
                        case 'End Date BS':
                            assignment.endDateBS = value;
                            break;
                        case 'Seniority Date BS':
                            assignment.seniorityDateBS = value;
                            break;
                        case 'Level':
                            assignment.level = parseInt(value) || 0;
                            break;
                        case 'Perm. Level Date BS':
                            assignment.permLevelDateBS = value;
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

                // Only add assignment if it has more than just id and employeeId
                if (Object.keys(assignment).length > 2) {
                    console.log('Adding assignment:', assignment); // Debug log
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
        }

        // Add the last employee if exists
        if (Object.keys(currentEmployee).length > 0 && currentEmployee.employeeId) {
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
            console.log('Adding final employee with assignments:', employeeDetail); // Debug log
        }

        return employeeDetails;
    }
} 