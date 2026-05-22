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

@Controller()
// Guards run in order: authenticate the API key first, then rate-limit it.
@UseGuards(ApiKeyGuard, RateLimitGuard)
export class CompletionsController {
  private readonly logger = new Logger(CompletionsController.name);
  constructor(
    private readonly completions: CompletionsService,
    private readonly jobs: JobsService,
  ) {}

  @Post('complete')
  async complete(@Body() dto: CompleteDto, @Req() req: Request) {
    // ApiKeyGuard attaches the authenticated API key to the request.
    const apiKey = (req as any).apiKey;

    return this.completions.complete(dto, apiKey, apiKey.userId);
  }

  @Post('complete/stream')
  async completeStream(
    @Body() dto: CompleteDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const apiKey = (req as any).apiKey;

    // Set SSE headers — tells the client to expect a stream of events,
    // not a single JSON response.
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // AbortController lets us cancel the upstream provider call
    // if the client disconnects before the stream finishes.
    const abortController = new AbortController();
    req.on('close', () => abortController.abort());

    try {
      const stream = this.completions.stream(
        dto,
        apiKey,
        abortController.signal,
      );

      for await (const chunk of stream) {
        // Client disconnected — stop sending.
        if (abortController.signal.aborted) break;

        // SSE format: each event is "data: <json>\n\n"
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);

        // Final chunk — close the connection cleanly.
        if (chunk.done) break;
      }
    } catch (error) {
      // Send error as a final SSE event so the client knows what happened.
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
// day-6 : Added an async endpoint for non-streaming completions that enqueues a job instead of processing immediately. The controller passes the prompt, provider/model choice, and API key info to the JobsService which adds it to a queue for background processing. This allows handling of long-running requests without keeping the client waiting, and we can implement retries or other logic in the job processor if needed.
  @Post('complete/async')
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
