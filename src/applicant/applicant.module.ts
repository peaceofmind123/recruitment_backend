import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicantService } from './applicant.service';
import { ApplicantController } from './applicant.controller';
import { Applicant } from './entities/applicant.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Applicant])],
    controllers: [ApplicantController],
    providers: [ApplicantService],
    exports: [ApplicantService],
})
export class ApplicantModule { } 