import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 btn-ripple",
  {
    variants: {
      variant: {
        default:
          "btn-primary-gradient shadow-[0_8px_24px_rgba(0,0,0,0.45)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md",
        outline:
          "border border-[rgba(61,181,110,0.35)] bg-transparent text-[var(--mist)] hover:border-[rgba(61,181,110,0.6)] hover:bg-[rgba(61,181,110,0.08)]",
        secondary:
          "bg-[rgba(26,61,43,0.4)] text-[var(--text-secondary)] hover:bg-[rgba(26,61,43,0.7)] hover:text-[var(--mist)]",
        ghost: "bg-transparent text-[var(--text-secondary)] hover:bg-[rgba(61,181,110,0.08)] hover:text-[var(--mist)]",
        link: "text-[var(--fresh)] underline-offset-4 hover:text-[var(--lime)] hover:underline",
        farmer:
          "bg-gradient-to-r from-[var(--leaf)] to-[var(--fresh)] text-[var(--mist)] shadow-md hover:shadow-glow hover:-translate-y-0.5",
        merchant:
          "bg-gradient-to-r from-[var(--earth)] to-[var(--soil)] text-[var(--cream)] shadow-md hover:shadow-lg hover:-translate-y-0.5",
        success:
          "bg-[var(--fresh)] text-[var(--mist)] hover:bg-[rgba(61,181,110,0.9)] shadow-md hover:shadow-glow",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-[10px] px-3",
        lg: "h-12 rounded-[14px] px-8 text-base",
        xl: "h-14 rounded-[16px] px-10 text-lg",
        icon: "h-10 w-10 rounded-[12px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
