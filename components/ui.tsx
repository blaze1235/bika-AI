"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { cx } from "@/lib/cx";

/* ------------------------------------------------------------------ */
/* Small shared UI primitives used across all three portals.           */
/* ------------------------------------------------------------------ */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all cursor-pointer",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-5 py-2.5 text-base",
        variant === "primary" &&
          "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-md shadow-brand-600/25 hover:from-brand-600 hover:to-brand-700 active:shadow-sm",
        variant === "secondary" &&
          "bg-white text-neutral-800 ring-1 ring-neutral-200 shadow-sm hover:bg-brand-50 hover:ring-brand-200",
        variant === "danger" && "bg-red-600 text-white shadow-md shadow-red-600/25 hover:bg-red-700",
        variant === "ghost" && "text-neutral-600 hover:bg-brand-50 hover:text-brand-800",
        className
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm shadow-sm",
        "placeholder:text-neutral-400",
        "focus:outline-none focus:ring-2 focus:ring-brand-400/45 focus:border-brand-400",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(
        "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm shadow-sm",
        "placeholder:text-neutral-400",
        "focus:outline-none focus:ring-2 focus:ring-brand-400/45 focus:border-brand-400",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-brand-400/45 focus:border-brand-400",
        className
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-700">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-neutral-400">{hint}</span>}
    </label>
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl bg-white ring-1 ring-brand-950/5 shadow-sm shadow-brand-950/[0.04]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={cx(
          "relative w-full max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
          "sm:mx-4"
        )}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-neutral-100 bg-white px-5 py-4 rounded-t-2xl">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 cursor-pointer"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-200 bg-white/60 px-6 py-14 text-center">
      {icon && <div className="mb-3 text-brand-300">{icon}</div>}
      <p className="text-sm font-medium text-neutral-700">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-neutral-400">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div
      className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-brand-600"
      role="status"
      aria-label="Загрузка"
    />
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </p>
  );
}
