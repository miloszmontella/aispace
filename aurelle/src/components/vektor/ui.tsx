import type { ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { Check, Search } from "lucide-react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const press = "transition-transform duration-150 ease-out active:scale-[0.96]";

export function CheckDot({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", press)}
    >
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
          on ? "border-accent bg-accent text-on-accent" : "border-line bg-transparent text-transparent",
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    </button>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-full bg-surface px-4">
      <Search className="h-4 w-4 shrink-0 text-muted" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full bg-transparent text-base outline-none placeholder:text-faint"
      />
    </label>
  );
}

export function Segment<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="grid rounded-full bg-surface p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "h-11 rounded-full px-2 text-sm font-medium",
              press,
              selected ? "bg-accent text-on-accent" : "text-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Screen({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 px-5 pb-6 pt-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-widest text-muted">ВЕКТОР</p>
          <h1 className="text-balance text-3xl font-semibold leading-tight">{title}</h1>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn("flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink", press)}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-muted">
      {label}
      {children}
    </label>
  );
}

export const fieldClass =
  "h-12 w-full rounded-xl bg-raised px-3 text-base text-ink outline-none placeholder:text-faint";

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-12 w-full rounded-full bg-accent text-base font-semibold text-on-accent disabled:opacity-40",
        press,
      )}
    >
      {children}
    </button>
  );
}

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <button type="button" aria-label="Закрыть" className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-in relative max-h-[88%] overflow-y-auto rounded-t-card bg-surface px-5 pb-8 pt-3"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className={cn("text-sm font-medium text-muted", press)}>
            Закрыть
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
