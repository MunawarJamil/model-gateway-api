export const COMPLETION_QUEUE = 'completion-queue';

// day 7: delivery queue for outbound webhooks (separate so retries don't
// share workers with completions).
export const WEBHOOK_QUEUE = 'webhook-queue';

// day 7: fixed retry schedule — 1s, 5s, 30s, 2min between attempts.
export const WEBHOOK_RETRY_DELAYS_MS = [1_000, 5_000, 30_000, 120_000];

// day 7: 1 initial attempt + 4 retries = 5 total.
export const WEBHOOK_MAX_ATTEMPTS = 1 + WEBHOOK_RETRY_DELAYS_MS.length;

// day 7: BullMQ calls this after each failure to compute delay before the
// next attempt. attemptsMade is 1-indexed (1 after 1st fail).
export const webhookBackoffStrategy = (attemptsMade: number): number => {
  return (
    WEBHOOK_RETRY_DELAYS_MS[attemptsMade - 1] ??
    WEBHOOK_RETRY_DELAYS_MS[WEBHOOK_RETRY_DELAYS_MS.length - 1]
  );
};
