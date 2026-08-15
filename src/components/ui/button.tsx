import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-all press-scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))] active:bg-[hsl(var(--primary-hover))] shadow-[var(--shadow-sm)]",
        destructive:
          "bg-[hsl(var(--danger))] text-[hsl(var(--danger-foreground))] hover:opacity-90 active:opacity-95 shadow-[var(--shadow-sm)]",
        outline:
          "border border-[hsl(var(--border))] bg-transparent hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]",
        secondary:
          "border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary-hover))] active:bg-[hsl(var(--secondary-hover))]",
        ghost:
          "hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]",
        link:
          "text-[hsl(var(--primary))] underline-offset-4 hover:underline active:underline",
        success:
          "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:opacity-90 active:opacity-95 shadow-[var(--shadow-sm)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-[var(--radius-sm)] px-3 text-xs",
        lg: "h-12 rounded-[var(--radius-md)] px-8 text-base",
        xl: "h-14 rounded-[var(--radius-lg)] px-10 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
