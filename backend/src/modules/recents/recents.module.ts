import { Module } from '@nestjs/common';
import { RecentsService } from './recents.service';
import { RecentsController } from './recents.controller';

@Module({
  controllers: [RecentsController],
  providers: [RecentsService],
  exports: [RecentsService],
})
export class RecentsModule {}
