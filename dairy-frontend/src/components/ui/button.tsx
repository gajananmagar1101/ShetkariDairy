import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:focus-visible:ring-white/40 disabled:pointer-events-none disabled:opacity-50 duration-300",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-[0_4px_14px_0_rgba(124,58,237,0.39)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.23)] dark:bg-white dark:bg-none dark:text-black dark:shadow-none dark:hover:bg-zinc-200",
        destructive: "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-[0_4px_14px_0_rgba(244,63,94,0.39)] hover:shadow-[0_6px_20px_rgba(244,63,94,0.23)] dark:bg-white dark:bg-none dark:text-black dark:shadow-none dark:hover:bg-zinc-200",
        outline: "border border-slate-200 bg-white/50 shadow-sm hover:bg-white/80 text-slate-900 backdrop-blur-sm dark:border-zinc-700 dark:bg-[#111111] dark:text-white dark:hover:bg-zinc-800",
        secondary: "bg-primary-50 text-primary-900 shadow-sm hover:bg-primary-100 dark:bg-white dark:text-black dark:hover:bg-zinc-200",
        ghost: "hover:bg-slate-100/50 hover:text-slate-900 text-slate-600 dark:text-white dark:hover:bg-zinc-800 dark:hover:text-white",
        link: "text-primary-600 underline-offset-4 hover:underline dark:text-white",
        glass: "glass text-slate-900 hover:bg-white/60 dark:bg-[#111111] dark:text-white dark:hover:bg-zinc-800",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...(props as any)}
        />
      )
    }

    return (
      <button
        type={props.type ?? "button"}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
