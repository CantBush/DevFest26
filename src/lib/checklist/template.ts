import type { Profile, SectionId, SpriteId, TaskTemplate } from "@/lib/types";
import {
  countryName,
  formatMoney,
  hasDisabilities,
  keepsACar,
  namedStayingBehind,
  realNeeds,
} from "@/lib/checklist/profile";

export type TemplateEntry = TaskTemplate & {
  priority: "high" | "normal";
  // Positive numbers are days before the move date. Negative numbers are days after.
  daysBeforeMove?: number;
  summarize?: (profile: Profile) => string;
};

export const SECTION_META: Record<SectionId, { title: string; sprite: SpriteId; pinned?: boolean }> = {
  visa: { title: "Visa and entry", sprite: "airplane", pinned: true },
  moveOut: { title: "Moving out", sprite: "box" },
  housing: { title: "Housing", sprite: "umbrella" },
  paperwork: { title: "Paperwork", sprite: "papers" },
  health: { title: "Health", sprite: "bandage" },
  household: { title: "Household", sprite: "paw" },
  moveIn: { title: "Moving in", sprite: "food" },
};

const DISABILITY = ["household.disabilities", "household.disabilityNotes"];

const international = (profile: Profile) => profile.scope === "international";
const rentingNow = (profile: Profile) => profile.currentHome === "rent";
const owningNow = (profile: Profile) => profile.currentHome === "own";
const hasAddress = (profile: Profile) => profile.destination.mode === "address";
const hasArea = (profile: Profile) => profile.destination.mode === "area";
const hasPins = (profile: Profile) => profile.pins.length > 0;
const willRent = (profile: Profile) => profile.money.housingIntent === "rent";
const willBuy = (profile: Profile) => profile.money.housingIntent === "buy";
const hasKids = (profile: Profile) => profile.household.kids.length > 0;
const hasPets = (profile: Profile) => profile.household.pets.some((pet) => pet.count > 0);
const hasNeeds = (profile: Profile) => realNeeds(profile).length > 0;
const hasContact = (profile: Profile) => namedStayingBehind(profile).length > 0;

function destinationCountry(profile: Profile): string {
  return countryName(profile.destination.place.countryCode);
}

function moneyLine(profile: Profile): string {
  const budget = formatMoney(profile.money.housingBudget, profile.money.currency);
  return profile.money.housingIntent === "rent" ? `${budget} a month` : `${budget} total`;
}

function pinPhrase(profile: Profile): string {
  if (profile.pins.length === 0) return "the places you need to reach";
  return profile.pins.map((pin) => `${pin.label} (${pin.maxCommuteMin} min)`).join(", ");
}

function savingsSummary(profile: Profile): string {
  const moving = formatMoney(profile.money.moveBudget, profile.money.currency);
  if (profile.money.housingIntent !== "rent") {
    return `Set aside moving costs (${moving}) plus 3 to 6 months of living expenses. Your housing budget is a purchase total, so estimate monthly costs on their own. This is a planning figure, not financial advice.`;
  }
  const low = profile.money.moveBudget + profile.money.housingBudget * 3;
  const high = profile.money.moveBudget + profile.money.housingBudget * 6;
  return `Aim for moving costs plus 3 to 6 months of rent: about ${formatMoney(low, profile.money.currency)} to ${formatMoney(high, profile.money.currency)}, from a ${moving} moving budget and ${formatMoney(profile.money.housingBudget, profile.money.currency)} a month. This is a planning figure, not financial advice.`;
}

function packingSummary(profile: Profile): string {
  const kept = profile.keepItems.filter((item) => item.trim());
  const keep = kept.length > 0 ? ` You plan to keep ${kept.join(", ")}.` : "";
  return `Split belongings into ship, carry-on, sell, donate, and leave behind.${keep} Label boxes by room and pack a first-week bag separately.`;
}

function petSummary(profile: Profile): string {
  const pets = profile.household.pets
    .filter((pet) => pet.count > 0)
    .map((pet) => `${pet.count} ${pet.kind}${pet.count > 1 ? "s" : ""}`)
    .join(", ");
  const destination = destinationCountry(profile);
  const travel =
    profile.scope === "international"
      ? ` Check import rules for ${destination} before you book travel.`
      : " Ask the airline or your driver about the crate and health certificate.";
  return `For ${pets || "your pets"}: update vet records and vaccinations, and plan the trip itself.${travel} Service animals follow a different process from pets, so say so if that applies.`;
}

function contactSummary(profile: Profile): string {
  const people = namedStayingBehind(profile).join(", ");
  return `Choose a regular time to reach ${people || "the people staying behind"}, and account for the time difference if there is one.`;
}

function transportTitle(profile: Profile): string {
  switch (profile.dailyLife.mainTransport) {
    case "car":
      return "Register your car and sort out parking";
    case "transit":
      return "Get a transit pass";
    case "bike":
      return "Find bike routes and parking";
    case "walk":
      return "Plan walkable errands";
  }
}

function transportSummary(profile: Profile): string {
  switch (profile.dailyLife.mainTransport) {
    case "car":
      return "Transfer the registration and insurance, and find parking near your new home before move day.";
    case "transit":
      return "Get a local transit pass or card for your first week, and learn the route to your pins.";
    case "bike":
      return "Find a safe bike route to your pins and a place to lock the bike at home.";
    case "walk":
      return "Map the errands you can walk to from your new home, including groceries and a pharmacy.";
  }
}

// Stable ids from PLAN.md section 7. Order inside a section is the order shown.
export const TASK_TEMPLATES: readonly TemplateEntry[] = [
  {
    id: "visa.permit",
    sectionId: "visa",
    title: "Get the right visa or permit, and note its renewal rules",
    defaultSummary:
      "Confirm which visa or permit matches the reason for the move, who sponsors it, and when it has to be renewed. Start with the official immigration site for the destination.",
    showIf: international,
    dependsOn: ["scope", "origin", "destination", "moveDate", "pins", ...DISABILITY],
    detailKind: "factPack",
    priority: "high",
    daysBeforeMove: 75,
  },
  {
    id: "visa.passport",
    sectionId: "visa",
    title: "Check passport validity for {country}",
    defaultSummary:
      "Check that your passport stays valid for as long as the destination requires after you enter. Renew it before you apply for a visa if it is too close to expiring.",
    showIf: international,
    dependsOn: ["scope", "origin", "destination", "moveDate", ...DISABILITY],
    detailKind: "factPack",
    priority: "high",
    daysBeforeMove: 90,
  },
  {
    id: "visa.apostilles",
    sectionId: "visa",
    title: "Get apostilles for birth, marriage, and diploma records",
    defaultSummary:
      "Order official copies of the records a visa or employer may ask for, then get an apostille or other legalization if the destination requires it. This often takes weeks.",
    showIf: international,
    dependsOn: ["scope", "origin", "destination", "moveDate", ...DISABILITY],
    detailKind: "factPack",
    priority: "high",
    daysBeforeMove: 75,
  },
  {
    id: "visa.driving",
    sectionId: "visa",
    title: "Driving: local license, international driving permit, or both",
    defaultSummary:
      "Find out whether you can drive on your current license, an international driving permit, or a local license. In the US, an international driving permit is issued through services such as AAA.",
    showIf: international,
    dependsOn: ["scope", "origin", "destination", "dailyLife.mainTransport", "dailyLife.transport", ...DISABILITY],
    detailKind: "factPack",
    priority: "normal",
    daysBeforeMove: 30,
  },
  {
    id: "moveOut.notice",
    sectionId: "moveOut",
    title: "Give notice to your landlord",
    defaultSummary:
      "Read the lease for the notice period, often 30 to 60 days, and send written notice. Keep a copy and a record of how you sent it.",
    showIf: rentingNow,
    dependsOn: ["currentHome", "moveDate", "origin"],
    detailKind: "generic",
    priority: "high",
    daysBeforeMove: 45,
  },
  {
    id: "moveOut.walkthrough",
    sectionId: "moveOut",
    title: "Schedule the move-out walkthrough",
    defaultSummary:
      "Book the walkthrough after the home is empty. Take dated photos of every room, including walls, floors, and appliances.",
    showIf: rentingNow,
    dependsOn: ["currentHome", "moveDate", "origin"],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 7,
  },
  {
    id: "moveOut.deposit",
    sectionId: "moveOut",
    title: "Get your deposit back",
    defaultSummary:
      "Give a forwarding address and a way to receive the deposit. Note the deadline in your lease or local law for the landlord to return it.",
    showIf: rentingNow,
    dependsOn: ["currentHome", "moveDate", "origin"],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 0,
  },
  {
    id: "moveOut.sellOrRent",
    sectionId: "moveOut",
    title: "Sell or rent out your current home (stub)",
    defaultSummary:
      "Decide whether to sell or rent the home you own. Talk with a local agent and a tax preparer before you list it. This step is a stub.",
    showIf: owningNow,
    dependsOn: ["currentHome", "moveDate", "origin"],
    detailKind: "generic",
    priority: "high",
    daysBeforeMove: 90,
  },
  {
    id: "moveOut.keys",
    sectionId: "moveOut",
    title: "Hand over keys",
    defaultSummary: "Return every key, fob, and garage remote, and get a written receipt or a photo of the handoff.",
    dependsOn: ["currentHome", "moveDate", "origin"],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 0,
  },
  {
    id: "moveOut.packing",
    sectionId: "moveOut",
    title: "Packing plan",
    defaultSummary: "Split belongings into ship, carry, sell, donate, and leave behind. Pack a first-week bag last.",
    summarize: packingSummary,
    dependsOn: ["moveDate", "keepItems", "scope", ...DISABILITY],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 21,
  },
  {
    id: "moveOut.moveDay",
    sectionId: "moveOut",
    title: "Move day plan",
    defaultSummary:
      "Write the order of the day: cleaning, pickup or flight, key handoff, and where you will sleep that night. Share it with anyone helping.",
    dependsOn: ["moveDate", "origin", "destination", "scope", ...DISABILITY],
    detailKind: "generic",
    priority: "high",
    daysBeforeMove: 1,
  },
  {
    id: "moveOut.mover",
    sectionId: "moveOut",
    title: "Hire a licensed international mover and compare quotes",
    defaultSummary:
      "Get at least three quotes from licensed international movers. Compare what is included, the transit time, and the insurance, and treat any company name you see as an example, not a recommendation.",
    showIf: international,
    dependsOn: ["scope", "origin", "destination", "moveDate", "keepItems", ...DISABILITY],
    detailKind: "generic",
    priority: "high",
    daysBeforeMove: 120,
  },
  {
    id: "moveOut.transitInsurance",
    sectionId: "moveOut",
    title: "Get transit insurance for shipped items",
    defaultSummary:
      "Insure shipped items for replacement value, especially electronics and anything you cannot replace. Read what the policy excludes before you pay.",
    showIf: international,
    dependsOn: ["scope", "keepItems", "moveDate", "money.moveBudget"],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 45,
  },
  {
    id: "moveOut.freight",
    sectionId: "moveOut",
    title: "Choose sea or air freight in time",
    defaultSummary:
      "Sea freight takes about 3 to 4 months and air freight about 1 month. Pick one early enough that the shipment can arrive near your move date.",
    showIf: international,
    dependsOn: ["scope", "moveDate", "keepItems", "origin", "destination"],
    detailKind: "generic",
    priority: "high",
    daysBeforeMove: 120,
  },
  {
    id: "moveOut.mail",
    sectionId: "moveOut",
    title: "Have someone or a virtual mailbox service hold physical mail",
    defaultSummary:
      "Ask a person you trust to hold mail, or use a virtual mailbox service. Update banks and government accounts with that address.",
    showIf: international,
    dependsOn: ["scope", "origin", "household.stayingBehind", "moveDate"],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 21,
    summarize: (profile) => {
      const people = namedStayingBehind(profile);
      const who = people.length > 0 ? `${people.join(" or ")} could hold mail, or you can use a virtual mailbox service.` : "Ask someone you trust, or use a virtual mailbox service.";
      return `${who} Update banks and government accounts with that address.`;
    },
  },
  {
    id: "moveOut.phone",
    sectionId: "moveOut",
    title: "Keep your home number alive for bank texts and get a local eSIM",
    defaultSummary:
      "Keep your current number on a low-cost plan so banks can text you, and use a local eSIM (such as Airalo) for data. Provider names are examples, not a recommendation.",
    showIf: international,
    dependsOn: ["scope", "origin", "destination", "moveDate"],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 14,
  },
  {
    id: "housing.fitCheck",
    sectionId: "housing",
    title: "Check that your place fits",
    defaultSummary: "Compare the address you already have with your budget, commute limits, and daily errands before you sign or close.",
    showIf: hasAddress,
    summarize: (profile) =>
      `Check ${profile.destination.place.label} against ${moneyLine(profile)} and the commute to ${pinPhrase(profile)}.`,
    dependsOn: ["destination", "chosenArea", "pins", "money.housingBudget", "money.housingIntent", "dailyLife", "household", ...DISABILITY],
    detailKind: "fitCheck",
    sprite: "umbrella",
    priority: "high",
    daysBeforeMove: 60,
  },
  {
    id: "housing.areaSearch",
    sectionId: "housing",
    title: "Choose a location",
    defaultSummary: "Compare neighborhoods against your budget, commute limits, and the way you get around.",
    showIf: hasArea,
    summarize: (profile) =>
      `Compare areas in ${profile.destination.place.label} within ${moneyLine(profile)} and a workable trip to ${pinPhrase(profile)}.`,
    dependsOn: ["destination", "chosenArea", "pins", "money.housingBudget", "money.housingIntent", "dailyLife", "household", ...DISABILITY],
    detailKind: "areaSearch",
    sprite: "umbrella",
    priority: "high",
    daysBeforeMove: 60,
  },
  {
    id: "housing.commute",
    sectionId: "housing",
    title: "Check the commute to your pins",
    defaultSummary: "Compare travel time from the home you are considering to each pin, and flag any trip over your limit.",
    showIf: hasPins,
    summarize: (profile) => `Check the trip from your housing search to ${pinPhrase(profile)}.`,
    dependsOn: ["destination", "chosenArea", "pins", "dailyLife.mainTransport", ...DISABILITY],
    detailKind: "commute",
    priority: "high",
    daysBeforeMove: 60,
  },
  {
    id: "housing.rent.application",
    sectionId: "housing",
    title: "Rent: apply",
    defaultSummary: "Gather ID, income, and references before you apply. Ask which fees are refundable.",
    showIf: willRent,
    dependsOn: ["money.housingIntent", "destination", "scope", ...DISABILITY],
    detailKind: "generic",
    priority: "normal",
    sublist: "rent",
    daysBeforeMove: 30,
  },
  {
    id: "housing.rent.lease",
    sectionId: "housing",
    title: "Rent: review and sign the lease",
    defaultSummary:
      "Read the deposit, rent, fees, length, and what happens if you leave early. Get a copy in a language you read well before you sign.",
    showIf: willRent,
    dependsOn: ["money.housingIntent", "money.housingBudget", "destination", ...DISABILITY],
    detailKind: "generic",
    priority: "high",
    sublist: "rent",
    daysBeforeMove: 21,
  },
  {
    id: "housing.rent.deposit",
    sectionId: "housing",
    title: "Rent: pay the deposit and get a receipt",
    defaultSummary: "Pay by a traceable transfer and keep the receipt. Do not pay a deposit before you have a signed contract.",
    showIf: willRent,
    dependsOn: ["money.housingIntent", "money.housingBudget", "destination", ...DISABILITY],
    detailKind: "generic",
    priority: "normal",
    sublist: "rent",
    daysBeforeMove: 14,
  },
  {
    id: "housing.rent.utilities",
    sectionId: "housing",
    title: "Rent: set up utilities and internet",
    defaultSummary: "Ask which utilities are included, then schedule the rest and internet for the week you arrive.",
    showIf: willRent,
    dependsOn: ["money.housingIntent", "destination", "moveDate", ...DISABILITY],
    detailKind: "generic",
    priority: "normal",
    sublist: "rent",
    daysBeforeMove: -3,
  },
  {
    id: "housing.buy.preapproval",
    sectionId: "housing",
    title: "Buy: get pre-approved (stub)",
    defaultSummary: "Ask a lender for a pre-approval so you know your price range. This step is a stub.",
    showIf: willBuy,
    dependsOn: ["money.housingIntent", "money.housingBudget", "destination"],
    detailKind: "generic",
    priority: "normal",
    sublist: "buy",
    daysBeforeMove: 45,
  },
  {
    id: "housing.buy.inspection",
    sectionId: "housing",
    title: "Buy: inspection (stub)",
    defaultSummary: "Hire an inspector before you close, and read the report. This step is a stub.",
    showIf: willBuy,
    dependsOn: ["money.housingIntent", "destination"],
    detailKind: "generic",
    priority: "normal",
    sublist: "buy",
    daysBeforeMove: 21,
  },
  {
    id: "housing.buy.closing",
    sectionId: "housing",
    title: "Buy: closing (stub)",
    defaultSummary: "Confirm the closing date, the funds, and which documents to bring. This step is a stub.",
    showIf: willBuy,
    dependsOn: ["money.housingIntent", "moveDate", "destination"],
    detailKind: "generic",
    priority: "normal",
    sublist: "buy",
    daysBeforeMove: 7,
  },
  {
    id: "paperwork.address",
    sectionId: "paperwork",
    title: "Change your address",
    defaultSummary: "Update your address with banks, your employer, subscriptions, and government accounts.",
    dependsOn: ["destination", "origin", "moveDate"],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 14,
  },
  {
    id: "paperwork.id",
    sectionId: "paperwork",
    title: "Update your ID",
    defaultSummary: "Check whether your current ID stays valid and what local ID you need after you arrive.",
    dependsOn: ["destination", "origin", "scope", "moveDate"],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 14,
  },
  {
    id: "paperwork.vehicle",
    sectionId: "paperwork",
    title: "Vehicle registration, title, and plates",
    defaultSummary: "Update the registration, title, and insurance for the car you will use, and learn the local deadline.",
    showIf: keepsACar,
    dependsOn: ["dailyLife.transport", "keepItems", "destination", "origin"],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 14,
  },
  {
    id: "paperwork.insurance",
    sectionId: "paperwork",
    title: "Proof of insurance",
    defaultSummary: "Line up renters or home insurance, and auto insurance if you have a car. Cancel the old policy only after the new one starts.",
    dependsOn: ["money.housingIntent", "destination", "dailyLife.transport", "moveDate"],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 7,
  },
  {
    id: "paperwork.banks",
    sectionId: "paperwork",
    title: "Banks and bills",
    defaultSummary: "Tell your bank about the move, list the bills to transfer or cancel, and plan how you will pay the first month.",
    dependsOn: ["origin", "destination", "scope", "money", "moveDate"],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 14,
  },
  {
    id: "paperwork.bag",
    sectionId: "paperwork",
    title: "Papers in the bag",
    defaultSummary: "Carry passports, IDs, the lease or closing papers, insurance, and medical notes. Do not pack them in a shipment.",
    dependsOn: ["scope", "destination", "household", "keepItems"],
    detailKind: "generic",
    priority: "high",
    daysBeforeMove: 2,
  },
  {
    id: "paperwork.workLicense",
    sectionId: "paperwork",
    title: "Transfer your work license",
    defaultSummary:
      "If your job is licensed (nursing, teaching, law, trades, and similar), ask the destination board what transfers and how long it takes. This is not legal advice.",
    showIf: (profile) => profile.money.regulatedJob,
    dependsOn: ["money.regulatedJob", "origin", "destination", "scope"],
    detailKind: "generic",
    priority: "high",
    daysBeforeMove: 60,
  },
  {
    id: "paperwork.disability",
    sectionId: "paperwork",
    title: "Transfer disability documents and benefits",
    defaultSummary:
      "Gather documents for an accessible parking permit, benefits, and school or work accommodations, and ask which ones you must reapply for after the move.",
    showIf: hasDisabilities,
    dependsOn: ["household.disabilities", "household.disabilityNotes", "origin", "destination", "scope"],
    detailKind: "generic",
    priority: "high",
    daysBeforeMove: 30,
  },
  {
    id: "paperwork.cardsAbroad",
    sectionId: "paperwork",
    title: "Cards that work abroad",
    defaultSummary: "Ask your bank whether your cards work at the destination, and tell them the dates so they do not freeze the card.",
    showIf: international,
    dependsOn: ["scope", "origin", "destination", "moveDate"],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 21,
  },
  {
    id: "paperwork.backupCard",
    sectionId: "paperwork",
    title: "A backup card from a different provider",
    defaultSummary: "Carry a second card from a different network in case one is blocked. Keep them in different bags.",
    showIf: international,
    dependsOn: ["scope", "moveDate"],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 21,
  },
  {
    id: "paperwork.taxes",
    sectionId: "paperwork",
    title: "Tax obligations in both countries",
    defaultSummary:
      "Learn what you still file in your home country and what the destination expects. This is a reminder to check official guidance, not tax advice.",
    showIf: international,
    dependsOn: ["scope", "origin", "destination", "moveDate", "money"],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 30,
  },
  {
    id: "paperwork.savingsBuffer",
    sectionId: "paperwork",
    title: "Savings buffer",
    defaultSummary: "Set aside moving costs plus 3 to 6 months of living expenses.",
    showIf: international,
    summarize: savingsSummary,
    dependsOn: ["scope", "money.moveBudget", "money.housingBudget", "money.housingIntent", "money.currency"],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 60,
  },
  {
    id: "health.clinic",
    sectionId: "health",
    title: "Find a clinic near your new home",
    defaultSummary: "Find a clinic you can reach from your new home, and save the after-hours number.",
    dependsOn: ["destination", "chosenArea", "household.disabilities", "household.disabilityNotes"],
    detailKind: "placeFinder",
    sprite: "bandage",
    priority: "normal",
    daysBeforeMove: 14,
  },
  {
    id: "health.prescriptions",
    sectionId: "health",
    title: "Prescriptions",
    defaultSummary: "Refill prescriptions before you leave and carry a copy of each prescription. Ask how you will refill them after the move.",
    dependsOn: ["destination", "scope", "moveDate", ...DISABILITY],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 21,
  },
  {
    id: "health.records",
    sectionId: "health",
    title: "Medical records",
    defaultSummary: "Request digital copies of records and vaccinations, including specialists and equipment suppliers if you use them.",
    dependsOn: ["destination", "scope", ...DISABILITY],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 30,
  },
  {
    id: "health.checkup",
    sectionId: "health",
    title: "Checkup before leaving",
    defaultSummary: "Book a physical, vision, and dental checkup while your current coverage still applies, and stock up on prescriptions.",
    showIf: international,
    dependsOn: ["scope", "moveDate", ...DISABILITY],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 30,
  },
  {
    id: "health.coverage",
    sectionId: "health",
    title: "A policy that covers care and evacuation in {country}",
    defaultSummary:
      "Bridge the gap until local coverage starts with a policy that includes care and evacuation. Examples of providers include SafetyWing, Allianz, Cigna, and Aetna. Those names are examples, not a recommendation.",
    showIf: international,
    dependsOn: ["scope", "destination", "moveDate", ...DISABILITY],
    detailKind: "generic",
    priority: "high",
    daysBeforeMove: 21,
  },
  {
    id: "household.school",
    sectionId: "household",
    title: "School and childcare",
    defaultSummary: "Ask about enrollment deadlines and, when a child has a disability, how special education services transfer.",
    showIf: hasKids,
    summarize: (profile) => {
      const ages = profile.household.kids.map((kid) => kid.age).join(", ");
      return `Start school or childcare enrollment for children aged ${ages}. Ask about deadlines and records to bring. If a child has a disability, ask how special education services transfer.`;
    },
    dependsOn: ["household.kids", "household.disabilities", "destination", "chosenArea"],
    detailKind: "placeFinder",
    priority: "high",
    daysBeforeMove: 60,
  },
  {
    id: "household.pets",
    sectionId: "household",
    title: "Pets: vet records, travel, and import rules",
    defaultSummary: "Update vet records and plan how each pet will travel. Check import rules before an international move.",
    showIf: hasPets,
    summarize: petSummary,
    dependsOn: ["household.pets", "scope", "destination", "origin", "moveDate"],
    detailKind: "generic",
    sprite: "paw",
    priority: "high",
    daysBeforeMove: 90,
  },
  {
    id: "household.accessibility",
    sectionId: "household",
    title: "Accessibility plan",
    defaultSummary:
      "Plan home modifications, equipment, support services, and a local disability organization to contact after you arrive.",
    showIf: hasDisabilities,
    dependsOn: ["household.disabilities", "household.disabilityNotes", "destination", "chosenArea"],
    detailKind: "placeFinder",
    priority: "high",
    daysBeforeMove: 45,
  },
  {
    id: "household.needs",
    sectionId: "household",
    title: "Special needs from your quiz",
    defaultSummary: "Turn the special considerations from your quiz into concrete setup tasks for the new home.",
    showIf: hasNeeds,
    summarize: (profile) =>
      `Plan for ${realNeeds(profile).join(", ")}. List what must be in place on the first day and who to call locally.`,
    dependsOn: ["household.specialNeeds", "destination", "chosenArea"],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 30,
  },
  {
    id: "household.contact",
    sectionId: "household",
    title: "A contact rhythm for people who stayed",
    defaultSummary: "Pick a repeating time to talk with the people who stayed behind.",
    showIf: hasContact,
    summarize: contactSummary,
    dependsOn: ["household.stayingBehind", "destination", "origin"],
    detailKind: "generic",
    priority: "normal",
    daysBeforeMove: 14,
  },
  {
    id: "moveIn.transport",
    sectionId: "moveIn",
    title: "Get around your new area",
    defaultSummary: "Set up the way you said you will get around, before the first week of errands.",
    summarize: transportSummary,
    dependsOn: ["dailyLife.mainTransport", "dailyLife.transport", "destination", "chosenArea", "pins", ...DISABILITY],
    detailKind: "placeFinder",
    priority: "normal",
    daysBeforeMove: 0,
  },
  {
    id: "moveIn.socialSpot",
    sectionId: "moveIn",
    title: "Find a regular social spot",
    defaultSummary: "Find one place you would go back to, based on the food, hobbies, and activities you listed.",
    summarize: (profile) => {
      const interests = [...profile.dailyLife.culture, ...profile.dailyLife.amenities, ...profile.dailyLife.recreation].filter(Boolean);
      if (interests.length === 0) return "Find one nearby place you would go back to in the first month, such as a cafe, park, or community center.";
      return `Find a regular spot tied to ${interests.join(", ")}.`;
    },
    dependsOn: ["dailyLife.culture", "dailyLife.amenities", "dailyLife.recreation", "destination", "chosenArea", ...DISABILITY],
    detailKind: "placeFinder",
    priority: "normal",
    daysBeforeMove: -7,
  },
  {
    id: "moveIn.grocery",
    sectionId: "moveIn",
    title: "Find a grocery store",
    defaultSummary: "Find a grocery store you can reach from your new home in the first few days.",
    dependsOn: ["destination", "chosenArea", "dailyLife.mainTransport", ...DISABILITY],
    detailKind: "placeFinder",
    sprite: "food",
    priority: "normal",
    daysBeforeMove: 0,
  },
  {
    id: "moveIn.pharmacy",
    sectionId: "moveIn",
    title: "Find a pharmacy",
    defaultSummary: "Find a pharmacy near your new home and note the hours.",
    dependsOn: ["destination", "chosenArea", ...DISABILITY],
    detailKind: "placeFinder",
    sprite: "bandage",
    priority: "normal",
    daysBeforeMove: 0,
  },
];

const TEMPLATE_BY_ID = new Map(TASK_TEMPLATES.map((entry) => [entry.id, entry]));

export function templateById(taskId: string): TemplateEntry | undefined {
  return TEMPLATE_BY_ID.get(taskId);
}

// Fields that should refresh an AI-added task. Version is excluded so a Settings
// save that only bumps the version does not throw away text that is still valid.
export const AI_TASK_DEPENDS = [
  "scope",
  "origin",
  "destination",
  "chosenArea",
  "household",
  "money",
  "dailyLife",
  "pins",
  "moveDate",
  "keepItems",
  "currentHome",
] as const;

export function dependsOnFor(taskId: string): readonly string[] {
  return templateById(taskId)?.dependsOn ?? AI_TASK_DEPENDS;
}

export function titleFor(entry: TemplateEntry, profile: Profile): string {
  if (entry.id === "moveIn.transport") return transportTitle(profile);
  return entry.title.replaceAll("{country}", destinationCountry(profile));
}

export const VERIFY_WITH_SOURCE =
  "AI-generated. Verify with the official source before acting.";

export const VERIFY_TASK_IDS = new Set([
  "visa.permit",
  "visa.passport",
  "visa.apostilles",
  "visa.driving",
  "paperwork.taxes",
  "paperwork.insurance",
  "health.coverage",
]);
