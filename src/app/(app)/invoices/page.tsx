import type { Metadata } from "next";
import { InvoicesPageClient } from "./page.client";

export const metadata: Metadata = {
  title: "My invoices | EasyInvoicePDF.com",
  description: "Browse and restore the invoices saved in this browser.",
  // Saved invoices are personal and stored locally, nothing to index here
  robots: {
    index: false,
    follow: false,
  },
};

export default function InvoicesPage() {
  return <InvoicesPageClient />;
}
