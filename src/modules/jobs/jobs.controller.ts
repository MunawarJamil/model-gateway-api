import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@Controller('jobs')
@UseGuards(ApiKeyGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get(':id')
  async getJob(@Param('id') id: string, @Req() req: any) {
    const job = await this.jobsService.getJobStatus(id);
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return job;
  }
}
