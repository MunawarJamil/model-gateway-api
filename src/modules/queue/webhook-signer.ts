// day 7: HMAC-SHA256 signing for outbound webhook payloads.
//
// Scheme (Stripe-style): sign "<timestamp>.<body>" with the endpoint's secret
// and send the timestamp alongside. Including the timestamp in the signed
// material lets clients reject replays — they verify the signature AND that
// the timestamp is within an acceptable window.
//
//   X-Gateway-Signature: sha256=<hex>
//   X-Gateway-Timestamp: <unix-ms>
//   X-Gateway-Event: <event-name>

import * as crypto from 'crypto';

export function signWebhookPayload(
  secret: string,
  timestamp: number,
  body: string,
): string {
  const message = `${timestamp}.${body}`;
  const hex = crypto.createHmac('sha256', secret).update(message).digest('hex');
  return `sha256=${hex}`;
}
