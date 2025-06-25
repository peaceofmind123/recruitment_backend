import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PostDetailService } from './post-detail.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const service = app.get(PostDetailService);
    try {
        await service.importFromExcel('Post Detail.xlsx');
        console.log('Post detail data imported successfully.');
    } catch (err) {
        console.error('Error importing post detail data:', err);
    } finally {
        await app.close();
    }
}

bootstrap(); 