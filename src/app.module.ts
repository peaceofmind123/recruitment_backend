import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FiscalYearModule } from './fiscal-year/fiscal-year.module';
import { VacancyModule } from './vacancy/vacancy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'hr_recruitment'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        autoLoadEntities: true,
        logging: configService.get<string>('NODE_ENV') === 'development',
        ssl: false,
      }),
      inject: [ConfigService],
    }),
    FiscalYearModule,
    VacancyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
