import { IsString, MinLength, MaxLength, IsOptional, IsIn, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const SpaceVisibilities = ['PRIVATE', 'TEAM'] as const;

export class CreateSpaceDto {
  @ApiProperty({ example: 'My Project' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'SCRUM', description: 'Uppercase project key, 2-10 chars' })
  @IsString()
  @Matches(/^[A-Z][A-Z0-9]{1,9}$/, {
    message: 'Key must be 2-10 uppercase alphanumeric characters starting with a letter',
  })
  key: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ required: false, enum: SpaceVisibilities })
  @IsOptional()
  @IsIn(SpaceVisibilities)
  visibility?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  iconUrl?: string;
}
