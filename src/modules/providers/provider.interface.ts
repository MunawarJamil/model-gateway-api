// Each provider which will implement this interface — Gemini or Groq, they will have the same shape
export interface CompletionRequest {
  prompt: string;
  model?: string; // optional , if not provided, we can use a default model for that provider
}

// Response will be same for both providers — either Gemini or Groq, so we can have a common interface for the result
export interface CompletionResult {
  text: string; // generated text from the model
  model: string; // which model was used to generate this response
  promptTokens: number; // input tokens
  completionTokens: number; // output tokens
}

// Represents a single chunk yielded during streaming.
// Each chunk carries a token fragment; the final chunk sets done=true and includes usage.
export interface CompletionChunk {
  token: string; // text fragment from the model (empty string on final chunk)
  done: boolean; // true only on the last chunk
  model?: string; // populated on the final chunk
  promptTokens?: number; // populated on the final chunk
  completionTokens?: number; // populated on the final chunk
}

// This is the main contract that all providers must adhere to — they must have a name and a complete method which takes a CompletionRequest and returns a CompletionResult
export interface AiProvider {
  // name of the provider, e.g., "gemini" or "groq"
  readonly name: string;

  // Sync completion — waits for the full response before returning
  complete(request: CompletionRequest): Promise<CompletionResult>;

  // Streaming completion — yields chunks as they arrive from the provider
  // AsyncGenerator: each next() call gives the next chunk until done=true
  completeStream(
    request: CompletionRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<CompletionChunk>;
}

// A helper function to extract error messages from unknown error types, since not all thrown errors may be instances of the Error class. This is useful for consistent error handling across the service.
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
