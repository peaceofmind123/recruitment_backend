import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, Sex } from './entities/employee.entity';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

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

            // Check if employee exists
            let employee = await this.employeeRepository.findOne({
                where: { employeeId: row['EmpNo'] }
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

            try {
                await this.employeeRepository.save(employee);
            } catch (error) {
                console.error(`Error saving employee ${row['EmpNo']}:`, error);
                throw error;
            }
        }
    }
} 