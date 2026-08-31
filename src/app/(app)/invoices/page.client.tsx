"use client";

import { PDF_DATA_LOCAL_STORAGE_KEY, type InvoiceData } from "@/app/schema";
import type { SavedInvoice } from "@/app/schema/saved-invoice";
import { ProjectLogo } from "@/components/etc/project-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  deleteInvoiceAction,
  getInvoicesAction,
  importInvoicesAction,
} from "@/actions/saved-invoices-action";
import {
  clearLegacyInvoices,
  getInvoiceNumber,
  getLatestVersion,
  getLegacyInvoices,
} from "@/lib/saved-invoices";
import { AccessKeyPanel } from "./access-key-panel";
import { umamiTrackEvent } from "@/lib/umami-analytics-track-event";
import { cn } from "@/lib/utils";
import * as Sentry from "@sentry/nextjs";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileText,
  History,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "../utils/format-currency";

dayjs.extend(relativeTime);

export function InvoicesPageClient() {
  const [invoices, setInvoices] = useState<SavedInvoice[] | null>(null);
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [legacyInvoices, setLegacyInvoices] = useState<SavedInvoice[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<SavedInvoice | null>(
    null,
  );

  useEffect(() => {
    const load = async () => {
      const result = await getInvoicesAction();

      if (!result.ok || !result.data) {
        setLoadError(result.error ?? "Could not load your invoices.");
        setInvoices([]);

        return;
      }

      setAccessKey(result.data.accessKey);
      setInvoices(result.data.invoices);

      // Invoices saved before storage moved to the server are still sitting in
      // this browser, so offer to move them across once
      const stored = getLegacyInvoices();
      const storedIds = new Set(result.data.invoices.map(({ id }) => id));

      setLegacyInvoices(stored.filter(({ id }) => !storedIds.has(id)));
    };

    void load();
  }, []);

  const handleImportLegacy = async () => {
    if (isImporting) {
      return;
    }

    setIsImporting(true);

    try {
      const result = await importInvoicesAction(legacyInvoices);

      if (!result.ok || !result.data) {
        toast.error(result.error ?? "Could not import your local invoices");

        return;
      }

      const refreshed = await getInvoicesAction();

      if (refreshed.ok && refreshed.data) {
        setAccessKey(refreshed.data.accessKey);
        setInvoices(refreshed.data.invoices);
      }

      clearLegacyInvoices();
      setLegacyInvoices([]);

      toast.success(
        `Moved ${result.data.imported} invoice${
          result.data.imported === 1 ? "" : "s"
        } to your account key`,
      );
    } finally {
      setIsImporting(false);
    }
  };

  const filtered = useMemo(() => {
    if (!invoices) {
      return [];
    }

    const term = query.trim().toLowerCase();

    const matching = term
      ? invoices.filter((invoice) => {
          const latest = getLatestVersion(invoice).data;

          return [
            getInvoiceNumber(invoice),
            latest.buyer?.name ?? "",
            latest.seller?.name ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(term);
        })
      : invoices;

    // Most recently touched first
    return [...matching].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [invoices, query]);

  /**
   * Opening a saved invoice replaces the working draft and returns to the
   * editor, which reads that same localStorage key on mount.
   */
  const openInEditor = (data: InvoiceData, label: string) => {
    try {
      localStorage.setItem(PDF_DATA_LOCAL_STORAGE_KEY, JSON.stringify(data));

      umamiTrackEvent("open_saved_invoice");

      // Full navigation so the editor re-reads localStorage rather than
      // restoring cached client state
      window.location.href = `/?template=${data.template}`;
    } catch (error) {
      console.error("Failed to open saved invoice:", error);
      toast.error(`Failed to open ${label}`);

      Sentry.captureException(error);
    }
  };

  const handleDelete = async () => {
    if (!invoiceToDelete) {
      return;
    }

    const result = await deleteInvoiceAction(invoiceToDelete.id);

    setInvoiceToDelete(null);

    if (!result.ok) {
      toast.error(result.error ?? "Failed to delete the invoice");

      return;
    }

    setInvoices((current) =>
      (current ?? []).filter((invoice) => invoice.id !== invoiceToDelete.id),
    );

    toast.success("Invoice deleted");
  };

  // Render nothing until the first load resolves
  if (!invoices) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-gray-100 pb-10 sm:p-4">
        <div className="mx-auto w-full max-w-7xl bg-white p-4 shadow-lg sm:rounded-lg sm:p-6 2xl:max-w-[1680px]">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ProjectLogo className="h-8 w-8" />
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  My invoices
                </h1>
                <p className="text-sm text-slate-500">
                  {invoices.length === 0
                    ? "No saved invoices yet"
                    : `${invoices.length} saved ${
                        invoices.length === 1 ? "invoice" : "invoices"
                      }`}
                </p>
              </div>
            </div>

            <Button asChild _variant="outline">
              <Link href="/">
                <FilePlus2 className="mr-2 h-4 w-4" />
                Back to editor
              </Link>
            </Button>
          </header>

          {loadError ? (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {loadError}
            </p>
          ) : null}

          {legacyInvoices.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                {legacyInvoices.length} invoice
                {legacyInvoices.length === 1 ? "" : "s"} saved in this browser
                before invoices moved to server storage.
              </p>
              <Button
                _size="sm"
                onClick={() => void handleImportLegacy()}
                disabled={isImporting}
              >
                {isImporting ? "Moving..." : "Move them to my account key"}
              </Button>
            </div>
          ) : null}

          <AccessKeyPanel
            accessKey={accessKey}
            onAdopted={(adopted, key) => {
              setInvoices(adopted);
              setAccessKey(key);
              setLoadError(null);
            }}
          />

          {invoices.length > 0 ? (
            <div className="relative mb-4 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by number, buyer or seller"
                className="pl-9"
                aria-label="Search invoices"
              />
            </div>
          ) : null}

          {invoices.length === 0 ? (
            <EmptyState />
          ) : filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
              No invoices match &quot;{query}&quot;.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-8 px-3 py-3" />
                      <th className="px-3 py-3 font-medium">Invoice</th>
                      <th className="px-3 py-3 font-medium">Buyer</th>
                      <th className="px-3 py-3 font-medium">Issued</th>
                      <th className="px-3 py-3 font-medium">Due</th>
                      <th className="px-3 py-3 text-right font-medium">
                        Total
                      </th>
                      <th className="px-3 py-3 font-medium">Version</th>
                      <th className="px-3 py-3 font-medium">Updated</th>
                      <th className="px-3 py-3 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((invoice) => (
                      <InvoiceRow
                        key={invoice.id}
                        invoice={invoice}
                        isExpanded={expandedId === invoice.id}
                        onToggle={() =>
                          setExpandedId(
                            expandedId === invoice.id ? null : invoice.id,
                          )
                        }
                        onOpen={openInEditor}
                        onDelete={() => setInvoiceToDelete(invoice)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Invoices are stored on the server against your access key, so they
            survive clearing this browser. Keep the key safe: it is the only way
            back to them.
          </p>
        </div>
      </div>

      <AlertDialog
        open={Boolean(invoiceToDelete)}
        onOpenChange={(open) => !open && setInvoiceToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              {invoiceToDelete
                ? `"${getInvoiceNumber(invoiceToDelete)}" and all ${
                    invoiceToDelete.versions.length
                  } of its versions will be permanently deleted. This cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvoiceToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

function InvoiceRow({
  invoice,
  isExpanded,
  onToggle,
  onOpen,
  onDelete,
}: {
  invoice: SavedInvoice;
  isExpanded: boolean;
  onToggle: () => void;
  onOpen: (data: InvoiceData, label: string) => void;
  onDelete: () => void;
}) {
  const latest = getLatestVersion(invoice);
  const data = latest.data;
  const invoiceNumber = getInvoiceNumber(invoice);
  const hasHistory = invoice.versions.length > 1;

  const total = formatCurrency({
    amount: data.total,
    currency: data.currency,
    language: data.language,
  });

  return (
    <>
      <tr className="group transition-colors hover:bg-slate-50">
        <td className="px-3 py-3 align-middle">
          {hasHistory ? (
            <button
              type="button"
              onClick={onToggle}
              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
              aria-label={
                isExpanded ? "Hide version history" : "Show version history"
              }
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </td>

        <td className="px-3 py-3 font-medium text-slate-900">
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4 flex-shrink-0 text-slate-400" />
            {invoiceNumber || "Untitled"}
          </span>
        </td>

        <td className="px-3 py-3 text-slate-700">{data.buyer?.name || "—"}</td>
        <td className="px-3 py-3 text-slate-600">{data.dateOfIssue}</td>
        <td className="px-3 py-3 text-slate-600">{data.paymentDue}</td>
        <td className="px-3 py-3 text-right font-medium text-slate-900">
          {total}
        </td>

        <td className="px-3 py-3">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              hasHistory
                ? "bg-blue-50 text-blue-700"
                : "bg-slate-100 text-slate-600",
            )}
          >
            v{latest.version}
          </span>
        </td>

        <td className="px-3 py-3 text-slate-500">
          {dayjs(invoice.updatedAt).fromNow()}
        </td>

        <td className="px-3 py-3">
          <div className="flex items-center justify-end gap-1">
            <Button
              _variant="outline"
              _size="sm"
              onClick={() => onOpen(data, invoiceNumber)}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Open
            </Button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label={`Delete invoice ${invoiceNumber}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>

      {isExpanded
        ? [...invoice.versions].reverse().map((version, index) => (
            <tr key={version.version} className="bg-slate-50/60 text-xs">
              <td />
              <td className="py-2 pl-9 pr-3 text-slate-600" colSpan={5}>
                <span className="flex items-center gap-2">
                  <History className="h-3.5 w-3.5 text-slate-400" />
                  Saved {dayjs(version.savedAt).format("MMM D, YYYY HH:mm")}
                  {index === 0 ? (
                    <span className="text-slate-400">(current)</span>
                  ) : null}
                </span>
              </td>
              <td className="px-3 py-2 text-slate-500">v{version.version}</td>
              <td className="px-3 py-2 text-slate-500">
                {dayjs(version.savedAt).fromNow()}
              </td>
              <td className="px-3 py-2 text-right">
                {index === 0 ? null : (
                  <Button
                    _variant="outline"
                    _size="sm"
                    onClick={() =>
                      onOpen(
                        version.data,
                        `${invoiceNumber} v${version.version}`,
                      )
                    }
                  >
                    Restore
                  </Button>
                )}
              </td>
            </tr>
          ))
        : null}
    </>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 p-12 text-center">
      <FileText className="mx-auto h-10 w-10 text-slate-300" />
      <h2 className="mt-4 text-base font-medium text-slate-900">
        No saved invoices yet
      </h2>
      <p className="mx-auto mt-1 max-w-md text-pretty text-sm text-slate-500">
        Invoices you save from the editor show up here, together with every
        version you save.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">
          <FilePlus2 className="mr-2 h-4 w-4" />
          Create an invoice
        </Link>
      </Button>
    </div>
  );
}
