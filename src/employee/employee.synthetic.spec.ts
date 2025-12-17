import { EmployeeService } from './employee.service';
import * as XLSX from 'xlsx';

describe('EmployeeService.uploadEmployeeDetail synthetic assignment', () => {
    const buildWorkbookBuffer = () => {
        const rows = [
            ['Employee No: 4488'],
            ['Assignment Details:'],
            [
                'Position',
                'Jobs',
                'Function',
                'Emp. Category',
                'Emp. Type',
                'Work Office',
                'Start Date BS',
                'End Date BS',
                'Seniority Date BS',
                'Level',
                'Perm. Level Date BS',
                'Reason',
            ],
            [
                'ASST ACC OFFICER.FINANCIAL PLANNING &',
                'ADMINISTRATIVE.ASST ACC OFFICER',
                'FINANCE',
                'FULL',
                'Permanent',
                'INTERNATIONAL SERVICE DIRECTORATE',
                '9/6/2077',
                '4/1/2078',
                '8/13/2068',
                6,
                '',
                'TRANSFER',
            ],
            [
                'ACCOUNT OFFICER.NDCL',
                'ADMINISTRATIVE.ACCOUNT OFFICER',
                'FINANCE',
                'FULL',
                'Permanent',
                'INTERNATIONAL SERVICE DIRECTORATE',
                '4/7/2078',
                '6/23/2078',
                '8/13/2076',
                7,
                '',
                'UPGRADE',
            ],
            ['Qualification Details:'],
        ];

        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
    };

    const buildService = () => {
        const service = new EmployeeService(
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
        );
        // Override DB-impacting methods to no-op for unit test
        (service as any).saveAssignmentsToDatabase = jest.fn();
        (service as any).saveAbsentsToDatabase = jest.fn();
        (service as any).saveLeavesToDatabase = jest.fn();
        (service as any).saveRewardsToDatabase = jest.fn();
        return service;
    };

    it('adds a synthetic pre-level assignment when seniority date is before the first start date of that level', async () => {
        const service = buildService();
        const buffer = buildWorkbookBuffer();

        const employeeDetails = await service.uploadEmployeeDetail({ buffer } as any);

        expect(employeeDetails).toHaveLength(1);
        const assignments = employeeDetails[0].assignments ?? [];
        expect(assignments.length).toBeGreaterThan(0);

        // Expect original + synthetic for level 7
        const level7 = assignments.filter(a => a.level === 7);
        expect(level7).toHaveLength(2);

        const expectedSyntheticStart = '2076-08-13';
        const expectedSyntheticEnd = '2078-04-06';
        const expectedOriginalStart = '2078-04-07';

        const synthetic = level7.find(a => a.startDateBS === expectedSyntheticStart);
        const original = level7.find(a => a.endDateBS === '6/23/2078');

        expect(synthetic).toBeDefined();
        expect(original).toBeDefined();

        expect(synthetic).toMatchObject({
            position: 'ACCOUNT OFFICER.NDCL',
            level: 7,
            workOffice: 'INTERNATIONAL SERVICE DIRECTORATE',
            jobs: 'ADMINISTRATIVE.ASST ACC OFFICER',
            startDateBS: expectedSyntheticStart,
            endDateBS: expectedSyntheticEnd,
            reasonForPosition: 'TRANSFER',
        });

        expect(original).toMatchObject({
            position: 'ACCOUNT OFFICER.NDCL',
            level: 7,
            startDateBS: expectedOriginalStart,
            endDateBS: '6/23/2078',
        });
    });
});

