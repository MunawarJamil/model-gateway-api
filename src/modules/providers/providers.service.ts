import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';
import {
  AiProvider,
  CompletionChunk,
  CompletionRequest,
  CompletionResult,
  getErrorMessage,
} from './provider.interface';

// The shape the router returns: the normalized result plus
// metadata about which provider actually served the request.
export interface RoutedCompletion extends CompletionResult {
  provider: string; // provider that ultimately succeeded
  fallbackUsed: boolean; // true if the primary failed and we switched
}



@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  // A registry mapping provider names to their implementations.
  private readonly registry: Record<string, AiProvider>;

  constructor(gemini: GeminiProvider, groq: GroqProvider) {
    this.registry = {
      [gemini.name]: gemini,
      [groq.name]: groq,
    };
  }

  // Resolves a provider by name, throwing if it is not registered.
  private getProvider(name: string): AiProvider {
    const provider = this.registry[name];
    if (!provider) {
      throw new BadRequestException(`Unknown provider: ${name}`);
    }
    return provider;
  }

  // Picks the fallback provider — whichever registered provider
  // is not the primary one.
  private getFallbackName(primaryName: string): string | null {
    const fallback = Object.keys(this.registry).find(
      (name) => name !== primaryName,
    );
    return fallback ?? null;
  }

  /**
   * Routes a completion request to the chosen provider.
   * If the primary provider fails, automatically retries once
   * with the fallback provider.
   */
  async complete(
    primaryName: string,
    request: CompletionRequest,
  ): Promise<RoutedCompletion> {
    const primary = this.getProvider(primaryName);

    // Attempt 1: primary provider.
    try {
      const result = await primary.complete(request);
      return { ...result, provider: primary.name, fallbackUsed: false };
    } catch (error) {
      this.logger.warn(
        `Primary provider "${primary.name}" failed: ${getErrorMessage(error)}. Trying fallback.`,
      );
    }

    // Attempt 2: fallback provider.
    const fallbackName = this.getFallbackName(primaryName);
    if (!fallbackName) {
      throw new Error('Primary provider failed and no fallback is available');
    }

    const fallback = this.getProvider(fallbackName);
    try {
      const result = await fallback.complete(request);
      return { ...result, provider: fallback.name, fallbackUsed: true };
    } catch (error) {
      // Both providers failed — surface a clear error upstream.
      this.logger.error(
        `Fallback provider "${fallback.name}" also failed: ${getErrorMessage(error)}`,
      );
      throw new Error('All AI providers failed to process the request');
    }
  }



  /**
   * Routes a streaming request to the chosen provider.
   * No fallback for streaming — if the primary fails, the error
   * surfaces immediately since we are mid-stream.
   */
  async *completeStream(
    primaryName: string,
    request: CompletionRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<CompletionChunk> {
    const provider = this.getProvider(primaryName);
    yield* provider.completeStream(request, signal);
  }



}
