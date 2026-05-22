import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';

@Module({
  providers: [ProvidersService, GeminiProvider, GroqProvider],
  // Only ProvidersService is exported — the router is the public entry point.
  // GeminiProvider and GroqProvider stay internal to this module.
  exports: [ProvidersService],
})
export class ProvidersModule {}