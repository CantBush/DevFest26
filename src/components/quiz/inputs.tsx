"use client";

import { useId, useState, type ReactNode } from "react";
import { CloseIcon, PlusIcon } from "@/components/Icons";

export function ChoiceButtons<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; hint?: string }[];
  value?: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-3" role="radiogroup">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={`sketch-border min-h-14 px-4 py-3 text-left transition ${
              selected ? "bg-accent-soft font-bold" : "bg-paper hover:bg-wash"
            }`}
          >
            <span className="block text-base">{o.label}</span>
            {o.hint && <span className="block text-sm text-muted">{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({
  selected,
  onClick,
  children,
  onRemove,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
  onRemove?: () => void;
}) {
  return (
    <span
      className={`inline-flex min-h-11 items-center gap-1 rounded-full border-2 border-ink text-sm transition ${
        selected ? "bg-ink text-paper" : "bg-paper hover:bg-wash"
      }`}
    >
      <button type="button" onClick={onClick} aria-pressed={selected} className="px-4 py-2 font-semibold">
        {children}
      </button>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${String(children)}`} className="-ml-2 pr-3">
          <CloseIcon size={16} />
        </button>
      )}
    </span>
  );
}

// Multi-select chips with optional free-text entries, used for tags like
// interests, keep items, and special needs.
export function Chips({
  suggestions = [],
  value,
  onChange,
  allowCustom = true,
  placeholder = "Add your own",
  labels,
}: {
  suggestions?: string[];
  value: string[];
  onChange: (value: string[]) => void;
  allowCustom?: boolean;
  placeholder?: string;
  labels?: Record<string, string>;
}) {
  const [text, setText] = useState("");
  const custom = value.filter((v) => !suggestions.includes(v));
  const toggle = (item: string) =>
    onChange(value.includes(item) ? value.filter((v) => v !== item) : [...value, item]);
  const add = () => {
    const item = text.trim();
    if (item && !value.includes(item)) onChange([...value, item]);
    setText("");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <Chip key={s} selected={value.includes(s)} onClick={() => toggle(s)}>
            {labels?.[s] ?? s}
          </Chip>
        ))}
        {custom.map((c) => (
          <Chip key={c} selected onClick={() => toggle(c)} onRemove={() => toggle(c)}>
            {c}
          </Chip>
        ))}
      </div>
      {allowCustom && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input
            name="customChip"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            className="sketch-border min-h-11 min-w-0 flex-1 bg-paper px-3"
          />
          <button type="submit" aria-label="Add" className="sketch-border flex min-h-11 w-11 items-center justify-center bg-paper">
            <PlusIcon />
          </button>
        </form>
      )}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 20,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        aria-label={`Fewer${label ? ` ${label}` : ""}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="sketch-border h-12 w-12 text-2xl font-bold disabled:opacity-30"
      >
        -
      </button>
      <span className="min-w-10 text-center text-3xl font-bold" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={`More${label ? ` ${label}` : ""}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="sketch-border h-12 w-12 text-2xl font-bold disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

export function MinutesSlider({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between text-sm font-semibold">
        <span>{label}</span>
        <span>{value} min</span>
      </span>
      <input
        name="minutes"
        type="range"
        min={10}
        max={90}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-accent)]"
      />
    </label>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  label,
  multiline = false,
  name,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  multiline?: boolean;
  name?: string;
}) {
  const fallbackName = useId();
  const className = "sketch-border w-full bg-paper px-3 py-2";
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm font-semibold">{label}</span>}
      {multiline ? (
        <textarea
          name={name ?? fallbackName}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
      ) : (
        <input
          name={name ?? fallbackName}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${className} min-h-11`}
        />
      )}
    </label>
  );
}
