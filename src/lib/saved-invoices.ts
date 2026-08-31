import {
  SAVED_INVOICES_LOCAL_STORAGE_KEY,
  savedInvoicesSchema,
  type SavedInvoice,
} from "@/app/schema/saved-invoice";
import { isLocalStorageAvailable } from "@/lib/check-local-storage";
import * as Sentry from "@sentry/nextjs";

/**
 * Invoices are stored on the server against an access key. This module only
 * reads the localStorage collection used before that move, so those invoices
 * can be imported once and then dropped.
 */
export function getLegacyInvoices(): SavedInvoice[] {
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
      Sentry.captureException(parsed.error);

      return [];
    }

    return parsed.data;
  } catch (error) {
    console.error("Failed to read locally saved invoices:", error);
    Sentry.captureException(error);

    return [];
  }
}

export function clearLegacyInvoices() {
  if (!isLocalStorageAvailable) {
    return;
  }

  try {
    localStorage.removeItem(SAVED_INVOICES_LOCAL_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear locally saved invoices:", error);
    Sentry.captureException(error);
  }
}

export function getLatestVersion(invoice: SavedInvoice) {
  return invoice.versions[invoice.versions.length - 1];
}

export function getInvoiceNumber(invoice: SavedInvoice) {
  return getLatestVersion(invoice).data.invoiceNumberObject?.value ?? "";
}
