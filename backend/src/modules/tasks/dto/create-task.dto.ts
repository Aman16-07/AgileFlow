import { IsString, IsOptional, IsIn, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const IssueTypes = ['STORY', 'BUG', 'TASK', 'EPIC', 'SUBTASK'] as const;
const Priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'] as const;

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  spaceId: string;

  @ApiProperty()
  @IsString()
  statusId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, enum: IssueTypes })
  @IsOptional()
  @IsIn(IssueTypes)
  type?: string;

  @ApiProperty({ required: false, enum: Priorities })
  @IsOptional()
  @IsIn(Priorities)
  priority?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sprintId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  storyPoints?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dueDate?: string;
}
