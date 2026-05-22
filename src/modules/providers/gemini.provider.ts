import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import {
  AiProvider,
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
}
