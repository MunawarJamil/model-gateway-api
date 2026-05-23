import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiParam,
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('Jobs')
@ApiSecurity('API-Key')
@Controller('jobs')
@UseGuards(ApiKeyGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get async job status and result' })
  @ApiParam({
    name: 'id',
    description: 'Job ID returned from POST /v1/complete/async',
  })
  @ApiResponse({
    status: 200,
    description: 'Job status — waiting, active, completed, or failed',
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJob(@Param('id') id: string, @Req() req: any) {
    const job = await this.jobsService.getJobStatus(id);
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return job;
  }
}
