import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FiscalYear } from './entities/fiscal-year.entity';

@Module({
    imports: [TypeOrmModule.forFeature([FiscalYear])],
    exports: [TypeOrmModule],
})
export class FiscalYearModule { } 