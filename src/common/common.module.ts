import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerMiddleware } from './middleware/logger.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { District } from './entities/district.entity';
import { Office } from './entities/office.entity';
import { CategoryMarks } from './entities/category-marks.entity';
import { DistrictDataService } from './district-data.service';
import { DistrictDataController } from './district-data.controller';
import { TemplateRendererService } from './template-renderer.service';
import { UtilsController } from './utils.controller';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([District, Office, CategoryMarks]),
    ],
    providers: [LoggerMiddleware, DistrictDataService, TemplateRendererService],
    controllers: [DistrictDataController, UtilsController],
    exports: [LoggerMiddleware, TypeOrmModule, TemplateRendererService],
})
export class CommonModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(LoggerMiddleware)
            .forRoutes('*');
    }
} 