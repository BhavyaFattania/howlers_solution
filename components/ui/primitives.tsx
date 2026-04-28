import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow",
        className
      )}
      {...p}
    />
  );
}

export function CardHeader({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4 border-b border-slate-100", className)} {...p} />;
}

export function CardTitle({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-semibold text-slate-900", className)} {...p} />;
}

export function CardBody({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...p} />;
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent",
        "disabled:opacity-50 disabled:cursor-not-allowed transition-shadow",
        className
      )}
      {...p}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...p }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[88px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm",
      "text-slate-900 placeholder-slate-400 resize-none",
      "focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-shadow",
      className
    )}
    {...p}
  />
));
Textarea.displayName = "Textarea";

export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-xs font-medium text-slate-700 mb-1.5", className)}
      {...p}
    />
  );
}

type BadgeTone = "slate" | "green" | "amber" | "red" | "blue" | "purple" | "orange";

const TONE_CLS: Record<BadgeTone, string> = {
  slate:  "bg-slate-100 text-slate-700",
  green:  "bg-emerald-100 text-emerald-800",
  amber:  "bg-amber-100 text-amber-800",
  red:    "bg-red-100 text-red-700",
  blue:   "bg-brand-50 text-brand-700",
  purple: "bg-violet-100 text-violet-800",
  orange: "bg-orange-100 text-orange-700",
};

export function Badge({
  children,
  tone = "slate",
  dot,
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        TONE_CLS[tone],
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full animate-live-pulse", {
        "bg-slate-500": tone === "slate",
        "bg-emerald-500": tone === "green",
        "bg-amber-500": tone === "amber",
        "bg-red-500": tone === "red",
        "bg-brand": tone === "blue",
        "bg-violet-500": tone === "purple",
        "bg-orange-500": tone === "orange",
      })} />}
      {children}
    </span>
  );
}

export function Chip({
  children,
  onRemove,
  className,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700",
        className
      )}
    >
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 rounded-sm text-slate-400 hover:text-slate-700 transition-colors leading-none"
          type="button"
        >
          ×
        </button>
      )}
    </span>
  );
}

interface KpiTileProps {
  label: string;
  value: string | number;
  hint?: string;
  trend?: "up" | "down" | "neutral";
  accentColor?: "blue" | "red" | "green" | "amber" | "purple";
}

const ACCENT_BORDER: Record<string, string> = {
  blue:   "border-l-brand",
  red:    "border-l-red-400",
  green:  "border-l-emerald-400",
  amber:  "border-l-amber-400",
  purple: "border-l-violet-400",
};

export function KpiTile({ label, value, hint, trend, accentColor = "blue" }: KpiTileProps) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white shadow-sm border-l-4 p-4", ACCENT_BORDER[accentColor])}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 flex items-end gap-2">
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        {trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500 mb-0.5" />}
        {trend === "down" && <TrendingDown className="h-4 w-4 text-red-400 mb-0.5" />}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export function Empty({ title, hint, icon }: { title: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-slate-200 rounded-xl p-10 text-center">
      {icon && <div className="flex justify-center mb-3 text-slate-300">{icon}</div>}
      <div className="font-medium text-slate-600">{title}</div>
      {hint && <div className="mt-1 text-sm text-slate-400">{hint}</div>}
    </div>
  );
}

export function Section({ title, action, children }: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
