import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1776901890057 implements MigrationInterface {
    name = 'Init1776901890057'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "exam_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "name" character varying NOT NULL, "code" character varying, CONSTRAINT "UQ_5961e50ec7225437cdf31469f44" UNIQUE ("code"), CONSTRAINT "PK_aa2897f3176ef22cc87e38224cb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "subjects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "name" character varying NOT NULL, "code" character varying, "department" character varying, "aliases" text array NOT NULL DEFAULT '{}', CONSTRAINT "UQ_542cbba74dde3c82ab49c573109" UNIQUE ("code"), CONSTRAINT "PK_1a023685ac2b051b4e557b0b280" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_subjects_name_department" ON "subjects" ("name", "department") `);
        await queryRunner.query(`CREATE TABLE "exam_papers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "exam_type_id" uuid NOT NULL, "subject_id" uuid NOT NULL, "title" character varying, "status" character varying NOT NULL DEFAULT 'pending', "failure_reason" text, "total_pages" integer, "years_detected" text array NOT NULL DEFAULT '{}', CONSTRAINT "PK_5c68bb623f49d4641a518d65071" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_exam_papers_status" ON "exam_papers" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_8ac285859229663f5f6b312c8c" ON "exam_papers" ("exam_type_id", "subject_id") `);
        await queryRunner.query(`CREATE TYPE "public"."cloudinary_status_enum" AS ENUM('pending', 'uploaded', 'failed')`);
        await queryRunner.query(`CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "exam_paper_id" uuid, "question_id" uuid, "type" character varying NOT NULL, "source" character varying NOT NULL, "cloudinary_status" "public"."cloudinary_status_enum", "cloudinary_url" character varying, "cloudinary_public_id" character varying, "storage_path" character varying, "content_sha256" character varying(64), "meta" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "UQ_115e8a5f923e05b86137d32d1fb" UNIQUE ("content_sha256"), CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_deb6419eca6011ec947aa3bfff" ON "documents" ("question_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_dcd2bcc8c4615c4eb3edb00061" ON "documents" ("exam_paper_id") `);
        await queryRunner.query(`CREATE TABLE "exam_questions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "exam_paper_id" uuid, "subject_id" uuid, "year" character varying NOT NULL, "question_number" integer NOT NULL, "question_text" text NOT NULL, "question_latex" text, "options" jsonb NOT NULL DEFAULT '[]', "answer" character varying, "has_media" boolean NOT NULL DEFAULT false, "page_number" integer, "column_position" character varying, "ingestion_source" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'raw', "failure_reason" text, CONSTRAINT "PK_a214d47c7964cb6356f413dc73c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_284f70221ec312199037fddc7f" ON "exam_questions" ("subject_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_exam_questions_paper_status" ON "exam_questions" ("exam_paper_id", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_exam_questions_paper_year" ON "exam_questions" ("exam_paper_id", "year") `);
        await queryRunner.query(`CREATE TYPE "public"."ai_processed_exam_questions_status_enum" AS ENUM('pending', 'completed', 'failed')`);
        await queryRunner.query(`CREATE TABLE "ai_processed_exam_questions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "exam_question_id" uuid NOT NULL, "question_text" text, "question_latex" text, "options" jsonb, "answer" character varying, "explanation" text, "topic" character varying, "related_topic" character varying, "status" "public"."ai_processed_exam_questions_status_enum" NOT NULL DEFAULT 'pending', CONSTRAINT "REL_15acf7368f8d2cdf4fa896c3cf" UNIQUE ("exam_question_id"), CONSTRAINT "PK_6d1f12dd47560800c06f569fd2d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ai_processed_exam_questions_status" ON "ai_processed_exam_questions" ("status") `);
        await queryRunner.query(`CREATE TABLE "invalid_exam_questions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "paper_id" uuid NOT NULL, "page_number" integer NOT NULL, "raw_text" text NOT NULL, "errors" text array NOT NULL DEFAULT '{}', CONSTRAINT "PK_2b16a23acc1668144e1e6b5e6e3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_invalid_exam_questions_paper_id" ON "invalid_exam_questions" ("paper_id") `);
        await queryRunner.query(`ALTER TABLE "exam_papers" ADD CONSTRAINT "FK_72a67dbeaa160490f87d90b7463" FOREIGN KEY ("exam_type_id") REFERENCES "exam_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exam_papers" ADD CONSTRAINT "FK_305e58ec5bf1892d0f8db11b867" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_dcd2bcc8c4615c4eb3edb00061f" FOREIGN KEY ("exam_paper_id") REFERENCES "exam_papers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_deb6419eca6011ec947aa3bfffc" FOREIGN KEY ("question_id") REFERENCES "exam_questions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exam_questions" ADD CONSTRAINT "FK_41579a7ff9d612e4eb960906382" FOREIGN KEY ("exam_paper_id") REFERENCES "exam_papers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exam_questions" ADD CONSTRAINT "FK_284f70221ec312199037fddc7fc" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ai_processed_exam_questions" ADD CONSTRAINT "FK_15acf7368f8d2cdf4fa896c3cf5" FOREIGN KEY ("exam_question_id") REFERENCES "exam_questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ai_processed_exam_questions" DROP CONSTRAINT "FK_15acf7368f8d2cdf4fa896c3cf5"`);
        await queryRunner.query(`ALTER TABLE "exam_questions" DROP CONSTRAINT "FK_284f70221ec312199037fddc7fc"`);
        await queryRunner.query(`ALTER TABLE "exam_questions" DROP CONSTRAINT "FK_41579a7ff9d612e4eb960906382"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_deb6419eca6011ec947aa3bfffc"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_dcd2bcc8c4615c4eb3edb00061f"`);
        await queryRunner.query(`ALTER TABLE "exam_papers" DROP CONSTRAINT "FK_305e58ec5bf1892d0f8db11b867"`);
        await queryRunner.query(`ALTER TABLE "exam_papers" DROP CONSTRAINT "FK_72a67dbeaa160490f87d90b7463"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_invalid_exam_questions_paper_id"`);
        await queryRunner.query(`DROP TABLE "invalid_exam_questions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ai_processed_exam_questions_status"`);
        await queryRunner.query(`DROP TABLE "ai_processed_exam_questions"`);
        await queryRunner.query(`DROP TYPE "public"."ai_processed_exam_questions_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_exam_questions_paper_year"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_exam_questions_paper_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_284f70221ec312199037fddc7f"`);
        await queryRunner.query(`DROP TABLE "exam_questions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dcd2bcc8c4615c4eb3edb00061"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_deb6419eca6011ec947aa3bfff"`);
        await queryRunner.query(`DROP TABLE "documents"`);
        await queryRunner.query(`DROP TYPE "public"."cloudinary_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8ac285859229663f5f6b312c8c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_exam_papers_status"`);
        await queryRunner.query(`DROP TABLE "exam_papers"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_subjects_name_department"`);
        await queryRunner.query(`DROP TABLE "subjects"`);
        await queryRunner.query(`DROP TABLE "exam_types"`);
    }

}
