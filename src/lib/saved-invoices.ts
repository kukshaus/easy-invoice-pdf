import {
  MAX_VERSIONS_PER_INVOICE,
  SAVED_INVOICES_LOCAL_STORAGE_KEY,
  savedInvoicesSchema,
  type SavedInvoice,
} from "@/app/schema/saved-invoice";
import type { InvoiceData } from "@/app/schema";
import { isLocalStorageAvailable } from "@/lib/check-local-storage";
import * as Sentry from "@sentry/nextjs";

/**
 * Saved invoices live in localStorage alongside the sellers and buyers lists.
 * There is no backend, so everything here is per-browser.
 */
export function getSavedInvoices(): SavedInvoice[] {
  if (!isLocalStorageAvailable) {
    return [];
  }

  try {
    const raw = localStorage.getItem(SAVED_INVOICES_LOCAL_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = savedInvoicesSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      // A single unreadable entry should not take the whole list down, but we
      // also must not silently hand back corrupt data
      Sentry.captureException(parsed.error);

      return [];
    }

    return parsed.data;
  } catch (error) {
    console.error("Failed to read saved invoices:", error);
    Sentry.captureException(error);

    return [];
  }
}

function persist(invoices: SavedInvoice[]) {
  localStorage.setItem(
    SAVED_INVOICES_LOCAL_STORAGE_KEY,
    JSON.stringify(invoices),
  );
}

/**
 * The invoice number is the natural key: saving an invoice whose number
 * already exists appends a version to it rather than creating a duplicate.
 */
function findByInvoiceNumber(invoices: SavedInvoice[], invoiceNumber: string) {
  return invoices.find((invoice) => {
    const latest = invoice.versions[invoice.versions.length - 1];

    return latest.data.invoiceNumberObject?.value === invoiceNumber;
  });
}

export function getInvoiceNumber(invoice: SavedInvoice) {
  const latest = getLatestVersion(invoice);

  return latest.data.invoiceNumberObject?.value ?? "";
}

export function getLatestVersion(invoice: SavedInvoice) {
  return invoice.versions[invoice.versions.length - 1];
}

interface SaveResult {
  status: "created" | "updated" | "error";
  invoice?: SavedInvoice;
  message?: string;
}

/**
 * Saves the given invoice data as a new version.
 *
 * @param forceNew when true a new entry is always created, even if an invoice
 * with the same number already exists ("Save as new").
 */
export function saveInvoice(
  data: InvoiceData,
  { forceNew = false }: { forceNew?: boolean } = {},
): SaveResult {
  if (!isLocalStorageAvailable) {
    return {
      status: "error",
      message: "Saving is unavailable because localStorage is blocked.",
    };
  }

  const invoices = getSavedInvoices();
  const invoiceNumber = data.invoiceNumberObject?.value ?? "";
  const now = new Date().toISOString();

  const existing = forceNew
    ? undefined
    : findByInvoiceNumber(invoices, invoiceNumber);

  try {
    if (existing) {
      const nextVersion = getLatestVersion(existing).version + 1;

      const versions = [
        ...existing.versions,
        { version: nextVersion, savedAt: now, data },
      ].slice(-MAX_VERSIONS_PER_INVOICE);

      const updated: SavedInvoice = { ...existing, updatedAt: now, versions };

      persist(
        invoices.map((invoice) =>
          invoice.id === existing.id ? updated : invoice,
        ),
      );

      return { status: "updated", invoice: updated };
    }

    const created: SavedInvoice = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      versions: [{ version: 1, savedAt: now, data }],
    };

    persist([created, ...invoices]);

    return { status: "created", invoice: created };
  } catch (error) {
    console.error("Failed to save invoice:", error);
    Sentry.captureException(error);

    // Quota is the realistic failure here: logos are stored as base64
    const isQuotaError =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED");

    return {
      status: "error",
      message: isQuotaError
        ? "Storage is full. Delete an older invoice and try again."
        : "Failed to save the invoice.",
    };
  }
}

export function deleteSavedInvoice(id: string) {
  if (!isLocalStorageAvailable) {
    return;
  }

  try {
    persist(getSavedInvoices().filter((invoice) => invoice.id !== id));
  } catch (error) {
    console.error("Failed to delete saved invoice:", error);
    Sentry.captureException(error);
  }
}
