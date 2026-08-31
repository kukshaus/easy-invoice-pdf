import {
  savedInvoiceSchema,
  type SavedInvoice,
} from "@/app/schema/saved-invoice";
import { redis } from "@/lib/redis";
import * as Sentry from "@sentry/nextjs";

/**
 * One Redis hash per access key, with a field per invoice. A hash keeps saving
 * a single invoice from rewriting the whole collection, and lets deletes touch
 * only the one field.
 */
const hashKey = (accessKey: string) => `invoices:${accessKey}`;

/**
 * Upstash rejects very large payloads, and a logo is stored as base64 inside
 * every version, so an invoice with a big logo and a long history can get
 * surprisingly heavy. Reject it with a clear message instead of failing deep
 * inside the Redis client.
 */
export const MAX_INVOICE_BYTES = 900_000;

/**
 * The Upstash client deserializes JSON automatically, but older records may
 * still come back as strings, so accept both shapes.
 */
function parseStoredInvoice(value: unknown): SavedInvoice | null {
  try {
    const raw: unknown = typeof value === "string" ? JSON.parse(value) : value;

    const parsed = savedInvoiceSchema.safeParse(raw);

    if (!parsed.success) {
      Sentry.captureException(parsed.error);

      return null;
    }

    return parsed.data;
  } catch (error) {
    Sentry.captureException(error);

    return null;
  }
}

export async function listStoredInvoices(
  accessKey: string,
): Promise<SavedInvoice[]> {
  const stored = await redis.hgetall<Record<string, unknown>>(
    hashKey(accessKey),
  );

  if (!stored) {
    return [];
  }

  // One unreadable record must not take the whole list down
  return Object.values(stored)
    .map(parseStoredInvoice)
    .filter((invoice): invoice is SavedInvoice => invoice !== null);
}

export async function putStoredInvoice(
  accessKey: string,
  invoice: SavedInvoice,
) {
  const serialized = JSON.stringify(invoice);

  if (serialized.length > MAX_INVOICE_BYTES) {
    throw new InvoiceTooLargeError();
  }

  await redis.hset(hashKey(accessKey), { [invoice.id]: serialized });
}

export async function removeStoredInvoice(accessKey: string, id: string) {
  await redis.hdel(hashKey(accessKey), id);
}

export class InvoiceTooLargeError extends Error {
  constructor() {
    super("Invoice is too large to store. Try removing the logo.");
    this.name = "InvoiceTooLargeError";
  }
}
