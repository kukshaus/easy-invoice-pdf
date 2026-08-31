import {
  savedInvoicesSchema,
  type SavedInvoice,
} from "@/app/schema/saved-invoice";
import { isValidAccessKey } from "@/lib/invoice-access-key";
import * as Sentry from "@sentry/nextjs";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Invoices are kept as one JSON file per access key on the server's disk.
 *
 * This deliberately avoids a database: the app is a single Node process, the
 * data is small, and each access key touches only its own file, so there is no
 * shared table to contend on.
 *
 * The directory must point at persistent storage. On a container host the
 * filesystem is wiped on every redeploy unless a volume is mounted, which
 * would silently discard every saved invoice.
 */
function dataDir() {
  return (
    process.env.INVOICE_DATA_DIR ?? path.join(process.cwd(), "data", "invoices")
  );
}

/**
 * The access key becomes a filename, so it is re-validated here rather than
 * trusting the caller: anything outside `inv_<32 hex>` could escape the data
 * directory.
 */
function fileFor(accessKey: string) {
  if (!isValidAccessKey(accessKey)) {
    throw new Error("Invalid access key");
  }

  return path.join(dataDir(), `${accessKey}.json`);
}

/**
 * Serializes writes per access key within this process, so two saves arriving
 * together cannot read-modify-write over each other.
 */
const writeQueues = new Map<string, Promise<unknown>>();

function enqueue<T>(accessKey: string, task: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(accessKey) ?? Promise.resolve();

  const next = previous.then(task, task);

  // Keep the chain going but never leak a rejection into the next caller
  writeQueues.set(
    accessKey,
    next.catch(() => undefined),
  );

  return next;
}

async function readAll(accessKey: string): Promise<SavedInvoice[]> {
  try {
    const raw = await readFile(fileFor(accessKey), "utf8");

    const parsed = savedInvoicesSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      Sentry.captureException(parsed.error);

      return [];
    }

    return parsed.data;
  } catch (error) {
    // A key with nothing saved yet simply has no file
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

/**
 * Written to a temporary file and renamed, which is atomic on the same
 * filesystem, so an interrupted write cannot leave a half-written file behind.
 */
async function writeAll(accessKey: string, invoices: SavedInvoice[]) {
  const target = fileFor(accessKey);

  await mkdir(path.dirname(target), { recursive: true });

  const temporary = `${target}.${randomUUID()}.tmp`;

  await writeFile(temporary, JSON.stringify(invoices), "utf8");
  await rename(temporary, target);
}

export async function listStoredInvoices(
  accessKey: string,
): Promise<SavedInvoice[]> {
  return readAll(accessKey);
}

/**
 * Anyone can write here without an account, so both the size of one invoice
 * and the number kept per key are bounded. A logo is embedded as base64 in
 * every version, which is what makes a single invoice big.
 */
export const MAX_INVOICE_BYTES = 2_000_000;
export const MAX_INVOICES_PER_KEY = 200;

export class InvoiceTooLargeError extends Error {
  constructor() {
    super("Invoice is too large to store. Try removing the logo.");
    this.name = "InvoiceTooLargeError";
  }
}

export class TooManyInvoicesError extends Error {
  constructor() {
    super(
      `You have reached the limit of ${MAX_INVOICES_PER_KEY} saved invoices. Delete one to save another.`,
    );
    this.name = "TooManyInvoicesError";
  }
}

export async function putStoredInvoice(
  accessKey: string,
  invoice: SavedInvoice,
) {
  if (JSON.stringify(invoice).length > MAX_INVOICE_BYTES) {
    throw new InvoiceTooLargeError();
  }

  return enqueue(accessKey, async () => {
    const invoices = await readAll(accessKey);
    const index = invoices.findIndex((current) => current.id === invoice.id);

    if (index === -1) {
      if (invoices.length >= MAX_INVOICES_PER_KEY) {
        throw new TooManyInvoicesError();
      }

      invoices.push(invoice);
    } else {
      invoices[index] = invoice;
    }

    await writeAll(accessKey, invoices);
  });
}

export async function removeStoredInvoice(accessKey: string, id: string) {
  return enqueue(accessKey, async () => {
    const invoices = await readAll(accessKey);

    await writeAll(
      accessKey,
      invoices.filter((invoice) => invoice.id !== id),
    );
  });
}
