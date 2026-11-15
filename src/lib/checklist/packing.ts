import type { Disability, Profile } from "@/lib/types";
import { countryName, hasDisabilities, keepsACar } from "@/lib/checklist/profile";

export type PackingItem = { id: string; name: string; note?: string; suggested?: boolean };

export function itemId(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "item"
  );
}

const item = (name: string, note?: string): PackingItem => ({ id: itemId(name), name, ...(note ? { note } : {}) });

export function hobbyInterests(profile: Profile): string[] {
  return [...profile.dailyLife.amenities, ...profile.dailyLife.recreation].map((entry) => entry.trim()).filter(Boolean);
}

export function moveMonth(profile: Profile): string | null {
  if (!profile.moveDate) return null;
  const date = new Date(`${profile.moveDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en", { month: "long", timeZone: "UTC" });
}

export function packingVehicle(profile: Profile): "car" | "bike" | null {
  if (profile.scope === "domestic" && keepsACar(profile)) return "car";
  if (profile.dailyLife.transport.includes("bike")) return "bike";
  return null;
}

function cityName(profile: Profile): string {
  return (profile.chosenArea ?? profile.destination.place).label.split(",")[0];
}

const DISABILITY_ITEMS: Record<Disability, PackingItem[]> = {
  mobility: [item("Wheelchair, walker, or cane", "Ask the airline or movers how it travels"), item("Chargers and spare parts for mobility equipment")],
  vision: [item("Spare glasses or contacts"), item("Magnifier, cane, or other low-vision tools")],
  hearing: [item("Hearing aid batteries or charger"), item("Captioning or alert devices")],
  cognitive: [item("Written move-day schedule"), item("Familiar comfort items for the first night")],
  chronicIllness: [item("Medical devices and their chargers"), item("Cooler bag for medication that needs it")],
  mentalHealth: [item("Comfort items and noise-canceling headphones"), item("Care team contacts on paper")],
  other: [item("Any equipment you use every day")],
};

function firstNight(profile: Profile): PackingItem[] {
  const { people, kids, pets } = profile.household;
  const each = people > 1 ? ` for all ${people} people` : "";
  const items = [
    item(`Toothbrushes and toiletries${each}`),
    item(`A change of clothes${each}`),
    item("Sheets, pillows, and a towel for each bed"),
    item("Phone chargers and a power strip"),
    item("Snacks and water"),
    item("Basic medicine: pain relief, bandages, any daily prescriptions"),
    item("Toilet paper and hand soap"),
    item("Box cutter or scissors"),
  ];
  if (kids.length > 0) items.push(item("Each child's comfort toy or blanket"));
  if (pets.some((pet) => pet.count > 0)) items.push(item("Two days of pet food and bowls"));
  if (hasDisabilities(profile)) items.push(item("Daily medication and equipment chargers", "Keep these with you, not in a box"));
  return items;
}

function clothes(profile: Profile): PackingItem[] {
  const month = moveMonth(profile);
  const walking = ["walk", "transit"].includes(profile.dailyLife.mainTransport);
  const items = [
    item("Two weeks of everyday outfits", month ? `Check the usual weather in ${cityName(profile)} in ${month}` : undefined),
    item("Sleepwear and underwear for two weeks"),
    item(walking ? "Comfortable walking shoes" : "Everyday shoes"),
    item("A warm layer for cool evenings"),
    item("Rain jacket or umbrella"),
    item("One outfit for work, school, or appointments"),
    item("Laundry bag and a small pack of detergent"),
  ];
  if (profile.dailyLife.mainTransport === "bike") items.push(item("Cycling gear: helmet, gloves, reflective layer"));
  return items;
}

function openFirst(profile: Profile): PackingItem[] {
  const items = [
    item("Paper towels, cleaning spray, and trash bags"),
    item("Basic tools: screwdriver, tape, box cutter"),
    item("Light bulbs and a flashlight"),
    item("A pot, a pan, plates, cups, and cutlery"),
    item("Kettle or coffee maker"),
    item("Shower curtain and bath mat"),
    item("Extension cord"),
  ];
  if (profile.household.kids.length > 0) items.push(item("Night light and the kids' bedding"));
  if (profile.household.pets.some((pet) => pet.count > 0)) items.push(item("Pet bed, litter box, or crate"));
  return items;
}

function carryOn(profile: Profile): PackingItem[] {
  const country = countryName(profile.destination.place.countryCode);
  return [
    item("Passports and visas", "See Papers in the bag under Paperwork"),
    item("Copies of key documents, on paper and on your phone"),
    item("Phone, laptop, and their chargers"),
    item(`Plug adapter for ${country}`, "Check whether your devices need a voltage converter"),
    item("Medication in its original packaging, with a copy of the prescription"),
    item("A change of clothes in case bags are delayed"),
    item("Jewelry and other valuables"),
    item("A backup bank card, kept apart from the main one"),
    item("A pen for arrival forms"),
  ];
}

function keepItems(profile: Profile): PackingItem[] {
  return profile.keepItems
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => item(entry, "Decide: ship it, or bring it with you"));
}

function kids(profile: Profile): PackingItem[] {
  const ages = profile.household.kids.map((kid) => kid.age);
  const items: PackingItem[] = [];
  if (ages.some((age) => age < 3)) items.push(item("Diapers, wipes, and a changing pad"), item("Bottles, formula, or baby food for the trip"));
  if (ages.some((age) => age >= 3 && age < 13)) items.push(item("Books, games, or a tablet with headphones"), item("Kid-friendly snacks"));
  if (ages.some((age) => age >= 13)) items.push(item("Teen chargers, headphones, and something to do"));
  items.push(item("A favorite toy, blanket, or pillow"), item("Copies of school and medical records"), item("Car seat or booster", "Check the rules at the destination"));
  return items;
}

const PET_ITEMS: Record<string, string[]> = {
  dog: ["Leash, collar, and waste bags", "Chew toy"],
  cat: ["Litter, a scoop, and a disposable litter tray", "Scratcher or familiar blanket"],
};

function pets(profile: Profile): PackingItem[] {
  const list = profile.household.pets.filter((pet) => pet.count > 0);
  const items = list.map((pet) => item(`Carrier or crate for ${pet.count > 1 ? `each of ${pet.count} ${pet.kind}s` : `your ${pet.kind}`}`));
  for (const pet of list) {
    const kind = pet.kind.trim().toLowerCase();
    for (const name of PET_ITEMS[kind] ?? PET_ITEMS[kind.replace(/s$/, "")] ?? []) items.push(item(name));
  }
  items.push(
    item("One week of food and any medication"),
    item("Bowls and a water bottle"),
    item("Vet records and vaccination certificates"),
    item("ID tag or microchip updated with your new address"),
  );
  return items;
}

function medical(profile: Profile): PackingItem[] {
  const notes = profile.household.disabilityNotes?.trim();
  const items = [
    item("Two weeks of medication in original packaging", "Carry it with you"),
    item("Copies of prescriptions and a doctor's letter for equipment"),
  ];
  for (const disability of profile.household.disabilities) items.push(...DISABILITY_ITEMS[disability]);
  if (notes) items.push(item("Anything else from your notes", notes));
  return items;
}

function hobbies(profile: Profile): PackingItem[] {
  return hobbyInterests(profile).map((interest) => item(`Gear for ${interest}`, "Bring it, or buy it after you arrive?"));
}

function vehicle(profile: Profile): PackingItem[] {
  if (packingVehicle(profile) === "car") {
    return [
      item("Registration and insurance papers"),
      item("Emergency kit: jumper cables, first aid, flashlight"),
      item("Check the spare tire"),
      item("Phone mount and car charger"),
      item("Offline maps for the route"),
      item("Snacks, water, and a trash bag for the drive"),
    ];
  }
  return [
    item("Bike box, bag, or rack"),
    item("Tools to take off pedals and turn the handlebars"),
    item("Lock and lights"),
    item("Helmet"),
  ];
}

const BUILDERS: Record<string, (profile: Profile) => PackingItem[]> = {
  "packing.firstNight": firstNight,
  "packing.clothes": clothes,
  "packing.openFirst": openFirst,
  "packing.carryOn": carryOn,
  "packing.keepItems": keepItems,
  "packing.kids": kids,
  "packing.pets": pets,
  "packing.medical": medical,
  "packing.hobbies": hobbies,
  "packing.vehicle": vehicle,
};

// Quiz-based starting list for a packing task. Gemini may add items on top.
export function packingItemsFor(taskId: string, profile: Profile): PackingItem[] {
  const items = BUILDERS[taskId]?.(profile) ?? [];
  const seen = new Set<string>();
  return items.filter((entry) => (seen.has(entry.id) ? false : (seen.add(entry.id), true)));
}

export function packingItemKey(taskId: string, itemIdValue: string): string {
  return `${taskId}:${itemIdValue}`;
}
