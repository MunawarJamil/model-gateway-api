import { Injectable, Logger } from '@nestjs/common';
import Groq from 'groq-sdk';
import { ConfigService } from '@nestjs/config';
import {
  AiProvider,
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
}
