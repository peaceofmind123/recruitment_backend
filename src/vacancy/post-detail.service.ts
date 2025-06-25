import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostDetail } from './entities/post-detail.entity';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

@Injectable()
export class PostDetailService {
    constructor(
        @InjectRepository(PostDetail)
        private postDetailRepository: Repository<PostDetail>,
    ) { }

    async importFromExcel(filePath: string): Promise<void> {
        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
        const [header, ...data] = rows;
        for (const row of data) {
            if (!row || row.length < 5) continue;
            const [level, service, group, subgroup, position] = row;
            if (!level || !position) continue;
            await this.postDetailRepository.save({
                level: Number(level),
                service: service || '',
                group: group || '',
                subgroup: subgroup || '',
                position: position || '',
            });
        }
    }

    async getLevels(): Promise<number[]> {
        const levels = await this.postDetailRepository
            .createQueryBuilder('post')
            .select('DISTINCT post.level', 'level')
            .orderBy('post.level', 'ASC')
            .getRawMany();
        return levels.map(l => l.level);
    }

    async getServices(level: number): Promise<string[]> {
        const services = await this.postDetailRepository
            .createQueryBuilder('post')
            .select('DISTINCT post.service', 'service')
            .where('post.level = :level', { level })
            .orderBy('post.service', 'ASC')
            .getRawMany();
        return services.map(s => s.service);
    }

    async getGroups(level: number, service: string): Promise<string[]> {
        const groups = await this.postDetailRepository
            .createQueryBuilder('post')
            .select('DISTINCT post.group', 'group')
            .where('post.level = :level AND post.service = :service', { level, service })
            .orderBy('post.group', 'ASC')
            .getRawMany();
        return groups.map(g => g.group);
    }

    async getSubgroups(level: number, service: string, group: string): Promise<string[]> {
        const subgroups = await this.postDetailRepository
            .createQueryBuilder('post')
            .select('DISTINCT post.subgroup', 'subgroup')
            .where('post.level = :level AND post.service = :service AND post.group = :group', { level, service, group })
            .orderBy('post.subgroup', 'ASC')
            .getRawMany();
        return subgroups.map(sg => sg.subgroup);
    }

    async getPositions(level: number, service: string, group: string, subgroup: string): Promise<string[]> {
        const positions = await this.postDetailRepository
            .createQueryBuilder('post')
            .select('DISTINCT post.position', 'position')
            .where('post.level = :level AND post.service = :service AND post.group = :group AND post.subgroup = :subgroup', { level, service, group, subgroup })
            .orderBy('post.position', 'ASC')
            .getRawMany();
        return positions.map(p => p.position);
    }
} 