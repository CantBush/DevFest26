"use client";

import { StarIcon } from "@/components/Icons";
import {
  AMENITY_SUGGESTIONS,
  CULTURE_SUGGESTIONS,
  CURRENCIES,
  DEFAULT_MAX_COMMUTE_MIN,
  DISABILITY_OPTIONS,
  KEEP_ITEM_SUGGESTIONS,
  RECREATION_SUGGESTIONS,
  SPECIAL_NEEDS_SUGGESTIONS,
  TRANSPORT_OPTIONS,
  questionTitle,
  type Question,
  type QuizDraft,
} from "@/lib/quiz/questions";
import type { Disability, TransportMode } from "@/lib/types";
import { KidsEditor, PetsEditor, PinDistanceEditor, PinEditor, YesNo } from "./editors";
import { Chip, Chips, ChoiceButtons, Stepper, TextField } from "./inputs";
import { PlaceInput } from "./PlaceInput";

type Props = {
  question: Question;
  draft: QuizDraft;
  onChange: (patch: Partial<QuizDraft>) => void;
  headingLevel?: "h1" | "h2";
};

export function QuestionView({ question, draft, onChange, headingLevel = "h1" }: Props) {
  const Heading = headingLevel;
  return (
    <section className="flex flex-col gap-4">
      <div>
        <Heading className="text-2xl font-extrabold leading-tight">{questionTitle(question, draft)}</Heading>
        {question.help && <p className="mt-1 text-muted">{question.help}</p>}
      </div>
      <QuestionInput question={question} draft={draft} onChange={onChange} />
    </section>
  );
}

function QuestionInput({ question, draft, onChange }: Props) {
  switch (question.id) {
    case "scope":
      return (
        <ChoiceButtons
          options={[
            { value: "domestic", label: "Within my country" },
            { value: "international", label: "Internationally", hint: "Adds visa, shipping, and banking steps" },
          ]}
          value={draft.scope}
          onChange={(scope) => onChange({ scope })}
        />
      );

    case "origin":
      return (
        <PlaceInput
          kind="city"
          value={draft.origin}
          onChange={(origin) => onChange({ origin })}
          placeholder="Your current city"
        />
      );

    case "moveDate": {
      const notSure = draft.moveDate === null;
      return (
        <div className="flex flex-col gap-3">
          <input
            name="moveDate"
            type="date"
            value={draft.moveDate ?? ""}
            disabled={notSure}
            onChange={(e) => onChange({ moveDate: e.target.value || undefined })}
            className="sketch-border min-h-12 bg-paper px-3 disabled:opacity-40"
          />
          <Chip selected={notSure} onClick={() => onChange({ moveDate: notSure ? undefined : null })}>
            Not sure yet
          </Chip>
        </div>
      );
    }

    case "hasHousing":
      return <YesNo value={draft.hasHousing} onChange={(hasHousing) => onChange({ hasHousing })} />;

    case "address":
      return (
        <PlaceInput
          kind="address"
          value={draft.address}
          onChange={(address) => onChange({ address })}
          placeholder="Street address"
        />
      );

    case "area":
      return (
        <PlaceInput
          kind="region"
          value={draft.area}
          onChange={(area) => onChange({ area })}
          placeholder="City, state, or country"
        />
      );

    case "pins":
      return (
        <PinEditor
          pins={draft.pins ?? []}
          defaultMaxCommuteMin={draft.defaultMaxCommuteMin}
          onChange={(pins) => onChange({ pins })}
        />
      );

    case "pinDistance":
      return (
        <PinDistanceEditor
          pins={draft.pins ?? []}
          defaultMaxCommuteMin={draft.defaultMaxCommuteMin ?? DEFAULT_MAX_COMMUTE_MIN}
          onChange={(pins, defaultMaxCommuteMin) => onChange({ pins, defaultMaxCommuteMin })}
        />
      );

    case "people":
      return (
        <Stepper value={draft.people ?? 1} min={1} max={15} label="people" onChange={(people) => onChange({ people })} />
      );

    case "kids":
      return <KidsEditor kids={draft.kids ?? []} onChange={(kids) => onChange({ kids })} />;

    case "disabilities":
      return (
        <div className="flex flex-col gap-4">
          <Chips
            suggestions={DISABILITY_OPTIONS.map((o) => o.value)}
            labels={Object.fromEntries(DISABILITY_OPTIONS.map((o) => [o.value, o.label]))}
            value={draft.disabilities ?? []}
            onChange={(values) => onChange({ disabilities: values as Disability[] })}
            allowCustom={false}
          />
          <TextField
            label="Anything we should know? (optional)"
            value={draft.disabilityNotes ?? ""}
            onChange={(disabilityNotes) => onChange({ disabilityNotes })}
            placeholder="e.g. needs a step-free entrance"
            multiline
          />
        </div>
      );

    case "pets":
      return <PetsEditor pets={draft.pets ?? []} onChange={(pets) => onChange({ pets })} />;

    case "keepItems":
      return (
        <Chips
          suggestions={KEEP_ITEM_SUGGESTIONS}
          value={draft.keepItems ?? []}
          onChange={(keepItems) => onChange({ keepItems })}
        />
      );

    case "specialNeeds":
      return (
        <Chips
          suggestions={SPECIAL_NEEDS_SUGGESTIONS}
          value={draft.specialNeeds ?? []}
          onChange={(specialNeeds) => onChange({ specialNeeds })}
        />
      );

    case "stayingBehind":
      return (
        <Chips
          value={draft.stayingBehind ?? []}
          onChange={(stayingBehind) => onChange({ stayingBehind })}
          placeholder="e.g. Grandma in Ohio"
        />
      );

    case "moveBudget":
      return (
        <BudgetField
          currency={draft.currency ?? "USD"}
          amount={draft.moveBudget}
          onChange={(moveBudget, currency) => onChange({ moveBudget, currency })}
        />
      );

    case "housingIntent":
      return (
        <ChoiceButtons
          options={[
            { value: "rent", label: "Rent" },
            { value: "buy", label: "Buy" },
          ]}
          value={draft.housingIntent}
          onChange={(housingIntent) => onChange({ housingIntent })}
        />
      );

    case "housingBudget":
      return (
        <BudgetField
          currency={draft.currency ?? "USD"}
          amount={draft.housingBudget}
          suffix={draft.housingIntent === "buy" ? "total" : "per month"}
          onChange={(housingBudget, currency) => onChange({ housingBudget, currency })}
        />
      );

    case "currentHome":
      return (
        <ChoiceButtons
          options={[
            { value: "rent", label: "I rent" },
            { value: "own", label: "I own" },
            { value: "other", label: "Other", hint: "Family home, dorm, or something else" },
          ]}
          value={draft.currentHome}
          onChange={(currentHome) => onChange({ currentHome })}
        />
      );

    case "regulatedJob":
      return (
        <ChoiceButtons
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "noJob", label: "No job yet" },
          ]}
          value={draft.regulatedJob}
          onChange={(regulatedJob) => onChange({ regulatedJob })}
        />
      );

    case "transport":
      return <TransportField draft={draft} onChange={onChange} />;

    case "culture":
      return (
        <Chips suggestions={CULTURE_SUGGESTIONS} value={draft.culture ?? []} onChange={(culture) => onChange({ culture })} />
      );

    case "amenities":
      return (
        <Chips
          suggestions={AMENITY_SUGGESTIONS}
          value={draft.amenities ?? []}
          onChange={(amenities) => onChange({ amenities })}
        />
      );

    case "recreation":
      return (
        <Chips
          suggestions={RECREATION_SUGGESTIONS}
          value={draft.recreation ?? []}
          onChange={(recreation) => onChange({ recreation })}
        />
      );
  }
}

function BudgetField({
  currency,
  amount,
  suffix,
  onChange,
}: {
  currency: string;
  amount?: number;
  suffix?: string;
  onChange: (amount: number | undefined, currency: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        name="currency"
        aria-label="Currency"
        value={currency}
        onChange={(e) => onChange(amount, e.target.value)}
        className="sketch-border min-h-12 bg-paper px-2 font-semibold"
      >
        {CURRENCIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <input
        name="amount"
        type="number"
        inputMode="numeric"
        min={0}
        value={amount ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)), currency)}
        placeholder="Amount"
        className="sketch-border min-h-12 min-w-0 flex-1 bg-paper px-3 text-lg"
      />
      {suffix && <span className="text-sm font-semibold text-muted">{suffix}</span>}
    </div>
  );
}

function TransportField({ draft, onChange }: { draft: QuizDraft; onChange: (patch: Partial<QuizDraft>) => void }) {
  const selected = draft.transport ?? [];

  const toggle = (mode: TransportMode) => {
    const transport = selected.includes(mode) ? selected.filter((m) => m !== mode) : [...selected, mode];
    const mainTransport =
      draft.mainTransport && transport.includes(draft.mainTransport) ? draft.mainTransport : transport[0];
    onChange({ transport, mainTransport });
  };

  return (
    <ul className="flex flex-col gap-2">
      {TRANSPORT_OPTIONS.map((o) => {
        const on = selected.includes(o.value);
        const main = draft.mainTransport === o.value;
        return (
          <li key={o.value} className={`sketch-border flex items-center ${on ? "bg-accent-soft" : "bg-paper"}`}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => toggle(o.value)}
              className="min-h-12 flex-1 px-4 text-left text-base font-semibold"
            >
              {o.label}
            </button>
            {on && (
              <button
                type="button"
                aria-label={main ? `${o.label} is your main way to get around` : `Make ${o.label} your main way`}
                aria-pressed={main}
                onClick={() => onChange({ mainTransport: o.value })}
                className="flex h-12 items-center gap-1 px-3 text-sm font-semibold"
              >
                <StarIcon size={18} filled={main} />
                {main ? "Main" : "Make main"}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
