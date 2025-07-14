import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeService } from './employee.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Employee, Sex } from './entities/employee.entity';
import { Qualification } from '../vacancy/entities/qualification.entity';
import { Office } from '../common/entities/office.entity';
import { District } from '../common/entities/district.entity';
import { CategoryMarks } from '../common/entities/category-marks.entity';
import { Repository } from 'typeorm';
import { FilterByEmployeeIdDto } from './dto/filter-by-employee-id.dto';
import { EmployeeDetailDto } from './dto/employee-detail.dto';
import { AssignmentDetailDto } from './dto/assignment-detail.dto';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('xlsx');

// Mock NepaliDate
const mockNepaliDate = jest.fn().mockImplementation((y, m, d) => ({
    getDateObject: () => new Date(2022, 2, 31),
    format: () => `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
}));
global['NepaliDate'] = mockNepaliDate;

const mockEmployeeRepo = () => ({
    findOne: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
});
const mockQualificationRepo = () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
});
const mockOfficeRepo = () => ({ findOne: jest.fn() });
const mockDistrictRepo = () => ({ findOne: jest.fn() });
const mockCategoryMarksRepo = () => ({ findOne: jest.fn() });

describe('EmployeeService', () => {
    let service: EmployeeService;
    let employeeRepo: ReturnType<typeof mockEmployeeRepo>;
    let qualificationRepo: ReturnType<typeof mockQualificationRepo>;
    let officeRepo: ReturnType<typeof mockOfficeRepo>;
    let districtRepo: ReturnType<typeof mockDistrictRepo>;
    let categoryMarksRepo: ReturnType<typeof mockCategoryMarksRepo>;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EmployeeService,
                { provide: getRepositoryToken(Employee), useFactory: mockEmployeeRepo },
                { provide: getRepositoryToken(Qualification), useFactory: mockQualificationRepo },
                { provide: getRepositoryToken(Office), useFactory: mockOfficeRepo },
                { provide: getRepositoryToken(District), useFactory: mockDistrictRepo },
                { provide: getRepositoryToken(CategoryMarks), useFactory: mockCategoryMarksRepo },
            ],
        }).compile();
        service = module.get<EmployeeService>(EmployeeService);
        employeeRepo = module.get(getRepositoryToken(Employee));
        qualificationRepo = module.get(getRepositoryToken(Qualification));
        officeRepo = module.get(getRepositoryToken(Office));
        districtRepo = module.get(getRepositoryToken(District));
        categoryMarksRepo = module.get(getRepositoryToken(CategoryMarks));
    });

    describe('parseDate', () => {
        it('should parse Excel date number', () => {
            const date = service['parseDate']('43831');
            expect(date).toBeInstanceOf(Date);
        });
        it('should parse ISO date string', () => {
            const date = service['parseDate']('2020-01-01');
            expect(date).toBeInstanceOf(Date);
        });
        it('should return undefined for invalid date', () => {
            expect(service['parseDate']('invalid')).toBeUndefined();
        });
    });

    describe('extractAndSaveQualifications', () => {
        it('should split, create, and save unique qualifications', async () => {
            qualificationRepo.findOne.mockResolvedValueOnce(null);
            qualificationRepo.create.mockReturnValueOnce({ qualification: 'BSc' });
            qualificationRepo.save.mockResolvedValueOnce({ qualification: 'BSc' });
            const result = await service['extractAndSaveQualifications']('BSc - Science|BSc - Math');
            expect(result).toEqual([{ qualification: 'BSc' }]);
        });
        it('should skip duplicates and handle existing', async () => {
            qualificationRepo.findOne.mockResolvedValueOnce({ qualification: 'BSc' });
            const result = await service['extractAndSaveQualifications']('BSc - Science|BSc - Math');
            expect(result).toEqual([{ qualification: 'BSc' }]);
        });
    });

    describe('filterByEmployeeIds', () => {
        it('should call find with correct filter', async () => {
            employeeRepo.find.mockResolvedValue([{ employeeId: 1 }]);
            const dto = { employeeIds: [1] };
            const result = await service.filterByEmployeeIds(dto);
            expect(employeeRepo.find).toHaveBeenCalledWith({ where: { employeeId: expect.any(Object) } });
            expect(result).toEqual([{ employeeId: 1 }]);
        });
    });

    describe('parseExcelDate', () => {
        it('should parse date string in expected format', () => {
            expect(service['parseExcelDate']('14-APR-69')).toContain('14 April');
        });
        it('should return empty string for invalid', () => {
            expect(service['parseExcelDate']('invalid')).toBe('');
        });
    });

    describe('parseBSDate', () => {
        it('should parse valid BS date', () => {
            const result = service['parseBSDate']('2079/03/31');
            expect(result).toBeTruthy();
        });
        it('should return null for invalid', () => {
            expect(service['parseBSDate']('invalid')).toBeNull();
        });
    });

    describe('isValidBSDate', () => {
        it('should validate correct BS date', () => {
            expect(service['isValidBSDate']('2079/03/31')).toBe(true);
        });
        it('should invalidate incorrect BS date', () => {
            expect(service['isValidBSDate']('invalid')).toBe(false);
        });
    });

    describe('formatBSDate', () => {
        it('should format NepaliDate', () => {
            const nepaliDate = { format: jest.fn().mockReturnValue('2079-03-31') };
            expect(service['formatBSDate'](nepaliDate)).toBe('2079-03-31');
        });
        it('should handle error', () => {
            const nepaliDate = { format: jest.fn().mockImplementation(() => { throw new Error(); }) };
            expect(service['formatBSDate'](nepaliDate)).toBe('');
        });
    });

    describe('calculateDaysBetweenBSDates', () => {
        it('should calculate days between two valid BS dates', () => {
            service['parseBSDate'] = jest.fn().mockReturnValue({ getDateObject: () => new Date(2022, 2, 31) });
            expect(service['calculateDaysBetweenBSDates']('2079/03/30', '2079/03/31')).toBe(0);
        });
        it('should return 0 for invalid dates', () => {
            service['parseBSDate'] = jest.fn().mockReturnValue(null);
            expect(service['calculateDaysBetweenBSDates']('invalid', 'invalid')).toBe(0);
        });
    });

    describe('marksAccOld', () => {
        it('should use previousWorkOffice if presentDays < 90', async () => {
            service['getGeographicalMarks'] = jest.fn().mockResolvedValue(2);
            const result = await service['marksAccOld'](10, 80, 'office', 'male', 'prevOffice');
            expect(result).toBeCloseTo(2 * 10 / 365);
        });
        it('should use workOffice if presentDays >= 90', async () => {
            service['getGeographicalMarks'] = jest.fn().mockResolvedValue(3);
            const result = await service['marksAccOld'](10, 100, 'office', 'male');
            expect(result).toBeCloseTo(3 * 10 / 365);
        });
    });

    describe('marksAccNew', () => {
        it('should use 1.75 if presentDays < 233', async () => {
            const result = await service['marksAccNew'](10, 100, 'office', 'male');
            expect(result).toBeCloseTo(10 * 1.75 / 365);
        });
        it('should use geoMarks if presentDays >= 233', async () => {
            service['getGeographicalMarks'] = jest.fn().mockResolvedValue(2);
            const result = await service['marksAccNew'](10, 300, 'office', 'male');
            expect(result).toBeCloseTo(10 * 2 / 365);
        });
    });

    describe('calculateGeographicalMarks', () => {
        it('should return 0 if missing dates', async () => {
            const assignment = { id: '1', startDateBS: '', endDateBS: '', workOffice: '' } as AssignmentDetailDto;
            const result = await service['calculateGeographicalMarks'](assignment, 'male');
            expect(result.totalGeographicalMarks).toBe(0);
        });
        it('should return 0 if invalid BS dates', async () => {
            service['isValidBSDate'] = jest.fn().mockReturnValue(false);
            const assignment = { id: '1', startDateBS: 'invalid', endDateBS: 'invalid', workOffice: '' } as AssignmentDetailDto;
            const result = await service['calculateGeographicalMarks'](assignment, 'male');
            expect(result.totalGeographicalMarks).toBe(0);
        });
        it('should calculate marks for assignment spanning cutoff', async () => {
            service['isValidBSDate'] = jest.fn().mockReturnValue(true);

            // Return different dates for start, end, and cutoff
            const startDate = { getDateObject: () => new Date(2020, 0, 1) }; // before cutoff
            const endDate = { getDateObject: () => new Date(2023, 0, 1) };   // after cutoff
            const cutoffDate = { getDateObject: () => new Date(2022, 0, 1) }; // cutoff

            service['parseBSDate'] = jest
                .fn()
                .mockImplementation((dateStr) => {
                    if (dateStr === '2078/01/01') return startDate;
                    if (dateStr === '2080/01/01') return endDate;
                    if (dateStr === '2079/03/31') return cutoffDate;
                    return null;
                });

            service['calculateDaysBetweenBSDates'] = jest
                .fn()
                .mockReturnValueOnce(10) // numDaysOld
                .mockReturnValueOnce(5)  // numDaysNew
                .mockReturnValueOnce(15); // totalNumDays

            service['marksAccOld'] = jest.fn().mockResolvedValueOnce(2);
            service['marksAccNew'] = jest.fn().mockResolvedValueOnce(3);

            const assignment = { id: '1', startDateBS: '2078/01/01', endDateBS: '2080/01/01', workOffice: '' } as AssignmentDetailDto;
            const result = await service['calculateGeographicalMarks'](assignment, 'male');
            expect(result.totalGeographicalMarks).toBe(5);
        });
        it('should calculate marks for assignment before cutoff', async () => {
            service['isValidBSDate'] = jest.fn().mockReturnValue(true);
            service['parseBSDate'] = jest.fn().mockReturnValue({ getDateObject: () => new Date(2022, 2, 30) });
            service['calculateDaysBetweenBSDates'] = jest.fn().mockReturnValue(10);
            service['marksAccNew'] = jest.fn().mockResolvedValue(3);
            const assignment = { id: '1', startDateBS: '2078/01/01', endDateBS: '2078/12/30', workOffice: '' } as AssignmentDetailDto;
            const result = await service['calculateGeographicalMarks'](assignment, 'male');
            expect(result.totalGeographicalMarks).toBe(3);
        });
    });

    describe('convertExcelDateToBS', () => {
        it('should convert Excel date number to BS string', () => {
            const result = service['convertExcelDateToBS'](43831);
            expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        });
        it('should return empty string for invalid', () => {
            expect(service['convertExcelDateToBS']('invalid')).toBe('');
        });
    });

    describe('isExcelDateNumber', () => {
        it('should return true for valid Excel date number', () => {
            expect(service['isExcelDateNumber'](36526)).toBe(true);
        });
        it('should return false for invalid', () => {
            expect(service['isExcelDateNumber']('invalid')).toBe(false);
        });
    });

    describe('getGeographicalMarks', () => {
        it('should return 1 if office not found', async () => {
            officeRepo.findOne.mockResolvedValue(null);
            const result = await service['getGeographicalMarks']('office');
            expect(result).toBe(1);
        });
        it('should return 1 if district not found', async () => {
            officeRepo.findOne.mockResolvedValue({ name: 'office', district: 'district' });
            districtRepo.findOne.mockResolvedValue(null);
            const result = await service['getGeographicalMarks']('office');
            expect(result).toBe(1);
        });
        it('should return marks for old type and gender', async () => {
            officeRepo.findOne.mockResolvedValue({ name: 'office', district: 'district' });
            districtRepo.findOne.mockResolvedValue({ name: 'district', category: 'A' });
            categoryMarksRepo.findOne.mockResolvedValueOnce({ marks: 2 });
            const result = await service['getGeographicalMarks']('office', 'male', 'old');
            expect(result).toBe(2);
        });
        it('should fallback to male if not found for female', async () => {
            officeRepo.findOne.mockResolvedValue({ name: 'office', district: 'district' });
            districtRepo.findOne.mockResolvedValue({ name: 'district', category: 'A' });
            categoryMarksRepo.findOne.mockResolvedValueOnce(null);
            categoryMarksRepo.findOne.mockResolvedValueOnce({ marks: 1 });
            const result = await service['getGeographicalMarks']('office', 'female', 'old');
            expect(result).toBe(1);
        });
        it('should return marks for new type', async () => {
            officeRepo.findOne.mockResolvedValue({ name: 'office', district: 'district' });
            districtRepo.findOne.mockResolvedValue({ name: 'district', category: 'A' });
            categoryMarksRepo.findOne.mockResolvedValueOnce({ marks: 3 });
            const result = await service['getGeographicalMarks']('office', 'male', 'new');
            expect(result).toBe(3);
        });
    });

    describe('mapSexToGender', () => {
        it('should map Male to male', () => {
            expect(service['mapSexToGender']('Male')).toBe('male');
        });
        it('should map Female to female', () => {
            expect(service['mapSexToGender']('Female')).toBe('female');
        });
        it('should map others to null', () => {
            expect(service['mapSexToGender']('Other')).toBeNull();
        });
    });
}); 