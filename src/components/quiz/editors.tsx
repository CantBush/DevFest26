"use client";

import { useState } from "react";
import { CloseIcon, PlusIcon } from "@/components/Icons";
import { DEFAULT_MAX_COMMUTE_MIN, PET_SUGGESTIONS } from "@/lib/quiz/questions";
import { MAX_PINS, type Pin, type PlaceRef } from "@/lib/types";
import { Chip, ChoiceButtons, MinutesSlider, Stepper } from "./inputs";
import { PlaceInput } from "./PlaceInput";

const PIN_KINDS: { value: Pin["kind"]; label: string }[] = [
  { value: "job", label: "Job" },
  { value: "campus", label: "Campus" },
  { value: "person", label: "A person" },
  { value: "other", label: "Other" },
];

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function PinEditor({
  pins,
  onChange,
  defaultMaxCommuteMin = DEFAULT_MAX_COMMUTE_MIN,
}: {
  pins: Pin[];
  onChange: (pins: Pin[]) => void;
  defaultMaxCommuteMin?: number;
}) {
  const [kind, setKind] = useState<Pin["kind"]>("job");
  const [label, setLabel] = useState("");
  const [place, setPlace] = useState<PlaceRef | undefined>();
  const full = pins.length >= MAX_PINS;

  const add = () => {
    if (!place) return;
    const fallbackLabel = PIN_KINDS.find((k) => k.value === kind)?.label ?? "Pin";
    onChange([
      ...pins,
      { id: newId("pin"), kind, label: label.trim() || fallbackLabel, place, maxCommuteMin: defaultMaxCommuteMin },
    ]);
    setLabel("");
    setPlace(undefined);
  };

  return (
    <div className="flex flex-col gap-4">
      {pins.length > 0 && (
        <ul className="flex flex-col gap-2">
          {pins.map((pin) => (
            <li key={pin.id} className="sketch-border flex items-center gap-2 bg-paper px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{pin.label}</p>
                <p className="truncate text-sm text-muted">{pin.place.label}</p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${pin.label}`}
                onClick={() => onChange(pins.filter((p) => p.id !== pin.id))}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-wash"
              >
                <CloseIcon size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {full ? (
        <p className="text-sm text-muted">That&apos;s the maximum of {MAX_PINS} pins.</p>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl bg-wash p-3">
          <div className="flex flex-wrap gap-2">
            {PIN_KINDS.map((k) => (
              <Chip key={k.value} selected={kind === k.value} onClick={() => setKind(k.value)}>
                {k.label}
              </Chip>
            ))}
          </div>
          <input
            name="pinLabel"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Name it (e.g. New office)"
            className="sketch-border min-h-11 bg-paper px-3"
          />
          <PlaceInput value={place} onChange={setPlace} kind="any" placeholder="Search for the place" />
          <button
            type="button"
            disabled={!place}
            onClick={add}
            className="btn btn-dark min-h-11"
          >
            <PlusIcon size={18} /> Add pin
          </button>
        </div>
      )}
    </div>
  );
}

export function PinDistanceEditor({
  pins,
  defaultMaxCommuteMin,
  onChange,
}: {
  pins: Pin[];
  defaultMaxCommuteMin: number;
  onChange: (pins: Pin[], defaultMaxCommuteMin: number) => void;
}) {
  const [perPin, setPerPin] = useState(() => pins.some((p) => p.maxCommuteMin !== defaultMaxCommuteMin));

  return (
    <div className="flex flex-col gap-5">
      <MinutesSlider
        label="All pins"
        value={defaultMaxCommuteMin}
        onChange={(minutes) => onChange(pins.map((p) => ({ ...p, maxCommuteMin: minutes })), minutes)}
      />
      <button type="button" onClick={() => setPerPin((v) => !v)} className="self-start text-sm font-semibold underline">
        {perPin ? "Use one limit for all" : "Adjust per pin"}
      </button>
      {perPin &&
        pins.map((pin) => (
          <MinutesSlider
            key={pin.id}
            label={pin.label}
            value={pin.maxCommuteMin}
            onChange={(minutes) =>
              onChange(
                pins.map((p) => (p.id === pin.id ? { ...p, maxCommuteMin: minutes } : p)),
                defaultMaxCommuteMin,
              )
            }
          />
        ))}
    </div>
  );
}

export function KidsEditor({ kids, onChange }: { kids: { age: number }[]; onChange: (kids: { age: number }[]) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {kids.map((kid, i) => (
        <div key={i} className="sketch-border flex items-center justify-between gap-3 bg-paper px-3 py-2">
          <span className="font-semibold">Child {i + 1} age</span>
          <Stepper
            value={kid.age}
            min={0}
            max={25}
            label="years"
            onChange={(age) => onChange(kids.map((k, j) => (j === i ? { age } : k)))}
          />
          <button
            type="button"
            aria-label={`Remove child ${i + 1}`}
            onClick={() => onChange(kids.filter((_, j) => j !== i))}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-wash"
          >
            <CloseIcon size={18} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...kids, { age: 5 }])}
        className="sketch-border flex min-h-11 items-center justify-center gap-1 bg-paper font-bold"
      >
        <PlusIcon size={18} /> Add a child
      </button>
    </div>
  );
}

export function PetsEditor({
  pets,
  onChange,
}: {
  pets: { kind: string; count: number }[];
  onChange: (pets: { kind: string; count: number }[]) => void;
}) {
  const countFor = (kind: string) => pets.find((p) => p.kind === kind)?.count ?? 0;
  const setCount = (kind: string, count: number) => {
    const rest = pets.filter((p) => p.kind !== kind);
    onChange(count > 0 ? [...rest, { kind, count }] : rest);
  };

  return (
    <div className="flex flex-col gap-3">
      {PET_SUGGESTIONS.map((kind) => (
        <div key={kind} className="sketch-border flex items-center justify-between bg-paper px-3 py-2">
          <span className="text-lg font-semibold capitalize">{kind}</span>
          <Stepper value={countFor(kind)} min={0} max={10} label={kind} onChange={(n) => setCount(kind, n)} />
        </div>
      ))}
    </div>
  );
}

export function YesNo({ value, onChange }: { value?: boolean; onChange: (value: boolean) => void }) {
  return (
    <ChoiceButtons
      options={[
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ]}
      value={value === undefined ? undefined : value ? "yes" : "no"}
      onChange={(v) => onChange(v === "yes")}
    />
  );
}
