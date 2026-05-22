import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsageService } from '../usage/usage.service';
import { ProvidersService } from '../providers/providers.service';
import { getErrorMessage } from '../providers/provider.interface';
import { CompleteDto } from './dto/complete.dto';

// The ApiKey context attached to the request by the auth guard.
interface ApiKeyContext {
  id: string;
  defaultProvider: string;
  requestsPerMin: number;
  monthlyTokenLimit: number;
}

@Injectable()
export class CompletionsService {
  private readonly logger = new Logger(CompletionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: UsageService,
    private readonly providers: ProvidersService,
  ) {}

  // ─── Private Helpers ───────────────────────────────────────────────

  /**
   * Resolves the final prompt text from the request.
   * Either a direct prompt or a rendered template — exactly one must be provided.
   */
  private async resolvePrompt(
    dto: CompleteDto,
    userId: string,
  ): Promise<string> {
    const hasPrompt = !!dto.prompt;
    const hasTemplate = !!dto.templateId;

    // Enforce "exactly one" — neither or both is a client error.
    if (hasPrompt && hasTemplate) {
      throw new BadRequestException(
        'Provide either "prompt" or "templateId", not both',
      );
    }
    if (!hasPrompt && !hasTemplate) {
      throw new BadRequestException(
        'Either "prompt" or "templateId" is required',
      );
    }

    // Direct prompt — return as-is.
    if (hasPrompt) {
      return dto.prompt as string;
    }

    // Template path — fetch, verify ownership, then render.
    const template = await this.prisma.promptTemplate.findUnique({
      where: { id: dto.templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Ownership check: a key's user can only use their own templates.
    if (template.userId !== userId) {
      throw new NotFoundException('Template not found');
    }

    return this.renderTemplate(template.content, dto.variables ?? {});
  }

  /**
   * Replaces {{variable}} placeholders in the template content
   * with values from the provided variables map.
   */
  private renderTemplate(
    content: string,
    variables: Record<string, string>,
  ): string {
    const rendered = content.replace(
      /\{\{\s*(\w+)\s*\}\}/g,
      (_match, name: string) => {
        const value = variables[name];
        if (value === undefined) {
          throw new BadRequestException(
            `Missing value for template variable: ${name}`,
          );
        }
        return value;
      },
    );
    return rendered;
  }

  // ─── Public Method ──────────────────────────────────────────────────

  async complete(dto: CompleteDto, apiKey: ApiKeyContext, userId: string) {
    // Step 1 & 2: resolve the final prompt (direct or template-rendered).
    const prompt = await this.resolvePrompt(dto, userId);

    // Step 3: decide the provider — request override wins, else key default.
    const providerName = dto.provider ?? apiKey.defaultProvider;

    // Step 4: rate limit check (throws 429 if exceeded)
    // rate-limit-guard will handle at route level.

    // Step 5: monthly token limit check (throws 429 if exceeded).
    await this.usage.checkMonthlyLimit(apiKey.id, apiKey.monthlyTokenLimit);

    // Step 6: route the completion to a provider (with auto-fallback).
    const startedAt = Date.now();
    let result;
    try {
      result = await this.providers.complete(providerName, {
        prompt,
        model: dto.model,
      });
    } catch (error) {
      // All providers failed — log a failed request row, then surface 502.
      const latencyMs = Date.now() - startedAt;
      await this.safeLogFailure(apiKey.id, providerName, prompt, latencyMs);

      this.logger.error(`Completion failed: ${getErrorMessage(error)}`);
      throw new HttpException(
        {
          statusCode: 502,
          error: 'PROVIDER_FAILURE',
          message: 'All AI providers failed to process the request',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
    const latencyMs = Date.now() - startedAt;

    // Step 7: persist the request log + usage record.
    await this.usage.logRequest({
      apiKeyId: apiKey.id,
      provider: result.provider,
      model: result.model,
      prompt,
      response: result.text,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      latencyMs,
      type: 'sync',
      status: 'success',
    });

    // Step 8: return a clean response to the client.
    return {
      text: result.text,
      provider: result.provider,
      model: result.model,
      fallbackUsed: result.fallbackUsed,
      usage: {
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.promptTokens + result.completionTokens,
      },
      latencyMs,
    };
  }

  /**
   * Logs a failed request without throwing — used inside an error path,
   * so a logging failure must not mask the original provider error.
   */
  private async safeLogFailure(
    apiKeyId: string,
    provider: string,
    prompt: string,
    latencyMs: number,
  ): Promise<void> {
    try {
      await this.usage.logRequest({
        apiKeyId,
        provider,
        model: 'unknown',
        prompt,
        response: '',
        promptTokens: 0,
        completionTokens: 0,
        latencyMs,
        type: 'sync',
        status: 'failed',
      });
    } catch (error) {
      this.logger.error(
        `Failed to log failed request: ${getErrorMessage(error)}`,
      );
    }
  }

  /**
   * day 5 : Streams a completion from the provider chunk by chunk.
   * Yields each chunk to the controller which forwards it over SSE.
   * Logs usage after the stream completes.
   */
  async *stream(
    dto: CompleteDto,
    apiKey: ApiKeyContext,
    signal: AbortSignal,
  ): AsyncGenerator<any> {
    const userId = apiKey.id;
    const prompt = await this.resolvePrompt(dto, userId);
    const providerName = dto.provider ?? apiKey.defaultProvider;

    // Monthly limit check before starting the stream.
    await this.usage.checkMonthlyLimit(apiKey.id, apiKey.monthlyTokenLimit);

    const startedAt = Date.now();

    const chunkStream = this.providers.completeStream(
      providerName,
      { prompt, model: dto.model },
      signal,
    );

    let promptTokens = 0;
    let completionTokens = 0;
    let model = '';

    for await (const chunk of chunkStream) {
      yield chunk;

      // Capture usage from the final chunk for logging.
      if (chunk.done) {
        promptTokens = chunk.promptTokens ?? 0;
        completionTokens = chunk.completionTokens ?? 0;
        model = chunk.model ?? '';
      }
    }

    // Only log if stream completed naturally — not on client disconnect.
    if (!signal.aborted) {
      const latencyMs = Date.now() - startedAt;
      await this.usage.logRequest({
        apiKeyId: apiKey.id,
        provider: providerName,
        model,
        prompt,
        response: '', // full text not accumulated — tokens are enough
        promptTokens,
        completionTokens,
        latencyMs,
        type: 'sync',
        status: 'success',
      });
    }
  }
}
