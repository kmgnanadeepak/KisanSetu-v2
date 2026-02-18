import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[999px] border px-3 py-0.5 text-[11px] font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(61,181,110,0.55)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[rgba(61,181,110,0.18)] text-[var(--mist)] hover:bg-[rgba(61,181,110,0.28)]",
        secondary:
          "border-transparent bg-[rgba(26,61,43,0.6)] text-[var(--text-secondary)] hover:bg-[rgba(26,61,43,0.85)]",
        destructive:
          "border-transparent bg-[rgba(208,72,72,0.16)] text-red-200 hover:bg-[rgba(208,72,72,0.26)]",
        outline: "border-[rgba(61,181,110,0.4)] text-[var(--text-secondary)]",
        gold: "border-transparent bg-[rgba(196,160,104,0.18)] text-[var(--cream)] hover:bg-[rgba(196,160,104,0.26)]",
        success:
          "border-transparent bg-[rgba(61,181,110,0.18)] text-[var(--mist)] hover:bg-[rgba(61,181,110,0.26)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
