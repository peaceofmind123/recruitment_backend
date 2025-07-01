import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { District } from './entities/district.entity';
import { Office } from './entities/office.entity';
import { CategoryMarks } from './entities/category-marks.entity';
import * as XLSX from 'xlsx';
import { DistrictDataResponseDto, DistrictCategoryMapDto, OfficeDistrictMapDto, CategoryMarksDto } from './dto/district-data-response.dto';

@Injectable()
export class DistrictDataService {
    constructor(
        @InjectRepository(District)
        private districtRepo: Repository<District>,
        @InjectRepository(Office)
        private officeRepo: Repository<Office>,
        @InjectRepository(CategoryMarks)
        private categoryMarksRepo: Repository<CategoryMarks>,
    ) { }

    async uploadAndParseExcel(buffer: Buffer): Promise<DistrictDataResponseDto> {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        // Sheet 1: district_category_map
        const districtCategoryRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }) as any[][];
        // Sheet 2: office_district_map
        const officeDistrictRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[1]], { header: 1 }) as any[][];
        // Sheet 3: category_marks_map_old_male
        const marksOldMaleRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[2]], { header: 1 }) as any[][];
        // Sheet 4: category_marks_map_old_female
        const marksOldFemaleRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[3]], { header: 1 }) as any[][];
        // Sheet 5: category_marks_map_new
        const marksNewRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[4]], { header: 1 }) as any[][];

        // Clear old data
        await this.districtRepo.clear();
        await this.officeRepo.clear();
        await this.categoryMarksRepo.clear();

        // Insert district-category
        const districtCategoryMap: DistrictCategoryMapDto[] = [];
        for (let i = 1; i < districtCategoryRows.length; i++) {
            const row = districtCategoryRows[i];
            if (!row || !row[1] || !row[2]) continue;
            const entity = this.districtRepo.create({ name: String(row[1]), category: String(row[2]) });
            await this.districtRepo.save(entity);
            districtCategoryMap.push({ district: String(row[1]), category: String(row[2]) });
        }

        // Insert office-district
        const officeDistrictMap: OfficeDistrictMapDto[] = [];
        for (let i = 1; i < officeDistrictRows.length; i++) {
            const row = officeDistrictRows[i];
            if (!row || !row[1] || !row[2]) continue;
            const entity = this.officeRepo.create({ name: String(row[1]), district: String(row[2]) });
            await this.officeRepo.save(entity);
            officeDistrictMap.push({ office: String(row[1]), district: String(row[2]) });
        }

        // Insert category marks (old male)
        const categoryMarks: CategoryMarksDto[] = [];
        for (let i = 1; i < marksOldMaleRows.length; i++) {
            const row = marksOldMaleRows[i];
            if (!row || !row[0] || !row[1]) continue;
            const entity = this.categoryMarksRepo.create({
                category: String(row[0]),
                marks: Number(row[1]),
                type: 'old',
                gender: 'male'
            });
            await this.categoryMarksRepo.save(entity);
            categoryMarks.push({
                category: String(row[0]),
                marks: Number(row[1]),
                type: 'old',
                gender: 'male'
            });
        }
        // Insert category marks (old female)
        for (let i = 1; i < marksOldFemaleRows.length; i++) {
            const row = marksOldFemaleRows[i];
            if (!row || !row[0] || !row[1]) continue;
            const entity = this.categoryMarksRepo.create({
                category: String(row[0]),
                marks: Number(row[1]),
                type: 'old',
                gender: 'female'
            });
            await this.categoryMarksRepo.save(entity);
            categoryMarks.push({
                category: String(row[0]),
                marks: Number(row[1]),
                type: 'old',
                gender: 'female'
            });
        }
        // Insert category marks (new)
        for (let i = 1; i < marksNewRows.length; i++) {
            const row = marksNewRows[i];
            if (!row || !row[0] || !row[1]) continue;
            const entity = this.categoryMarksRepo.create({
                category: String(row[0]),
                marks: Number(row[1]),
                type: 'new',
                gender: null
            });
            await this.categoryMarksRepo.save(entity);
            categoryMarks.push({
                category: String(row[0]),
                marks: Number(row[1]),
                type: 'new'
            });
        }

        return {
            districtCategoryMap,
            officeDistrictMap,
            categoryMarks,
        };
    }

    async getAllDistrictData(): Promise<DistrictDataResponseDto> {
        const districtCategoryMap = await this.districtRepo.find();
        const officeDistrictMap = await this.officeRepo.find();
        const categoryMarks = await this.categoryMarksRepo.find();
        return {
            districtCategoryMap: districtCategoryMap.map(d => ({ district: d.name, category: d.category })),
            officeDistrictMap: officeDistrictMap.map(o => ({ office: o.name, district: o.district })),
            categoryMarks: categoryMarks.map(c => ({ category: c.category, marks: c.marks, type: c.type, gender: c.gender })),
        };
    }
} 