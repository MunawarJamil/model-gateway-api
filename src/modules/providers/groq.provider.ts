import { Injectable, Logger } from '@nestjs/common';
import Groq from 'groq-sdk';
import { ConfigService } from '@nestjs/config';
import {
  AiProvider,
  CompletionChunk,
  CompletionRequest,
  CompletionResult,
} from './provider.interface';

@Injectable()
export class GroqProvider implements AiProvider {
  readonly name = 'groq';

  private readonly logger = new Logger(GroqProvider.name);
  private readonly client: Groq;
  private readonly defaultModel = 'llama-3.1-8b-instant';

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GROQ_API_KEY');

    // Fail fast: surface a missing key at startup, not on first request.
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    this.client = new Groq({ apiKey });
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const modelName = request.model ?? this.defaultModel;

    // Groq follows the OpenAI-style chat completions format,
    // so the prompt is wrapped as a single user message.
    const completion = await this.client.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: request.prompt }],
    });

    // Groq returns usage under the `usage` field with OpenAI-style names.
    const usage = completion.usage;

    return {
      text: completion.choices[0]?.message?.content ?? '',
      model: modelName,
      promptTokens: usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completion_tokens ?? 0,
    };
  }

  // Groq supports streaming responses via the same chat completions endpoint by setting stream: true. This method handles that streaming logic, yielding chunks of text as they arrive and finally yielding a completion chunk with usage metadata when the stream is done. The caller can pass an AbortSignal to cancel the stream if needed (e.g., if the client disconnects).
  async *completeStream(
    request: CompletionRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<CompletionChunk> {
    const modelName = request.model ?? this.defaultModel;

    // stream: true tells Groq to return an async iterable of chunks
    // instead of waiting for the full response.
    const stream = await this.client.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: request.prompt }],
      stream: true,
    });

    let promptTokens = 0;
    let completionTokens = 0;

    for await (const chunk of stream) {
      // If the caller cancelled (client disconnected), stop processing.
      if (signal?.aborted) break;

      const token = chunk.choices[0]?.delta?.content ?? '';

      // Groq sends usage on the final chunk under x_groq.usage.
      // Capture it when present so we can report it at stream end.
      const groqUsage = (chunk as any).x_groq?.usage;
      if (groqUsage) {
        promptTokens = groqUsage.prompt_tokens ?? 0;
        completionTokens = groqUsage.completion_tokens ?? 0;
      }

      if (token) {
        yield { token, done: false };
      }
    }

    // Final chunk signals the controller that streaming is complete
    // and carries the token counts for usage logging.
    yield {
      token: '',
      done: true,
      model: modelName,
      promptTokens,
      completionTokens,
    };
  }
}
