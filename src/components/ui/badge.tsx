import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-line bg-surface text-ink",
        primary: "border-brand-200 bg-brand-50 text-brand-700",
        secondary: "border-line bg-surface text-ink",
        success: "border-[#98D6A3] bg-[#E7FBDA] text-[#044F1E]",
        warning: "border-[#F3C63A] bg-[#FFFAD8] text-[#4D2D00]",
        destructive: "border-[#F2B5B8] bg-[#FFECEB] text-[#9C1224]",
        outline: "border-line text-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
