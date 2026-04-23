import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamType } from '../model/entities/exam-type.entity';
import { ExamTypesController } from './exam-types.controller';
import { ExamTypesService } from './exam-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExamType])],
  controllers: [ExamTypesController],
  providers: [ExamTypesService],
  exports: [ExamTypesService],
})
export class ExamTypesModule {}
