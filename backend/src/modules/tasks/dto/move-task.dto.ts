import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoveTaskDto {
  @ApiProperty({ description: 'The task to move' })
  @IsString()
  taskId: string;

  @ApiProperty({ description: 'Target status column ID' })
  @IsString()
  targetStatusId: string;

  @ApiProperty({ required: false, description: 'Target index within the column (0-based)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  targetPosition?: number;
}
