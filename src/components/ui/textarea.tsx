import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-slate-950 transition-shadow placeholder:text-slate-500/70 focus-visible:border-brand focus-visible:ring focus-visible:ring-brand-200 focus-visible:ring-opacity-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-400/70 dark:focus-visible:border-slate-300 dark:focus-visible:ring-slate-300/20 [&[aria-readonly=true]]:cursor-not-allowed [&[aria-readonly=true]]:bg-slate-50 [&[aria-readonly=true]]:opacity-50 [&[aria-readonly=true]]:dark:bg-slate-900",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
