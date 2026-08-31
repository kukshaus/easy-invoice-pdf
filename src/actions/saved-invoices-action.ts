"use server";

import { invoiceSchema, type InvoiceData } from "@/app/schema";
import {
  MAX_VERSIONS_PER_INVOICE,
  savedInvoicesSchema,
  type SavedInvoice,
} from "@/app/schema/saved-invoice";
import {
  generateAccessKey,
  isValidAccessKey,
  readAccessKey,
  writeAccessKey,
} from "@/lib/invoice-access-key";
import { checkInMemoryRateLimit } from "@/lib/in-memory-rate-limit";
import {
  InvoiceTooLargeError,
  listStoredInvoices,
  putStoredInvoice,
  removeStoredInvoice,
  TooManyInvoicesError,
} from "@/lib/invoice-store";
import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";

interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

const STORAGE_UNAVAILABLE =
  "Could not reach invoice storage on the server. Check that the data directory is writable.";

function toErrorResult(error: unknown): ActionResult<never> {
  if (
    error instanceof InvoiceTooLargeError ||
    error instanceof TooManyInvoicesError
  ) {
    return { ok: false, error: error.message };
  }

  console.error("Saved invoices action failed:", error);
  Sentry.captureException(error);

  return { ok: false, error: STORAGE_UNAVAILABLE };
}

function clientIp() {
  const forwardedFor = headers().get("x-forwarded-for");

  return forwardedFor?.split(",")[0]?.trim() || "127.0.0.1";
}

// Saving is a normal repeated action, so this only exists to stop one client
// hammering the disk
function checkWriteRateLimit() {
  return checkInMemoryRateLimit({
    identifier: clientIp(),
    limit: 120,
    windowMs: 60 * 60 * 1000,
  });
}

function latestVersionNumber(invoice: SavedInvoice) {
  return invoice.versions[invoice.versions.length - 1].version;
}

/**
 * Returns the caller's invoices, or an empty list when they have never saved
 * anything. Never mints a key: that only happens on an actual save, so simply
 * visiting the page does not create storage.
 */
export async function getInvoicesAction(): Promise<
  ActionResult<{ accessKey: string | null; invoices: SavedInvoice[] }>
> {
  const accessKey = readAccessKey();

  if (!accessKey) {
    return { ok: true, data: { accessKey: null, invoices: [] } };
  }

  try {
    return {
      ok: true,
      data: { accessKey, invoices: await listStoredInvoices(accessKey) },
    };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function saveInvoiceAction(
  input: unknown,
  { forceNew = false }: { forceNew?: boolean } = {},
): Promise<
  ActionResult<{ accessKey: string; version: number; created: boolean }>
> {
  const parsed = invoiceSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "This invoice could not be validated." };
  }

  if (!checkWriteRateLimit().success) {
    return { ok: false, error: "Too many saves. Please try again later." };
  }

  // Mint a key on first save so that merely opening the app stores nothing
  let accessKey = readAccessKey();
  const isNewKey = !accessKey;

  if (!accessKey) {
    accessKey = generateAccessKey();
  }

  const data: InvoiceData = parsed.data;
  const now = new Date().toISOString();

  try {
    const invoices = await listStoredInvoices(accessKey);

    // The invoice number is the natural key, so re-saving the same number adds
    // a version rather than creating a duplicate
    const existing = forceNew
      ? undefined
      : invoices.find(
          (invoice) =>
            invoice.versions[invoice.versions.length - 1].data
              .invoiceNumberObject?.value === data.invoiceNumberObject?.value,
        );

    const invoice: SavedInvoice = existing
      ? {
          ...existing,
          updatedAt: now,
          versions: [
            ...existing.versions,
            { version: latestVersionNumber(existing) + 1, savedAt: now, data },
          ].slice(-MAX_VERSIONS_PER_INVOICE),
        }
      : {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          versions: [{ version: 1, savedAt: now, data }],
        };

    await putStoredInvoice(accessKey, invoice);

    if (isNewKey) {
      writeAccessKey(accessKey);
    }

    return {
      ok: true,
      data: {
        accessKey,
        version: latestVersionNumber(invoice),
        created: !existing,
      },
    };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function deleteInvoiceAction(
  id: string,
): Promise<ActionResult<null>> {
  const accessKey = readAccessKey();

  if (!accessKey) {
    return { ok: false, error: "No saved invoices to delete." };
  }

  try {
    await removeStoredInvoice(accessKey, id);

    return { ok: true, data: null };
  } catch (error) {
    return toErrorResult(error);
  }
}

/**
 * Adopts an access key from another device. The format is validated before it
 * is used, since it becomes a filename on the server.
 */
export async function loadAccessKeyAction(
  key: string,
): Promise<ActionResult<{ invoices: SavedInvoice[] }>> {
  if (!isValidAccessKey(key)) {
    return { ok: false, error: "That access key is not valid." };
  }

  try {
    const invoices = await listStoredInvoices(key);

    writeAccessKey(key);

    return { ok: true, data: { invoices } };
  } catch (error) {
    return toErrorResult(error);
  }
}

/**
 * One-time migration of invoices previously kept in localStorage.
 */
export async function importInvoicesAction(
  input: unknown,
): Promise<ActionResult<{ accessKey: string; imported: number }>> {
  const parsed = savedInvoicesSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Those invoices could not be read." };
  }

  if (!checkWriteRateLimit().success) {
    return { ok: false, error: "Too many saves. Please try again later." };
  }

  let accessKey = readAccessKey();
  const isNewKey = !accessKey;

  if (!accessKey) {
    accessKey = generateAccessKey();
  }

  try {
    const existing = await listStoredInvoices(accessKey);
    const existingIds = new Set(existing.map((invoice) => invoice.id));

    const toImport = parsed.data.filter(
      (invoice) => !existingIds.has(invoice.id),
    );

    for (const invoice of toImport) {
      await putStoredInvoice(accessKey, invoice);
    }

    if (isNewKey) {
      writeAccessKey(accessKey);
    }

    return { ok: true, data: { accessKey, imported: toImport.length } };
  } catch (error) {
    return toErrorResult(error);
  }
}
