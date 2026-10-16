import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&[data-disabled=true]]:opacity-50 active:scale-[98%] active:transition-transform",
  {
    variants: {
      _variant: {
        default: "bg-brand text-white hover:bg-brand-600",
        destructive: "bg-[#9C1224] text-white hover:bg-[#7E0E1D]",
        outline:
          "border border-line bg-white text-ink hover:border-brand hover:bg-surface",
        secondary: "bg-surface text-ink hover:bg-surface-strong",
        ghost: "text-ink hover:bg-surface",
        link: "text-brand underline-offset-4 hover:underline",
      },
      _size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-lg px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      _variant: "default",
      _size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/**
 * https://originui.com/buttons
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, _variant, _size, asChild = false, type = "button", ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        type={type}
        className={cn(buttonVariants({ _variant, _size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
