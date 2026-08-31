import { z } from "zod";
import { invoiceSchema } from ".";

export const SAVED_INVOICES_LOCAL_STORAGE_KEY =
  "EASY_INVOICE_PDF_SAVED_INVOICES";

/**
 * How many versions are kept per invoice.
 *
 * Invoices can embed a base64 logo, so an unbounded history would exhaust the
 * ~5MB localStorage quota quickly. Oldest versions are dropped first.
 */
export const MAX_VERSIONS_PER_INVOICE = 10;

/**
 * A single saved snapshot of an invoice.
 *
 * `version` counts up from 1 and is never reused, so it stays stable in the UI
 * even after older versions are trimmed.
 */
export const savedInvoiceVersionSchema = z.object({
  version: z.number().int().positive(),
  savedAt: z.string(),
  data: invoiceSchema,
});

/**
 * An invoice in the user's saved list, together with its version history.
 *
 * Versions are ordered oldest first, so the last entry is always the current
 * one.
 */
export const savedInvoiceSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  versions: z.array(savedInvoiceVersionSchema).min(1),
});

export const savedInvoicesSchema = z.array(savedInvoiceSchema);

export type SavedInvoiceVersion = z.infer<typeof savedInvoiceVersionSchema>;
export type SavedInvoice = z.infer<typeof savedInvoiceSchema>;
