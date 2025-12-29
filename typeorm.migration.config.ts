import { DataSource } from 'typeorm';
import * as path from 'path';

/**
 * Production-ready TypeORM datasource config dedicated to migrations.
 *
 * Usage examples:
 *  - npx typeorm-ts-node-commonjs migration:run -d typeorm.migration.config.ts
 *  - npx typeorm-ts-node-commonjs migration:revert -d typeorm.migration.config.ts
 *  - npx typeorm-ts-node-commonjs migration:generate src/migrations/Name -d typeorm.migration.config.ts
 */

const isProd = (process.env.NODE_ENV || 'production') === 'production';
const rootDir = process.cwd();

// Use compiled JS files in production, TS sources otherwise.
const entitiesDir = isProd ? 'dist' : 'src';
const migrationsDir = isProd ? 'dist' : 'src';

export default new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'hr_recruitment',
    entities: [path.join(rootDir, `${entitiesDir}/**/*.entity.{js,ts}`)],
    migrations: [path.join(rootDir, `${migrationsDir}/migrations/**/*.{js,ts}`)],
    synchronize: false, // never sync in production; use migrations instead
    logging: process.env.TYPEORM_LOGGING === 'true',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    migrationsTableName: 'migrations',
});

