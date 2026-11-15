"use client";

import { useState } from "react";

function addMonths(isoDate: string, months: number) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function PassportCheck({ minMonthsAfterEntry, moveDate }: { minMonthsAfterEntry: number; moveDate?: string }) {
  const [expiry, setExpiry] = useState("");

  const required = moveDate ? addMonths(moveDate, minMonthsAfterEntry) : null;
  const ok = required && expiry ? new Date(`${expiry}T00:00:00`) >= required : null;

  return (
    <div className="sketch-border flex flex-col gap-2 bg-paper p-3">
      <p className="font-bold">Passport check</p>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        When does your passport expire?
        <input
          name="passportExpiry"
          type="date"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          className="sketch-border min-h-11 bg-paper px-3 font-normal"
        />
      </label>
      {!moveDate && <p className="text-sm text-muted">Add a move date in Settings to run this check.</p>}
      {ok === true && (
        <p className="font-semibold text-ok">
          Good: it stays valid at least {minMonthsAfterEntry} months past your move date.
        </p>
      )}
      {ok === false && required && (
        <p className="font-semibold text-warn">
          Renew it: it should be valid until at least {required.toLocaleDateString()}.
        </p>
      )}
    </div>
  );
}
