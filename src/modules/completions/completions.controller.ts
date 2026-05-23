import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { CompletionsService } from './completions.service';
import { CompleteDto } from './dto/complete.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import type { Response } from 'express';
import { getErrorMessage } from '../providers/provider.interface';
import { JobsService } from '../jobs/jobs.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';

@ApiTags('Completions')
@ApiSecurity('API-Key')
@Controller()
@UseGuards(ApiKeyGuard, RateLimitGuard)
export class CompletionsController {
  private readonly logger = new Logger(CompletionsController.name);
  constructor(
    private readonly completions: CompletionsService,
    private readonly jobs: JobsService,
  ) {}

  @Post('complete')
  @ApiOperation({ summary: 'Sync completion — waits for AI response' })
  @ApiResponse({ status: 201, description: 'AI response returned' })
  @ApiResponse({
    status: 429,
    description: 'Rate limit or monthly token limit exceeded',
  })
  async complete(@Body() dto: CompleteDto, @Req() req: Request) {
    const apiKey = (req as any).apiKey;
    return this.completions.complete(dto, apiKey, apiKey.userId);
  }

  @Post('complete/stream')
  @ApiOperation({
    summary: 'Streaming completion — SSE token-by-token response',
  })
  @ApiResponse({ status: 200, description: 'SSE stream of tokens' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async completeStream(
    @Body() dto: CompleteDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const apiKey = (req as any).apiKey;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const abortController = new AbortController();
    req.on('close', () => abortController.abort());

    try {
      const stream = this.completions.stream(
        dto,
        apiKey,
        abortController.signal,
      );

      for await (const chunk of stream) {
        if (abortController.signal.aborted) break;
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        if (chunk.done) break;
      }
    } catch (error) {
      res.write(
        `data: ${JSON.stringify({ error: 'Stream failed', done: true })}\n\n`,
      );
      this.logger.error(`Stream error: ${getErrorMessage(error)}`);
      res.write(
        `data: ${JSON.stringify({ error: 'Stream failed', done: true })}\n\n`,
      );
    } finally {
      res.end();
    }
  }

  @Post('complete/async')
  @ApiOperation({
    summary:
      'Async completion — returns jobId immediately, processes in background',
  })
  @ApiResponse({ status: 201, description: 'Job enqueued, returns jobId' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async completeAsync(@Body() dto: CompleteDto, @Req() req: Request) {
    const apiKey = (req as any).apiKey;
    return this.jobs.enqueue({
      prompt: dto.prompt ?? '',
      provider: dto.provider,
      model: dto.model,
      apiKeyRecord: apiKey,
    });
  }
}
