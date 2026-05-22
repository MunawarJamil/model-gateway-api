import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import {
  AiProvider,
  CompletionChunk,
  CompletionRequest,
  CompletionResult,
} from './provider.interface';

@Injectable()
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';

  private readonly logger = new Logger(GeminiProvider.name);
  private readonly client: GoogleGenerativeAI;
  private readonly defaultModel = 'gemini-2.0-flash';

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');

    // Fail fast: if the key is missing, surface it at startup
    // rather than on the first request.
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    this.client = new GoogleGenerativeAI(apiKey);
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const modelName = request.model ?? this.defaultModel;

    const model = this.client.getGenerativeModel({ model: modelName });

    const result = await model.generateContent(request.prompt);
    const response = result.response;

    // Gemini returns token counts under usageMetadata.
    // It can be undefined for certain responses, so we default to 0.
    const usage = response.usageMetadata;

    return {
      text: response.text(),
      model: modelName,
      promptTokens: usage?.promptTokenCount ?? 0,
      completionTokens: usage?.candidatesTokenCount ?? 0,
    };
  }

  // Method to handle streaming completions. It yields chunks of text as they arrive from Gemini, and finally yields a completion chunk with usage metadata once the stream is done. The caller can optionally pass an AbortSignal to cancel the stream if needed (e.g., if the client disconnects).
  async *completeStream(
    request: CompletionRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<CompletionChunk> {
    const modelName = request.model ?? this.defaultModel;
    const model = this.client.getGenerativeModel({ model: modelName });

    // generateContentStream returns an iterable stream of chunks.
    // Each chunk may carry a text fragment and/or usage metadata.
    const { stream, response } = await model.generateContentStream(
      request.prompt,
    );

    for await (const chunk of stream) {
      // If the caller cancelled (client disconnected), stop processing.
      if (signal?.aborted) break;

      const token = chunk.text();
      if (token) {
        yield { token, done: false };
      }
    }

    // The aggregated response is resolved after the stream ends.
    // This is where Gemini exposes the final token counts.
    const finalResponse = await response;
    const usage = finalResponse.usageMetadata;

    yield {
      token: '',
      done: true,
      model: modelName,
      promptTokens: usage?.promptTokenCount ?? 0,
      completionTokens: usage?.candidatesTokenCount ?? 0,
    };
  }
}
