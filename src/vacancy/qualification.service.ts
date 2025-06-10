import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Qualification } from './entities/qualification.entity';

@Injectable()
export class QualificationService {
    constructor(
        @InjectRepository(Qualification)
        private qualificationRepository: Repository<Qualification>,
    ) { }

    findAll(): Promise<Qualification[]> {
        return this.qualificationRepository.find({
            order: {
                qualification: 'ASC'
            }
        });
    }
} 