import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1767337281061 implements MigrationInterface {
    name = 'InitialSchema1767337281061'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "qualification" ("qualification" character varying NOT NULL, CONSTRAINT "PK_2d2540f8b970a5a43a905278da7" PRIMARY KEY ("qualification"))`);
        await queryRunner.query(`CREATE TABLE "fiscal_year" ("year" character varying NOT NULL, "startedOn" date NOT NULL, "closedOn" date, CONSTRAINT "PK_10aaf216842e82f36bd61409709" PRIMARY KEY ("year"))`);
        await queryRunner.query(`CREATE TABLE "assignment_details" ("employeeId" integer NOT NULL, "startDateBS" character varying NOT NULL, "endDateBS" character varying, "position" character varying NOT NULL, "jobs" character varying NOT NULL, "function" character varying NOT NULL, "empCategory" character varying NOT NULL, "empType" character varying NOT NULL, "workOffice" character varying NOT NULL, "seniorityDateBS" character varying, "level" integer NOT NULL, "permLevelDateBS" character varying, "reasonForPosition" character varying, "startDate" date, "seniorityDate" date, "totalGeographicalMarks" numeric(10,2), "numDaysOld" integer, "numDaysNew" integer, "totalNumDays" integer, CONSTRAINT "PK_326221f4fa29b10a3a3fab9d717" PRIMARY KEY ("employeeId", "startDateBS"))`);
        await queryRunner.query(`CREATE TYPE "public"."employees_sex_enum" AS ENUM('M', 'F', 'Unspecified')`);
        await queryRunner.query(`CREATE TABLE "employees" ("employeeId" integer NOT NULL, "dob" date NOT NULL, "seniorityDate" date NOT NULL, "name" character varying NOT NULL, "level" integer NOT NULL, "sex" "public"."employees_sex_enum" NOT NULL, "education" character varying NOT NULL, "workingOffice" character varying NOT NULL, "position" character varying, CONSTRAINT "PK_fa00ce161b51b02fdf992ea9528" PRIMARY KEY ("employeeId"))`);
        await queryRunner.query(`CREATE TABLE "applicant" ("employeeId" integer NOT NULL, "bigyapanNo" character varying NOT NULL, "seniorityMarks" numeric(20,10), "educationMarks" numeric(20,10), "geographicalMarks" numeric(20,10), CONSTRAINT "PK_081ab1d06bb07454667221236f1" PRIMARY KEY ("employeeId", "bigyapanNo"))`);
        await queryRunner.query(`CREATE TABLE "vacancy" ("bigyapanNo" character varying NOT NULL, "numPositions" integer NOT NULL, "level" integer NOT NULL, "service" character varying NOT NULL, "group" character varying NOT NULL, "subGroup" character varying NOT NULL, "position" character varying NOT NULL, "fiscalYearYear" character varying NOT NULL, "approvedApplicantList" character varying, "bigyapanEndDate" date, CONSTRAINT "PK_f3b548653045c7973b92884d4e2" PRIMARY KEY ("bigyapanNo"))`);
        await queryRunner.query(`CREATE TABLE "post_detail" ("id" SERIAL NOT NULL, "level" integer NOT NULL, "service" character varying NOT NULL, "group" character varying NOT NULL, "subgroup" character varying NOT NULL, "position" character varying NOT NULL, CONSTRAINT "PK_9c24fcd2fbe61748223594080dc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "reward_punishment_details" ("id" SERIAL NOT NULL, "employeeId" integer NOT NULL, "rpType" character varying, "fromDateBS" character varying, "toDateBS" character varying, "rpName" character varying, "reason" character varying, CONSTRAINT "PK_13eeec642a3531acdeeafe2d7ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "employee_details" ("employeeId" integer NOT NULL, "name" character varying NOT NULL, "dob" character varying NOT NULL, "dor" character varying NOT NULL, "joinDate" character varying NOT NULL, "permDate" character varying NOT NULL, CONSTRAINT "PK_b47c758283e1d7fa80e88ccc9c5" PRIMARY KEY ("employeeId"))`);
        await queryRunner.query(`CREATE TABLE "absent_details" ("id" SERIAL NOT NULL, "employeeId" integer NOT NULL, "fromDateBS" character varying, "toDateBS" character varying, "duration" character varying, "remarks" character varying, CONSTRAINT "PK_ef72849d35e706503ae1ebfcea1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "leave_details" ("id" SERIAL NOT NULL, "employeeId" integer NOT NULL, "fromDateBS" character varying, "toDateBS" character varying, "leaveType" character varying, "duration" character varying, "remarks" character varying, CONSTRAINT "PK_876e7ae3e91f68aa9c5246fbd8d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "offices" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "district" character varying NOT NULL, CONSTRAINT "UQ_88aa5ebfe59f99cc747ca00f54f" UNIQUE ("name"), CONSTRAINT "PK_1ea41502c6dddcec44ad9fcbbb3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "category_marks" ("id" SERIAL NOT NULL, "category" character varying NOT NULL, "marks" double precision NOT NULL, "type" character varying NOT NULL, "gender" character varying, CONSTRAINT "PK_e3001157d0db01eb009fb88926c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "districts" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "category" character varying NOT NULL, CONSTRAINT "UQ_6a6fd6d258022e5576afbad90b4" UNIQUE ("name"), CONSTRAINT "PK_972a72ff4e3bea5c7f43a2b98af" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "employee_qualifications" ("employee_id" integer NOT NULL, "qualification_qualification" character varying NOT NULL, CONSTRAINT "PK_0c5e3c7ec1351d584fa4ab6cab8" PRIMARY KEY ("employee_id", "qualification_qualification"))`);
        await queryRunner.query(`CREATE INDEX "IDX_97a06c2adbcc5e1ff484ea446f" ON "employee_qualifications" ("employee_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_7c8def3c4b7f526e6da34d55d4" ON "employee_qualifications" ("qualification_qualification") `);
        await queryRunner.query(`CREATE TABLE "vacancy_min_qualifications" ("vacancy_bigyapan_no" character varying NOT NULL, "qualification_qualification" character varying NOT NULL, CONSTRAINT "PK_e35ecd5ba33466033e3d05bec77" PRIMARY KEY ("vacancy_bigyapan_no", "qualification_qualification"))`);
        await queryRunner.query(`CREATE INDEX "IDX_99c24ce86948a7a04f3ae864ba" ON "vacancy_min_qualifications" ("vacancy_bigyapan_no") `);
        await queryRunner.query(`CREATE INDEX "IDX_f24b80502d34bdd64bd0a3c433" ON "vacancy_min_qualifications" ("qualification_qualification") `);
        await queryRunner.query(`CREATE TABLE "vacancy_additional_qualifications" ("vacancy_bigyapan_no" character varying NOT NULL, "qualification_qualification" character varying NOT NULL, CONSTRAINT "PK_15a9140a060df21010057cc5dda" PRIMARY KEY ("vacancy_bigyapan_no", "qualification_qualification"))`);
        await queryRunner.query(`CREATE INDEX "IDX_088430feeccad40079639497ff" ON "vacancy_additional_qualifications" ("vacancy_bigyapan_no") `);
        await queryRunner.query(`CREATE INDEX "IDX_cec973ec860e32ab5873fafbdf" ON "vacancy_additional_qualifications" ("qualification_qualification") `);
        await queryRunner.query(`ALTER TABLE "assignment_details" ADD CONSTRAINT "FK_2b906f9bad1cf92795d114f453b" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "applicant" ADD CONSTRAINT "FK_8882243c9c40bc3a5ad2684651c" FOREIGN KEY ("bigyapanNo") REFERENCES "vacancy"("bigyapanNo") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "applicant" ADD CONSTRAINT "FK_c0c607fc1c92a5dbf8688531dcf" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vacancy" ADD CONSTRAINT "FK_3dde055cc014f2292e1d305c426" FOREIGN KEY ("fiscalYearYear") REFERENCES "fiscal_year"("year") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward_punishment_details" ADD CONSTRAINT "FK_f572365d2fbc704ddaab4d1d0d5" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "absent_details" ADD CONSTRAINT "FK_7cf5729840c876fb7e156ddb518" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_details" ADD CONSTRAINT "FK_0ba87ef0f7b222ffdea3bc29436" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_qualifications" ADD CONSTRAINT "FK_97a06c2adbcc5e1ff484ea446f3" FOREIGN KEY ("employee_id") REFERENCES "employees"("employeeId") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "employee_qualifications" ADD CONSTRAINT "FK_7c8def3c4b7f526e6da34d55d49" FOREIGN KEY ("qualification_qualification") REFERENCES "qualification"("qualification") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "vacancy_min_qualifications" ADD CONSTRAINT "FK_99c24ce86948a7a04f3ae864ba7" FOREIGN KEY ("vacancy_bigyapan_no") REFERENCES "vacancy"("bigyapanNo") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "vacancy_min_qualifications" ADD CONSTRAINT "FK_f24b80502d34bdd64bd0a3c4331" FOREIGN KEY ("qualification_qualification") REFERENCES "qualification"("qualification") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "vacancy_additional_qualifications" ADD CONSTRAINT "FK_088430feeccad40079639497ff5" FOREIGN KEY ("vacancy_bigyapan_no") REFERENCES "vacancy"("bigyapanNo") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "vacancy_additional_qualifications" ADD CONSTRAINT "FK_cec973ec860e32ab5873fafbdfc" FOREIGN KEY ("qualification_qualification") REFERENCES "qualification"("qualification") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vacancy_additional_qualifications" DROP CONSTRAINT "FK_cec973ec860e32ab5873fafbdfc"`);
        await queryRunner.query(`ALTER TABLE "vacancy_additional_qualifications" DROP CONSTRAINT "FK_088430feeccad40079639497ff5"`);
        await queryRunner.query(`ALTER TABLE "vacancy_min_qualifications" DROP CONSTRAINT "FK_f24b80502d34bdd64bd0a3c4331"`);
        await queryRunner.query(`ALTER TABLE "vacancy_min_qualifications" DROP CONSTRAINT "FK_99c24ce86948a7a04f3ae864ba7"`);
        await queryRunner.query(`ALTER TABLE "employee_qualifications" DROP CONSTRAINT "FK_7c8def3c4b7f526e6da34d55d49"`);
        await queryRunner.query(`ALTER TABLE "employee_qualifications" DROP CONSTRAINT "FK_97a06c2adbcc5e1ff484ea446f3"`);
        await queryRunner.query(`ALTER TABLE "leave_details" DROP CONSTRAINT "FK_0ba87ef0f7b222ffdea3bc29436"`);
        await queryRunner.query(`ALTER TABLE "absent_details" DROP CONSTRAINT "FK_7cf5729840c876fb7e156ddb518"`);
        await queryRunner.query(`ALTER TABLE "reward_punishment_details" DROP CONSTRAINT "FK_f572365d2fbc704ddaab4d1d0d5"`);
        await queryRunner.query(`ALTER TABLE "vacancy" DROP CONSTRAINT "FK_3dde055cc014f2292e1d305c426"`);
        await queryRunner.query(`ALTER TABLE "applicant" DROP CONSTRAINT "FK_c0c607fc1c92a5dbf8688531dcf"`);
        await queryRunner.query(`ALTER TABLE "applicant" DROP CONSTRAINT "FK_8882243c9c40bc3a5ad2684651c"`);
        await queryRunner.query(`ALTER TABLE "assignment_details" DROP CONSTRAINT "FK_2b906f9bad1cf92795d114f453b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cec973ec860e32ab5873fafbdf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_088430feeccad40079639497ff"`);
        await queryRunner.query(`DROP TABLE "vacancy_additional_qualifications"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f24b80502d34bdd64bd0a3c433"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_99c24ce86948a7a04f3ae864ba"`);
        await queryRunner.query(`DROP TABLE "vacancy_min_qualifications"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7c8def3c4b7f526e6da34d55d4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97a06c2adbcc5e1ff484ea446f"`);
        await queryRunner.query(`DROP TABLE "employee_qualifications"`);
        await queryRunner.query(`DROP TABLE "districts"`);
        await queryRunner.query(`DROP TABLE "category_marks"`);
        await queryRunner.query(`DROP TABLE "offices"`);
        await queryRunner.query(`DROP TABLE "leave_details"`);
        await queryRunner.query(`DROP TABLE "absent_details"`);
        await queryRunner.query(`DROP TABLE "employee_details"`);
        await queryRunner.query(`DROP TABLE "reward_punishment_details"`);
        await queryRunner.query(`DROP TABLE "post_detail"`);
        await queryRunner.query(`DROP TABLE "vacancy"`);
        await queryRunner.query(`DROP TABLE "applicant"`);
        await queryRunner.query(`DROP TABLE "employees"`);
        await queryRunner.query(`DROP TYPE "public"."employees_sex_enum"`);
        await queryRunner.query(`DROP TABLE "assignment_details"`);
        await queryRunner.query(`DROP TABLE "fiscal_year"`);
        await queryRunner.query(`DROP TABLE "qualification"`);
    }

}
