import { PartialType } from '@nestjs/swagger';
import { SaveTeacher } from './save-teacher.dto';

export class EditTeacher extends PartialType(SaveTeacher) {}
