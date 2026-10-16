"use client";

import { PDFViewer } from "@react-pdf/renderer/lib/react-pdf.browser";

export function DesktopInvoicePDFViewer({
  children,
  errorWhileGeneratingPdfIsShown,
}: {
  children: React.ReactNode;
  errorWhileGeneratingPdfIsShown: boolean;
}) {
  if (errorWhileGeneratingPdfIsShown) {
    return (
      <div className="flex h-full min-h-[560px] w-full items-center justify-center rounded-xl border border-line bg-surface">
        <div className="text-center">
          <p className="text-red-600">Error generating PDF preview</p>
          <p className="mt-2 text-sm text-gray-600">
            Something went wrong. Please try again or contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PDFViewer
      width="100%"
      className="mb-4 h-full w-full"
      title="Invoice PDF Viewer"
      data-testid="pdf-preview"
    >
      {/* @ts-expect-error PR with fix?: https://github.com/diegomura/react-pdf/pull/2888 */}
      {children}
    </PDFViewer>
  );
}
