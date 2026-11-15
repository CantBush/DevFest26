"use client";

import { CheckIcon, CloseIcon, ExternalIcon } from "@/components/Icons";
import { useAppState } from "@/components/state/AppState";
import type { DetailBlock, Profile, TaskDetail } from "@/lib/types";
import { PackingItems } from "./PackingItems";
import { PassportCheck } from "./PassportCheck";
import { PlaceCard } from "./PlaceCard";

export function BlockRenderer({ detail, profile }: { detail: TaskDetail; profile: Profile }) {
  return (
    <div className="flex flex-col gap-4">
      {detail.blocks.map((block, i) => (
        <Block key={i} block={block} detail={detail} profile={profile} />
      ))}
    </div>
  );
}

function Block({ block, detail, profile }: { block: DetailBlock; detail: TaskDetail; profile: Profile }) {
  const { chooseArea } = useAppState();

  switch (block.type) {
    case "heading":
      return block.level === 1 ? (
        <h2 className="text-3xl leading-tight">{block.text}</h2>
      ) : (
        <h3 className="border-b-2 border-dashed border-ink/40 pb-1 text-2xl tracking-wide">{block.text}</h3>
      );

    case "text":
      return <p className="leading-relaxed">{block.text}</p>;

    case "steps":
      return (
        <ol className="sketch-border flex list-decimal flex-col gap-2 bg-paper py-3 pl-9 pr-3">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );

    case "callout":
      return (
        <p
          className={`rounded-xl border-l-4 p-3 text-sm font-semibold ${
            block.tone === "warning" ? "border-warn bg-accent-soft text-warn" : "border-ink bg-wash"
          }`}
        >
          {block.text}
        </p>
      );

    case "places":
      return (
        <div className="flex flex-col gap-2">
          <p className="font-bold">{block.title}</p>
          {block.placeIds.map((id) => {
            const place = detail.places[id];
            return place ? <PlaceCard key={id} place={place} /> : null;
          })}
        </div>
      );

    case "commute":
      return (
        <div className="sketch-border bg-paper p-3">
          <p className="mb-2 font-bold">Commute from {block.originLabel}</p>
          <ul className="flex flex-col gap-1">
            {block.rows.map((row) => {
              const pin = profile.pins.find((p) => p.id === row.pinId);
              return (
                <li key={row.pinId} className="flex items-center gap-2">
                  <span className={row.withinLimit ? "text-ok" : "text-warn"}>
                    {row.withinLimit ? <CheckIcon size={18} /> : <CloseIcon size={18} />}
                  </span>
                  <span className="flex-1">{pin?.label ?? row.pinId}</span>
                  <span className="font-semibold">
                    {row.minutes === null ? "No route" : `${row.minutes} min`}
                    {pin && <span className="font-normal text-muted"> / {pin.maxCommuteMin}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      );

    case "neighborhoods":
      return (
        <div className="flex flex-col gap-3">
          {block.items.map((item) => {
            const place = item.placeId ? detail.places[item.placeId] : undefined;
            const chosen = profile.chosenArea?.label === item.name;
            return (
              <div key={item.name} className={`sketch-border flex flex-col gap-1 p-3 ${chosen ? "bg-accent-soft" : "bg-paper"}`}>
                <p className="text-lg font-extrabold">{item.name}</p>
                <p className="text-sm">{item.why}</p>
                {item.estRent && <p className="text-sm font-semibold text-muted">{item.estRent}</p>}
                {place && (
                  <button
                    type="button"
                    disabled={chosen}
                    onClick={() =>
                      chooseArea({
                        placeId: item.placeId,
                        label: item.name,
                        lat: place.lat,
                        lng: place.lng,
                        countryCode: profile.destination.place.countryCode,
                      })
                    }
                    className="btn btn-dark mt-2 min-h-11 self-start px-4 text-sm disabled:bg-ok disabled:text-paper disabled:opacity-100"
                  >
                    {chosen ? "Chosen area" : "Choose this area"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      );

    case "passportCheck":
      return <PassportCheck minMonthsAfterEntry={block.minMonthsAfterEntry} moveDate={profile.moveDate} />;

    case "packingItems":
      return <PackingItems taskId={detail.taskId} items={block.items} />;

    case "links":
      return (
        <ul className="flex flex-col gap-1">
          {block.items.map((link) => (
            <li key={link.url}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold underline"
              >
                {link.label} <ExternalIcon size={14} />
              </a>
            </li>
          ))}
        </ul>
      );
  }
}
