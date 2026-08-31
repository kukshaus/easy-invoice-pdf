import { env } from "@/env";
import { Resend } from "resend";

let client: Resend | undefined;

/**
 * The Resend constructor throws when the API key is missing, so creating the
 * client at module scope breaks `next build` on hosts that only inject secrets
 * at runtime (e.g. Coolify): collecting page data imports every route, and
 * `/confirm-subscription` pulls in this module. Create it on first use instead.
 */
export function getResend() {
  client ??= new Resend(env.RESEND_API_KEY);

  return client;
}
