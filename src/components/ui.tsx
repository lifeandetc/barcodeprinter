import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        solid: "bg-ink text-background hover:bg-black",
        outline: "border border-line bg-card hover:border-ink",
        ghost: "hover:bg-black/5",
        danger: "border border-danger/30 text-danger hover:bg-danger/5",
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-10",
      },
    },
    defaultVariants: { variant: "solid", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-line bg-card px-3 text-sm outline-none focus:border-ink",
        props.className,
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn("min-h-24 w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none focus:border-ink", props.className)}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn("h-10 w-full rounded-md border border-line bg-card px-3 text-sm outline-none focus:border-ink", props.className)}
    />
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "danger" }) {
  const tones = {
    neutral: "border-line text-muted",
    ok: "border-ok/20 text-ok",
    warn: "border-warn/30 text-warn",
    danger: "border-danger/30 text-danger",
  };
  return <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] tracking-wide", tones[tone])}>{children}</span>;
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-lg border border-line bg-card", className)}>{children}</section>;
}
