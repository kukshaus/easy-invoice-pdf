"use client";

import { loadAccessKeyAction } from "@/actions/saved-invoices-action";
import type { SavedInvoice } from "@/app/schema/saved-invoice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputHelperMessage } from "@/components/ui/input-helper-message";
import { Label } from "@/components/ui/label";
import { Check, Copy, KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * The access key is the only thing linking a browser to its stored invoices,
 * so it has to be both visible (to copy elsewhere) and enterable (to adopt on
 * another device).
 */
export function AccessKeyPanel({
  accessKey,
  onAdopted,
}: {
  accessKey: string | null;
  onAdopted: (invoices: SavedInvoice[], key: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCopy = async () => {
    if (!accessKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(accessKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the access key");
    }
  };

  const handleAdopt = async () => {
    const trimmed = keyInput.trim();

    if (!trimmed || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await loadAccessKeyAction(trimmed);

      if (!result.ok || !result.data) {
        toast.error(result.error ?? "Could not load that access key");

        return;
      }

      onAdopted(result.data.invoices, trimmed);
      setKeyInput("");

      toast.success(
        result.data.invoices.length === 0
          ? "Access key loaded, but it has no invoices yet"
          : `Loaded ${result.data.invoices.length} invoice${
              result.data.invoices.length === 1 ? "" : "s"
            }`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />

        <div className="w-full space-y-4">
          {accessKey ? (
            <div>
              <Label className="text-slate-900">Your access key</Label>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <code className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-sm text-slate-800">
                  {accessKey}
                </code>
                <Button _variant="outline" _size="sm" onClick={handleCopy}>
                  {copied ? (
                    <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <InputHelperMessage>
                Save this somewhere. Entering it on another device or browser
                gives you the same invoices. Anyone with this key can read them,
                so keep it private.
              </InputHelperMessage>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              You do not have an access key yet. Saving an invoice creates one
              automatically.
            </p>
          )}

          <div>
            <Label htmlFor="access-key-input" className="text-slate-900">
              Have an access key?
            </Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Input
                id="access-key-input"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                placeholder="inv_..."
                className="max-w-xs font-mono"
              />
              <Button
                _variant="outline"
                onClick={() => void handleAdopt()}
                disabled={isLoading || keyInput.trim().length === 0}
              >
                {isLoading ? "Loading..." : "Load"}
              </Button>
            </div>
            <InputHelperMessage>
              Loading a key replaces the invoices shown in this browser.
            </InputHelperMessage>
          </div>
        </div>
      </div>
    </div>
  );
}
