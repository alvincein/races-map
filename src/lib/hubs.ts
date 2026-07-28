import type { RaceWithSubRaces } from '../types/database';
import { getRegionLabel } from './regions';
import { slugify, getRaceSlug } from './slugs';
import { haversineKm, raceDate } from './relatedRaces';

// ---------------------------------------------------------------------------
// Programmatic SEO hub pages (/agones/*). Each hub is a statically generated
// landing page targeting how Greek runners actually search (verified via
// Google autocomplete): city + year ("αγώνες δρόμου αθήνα 2026"), mountains
// ("αγώνας βουνού όλυμπος"), months, distances, and a few identity regions.
// Pages are data-gated: a hub only exists while it has enough races to be a
// genuinely useful page, so the set grows/shrinks with the calendar.
// ---------------------------------------------------------------------------

export type HubKind = 'month' | 'city' | 'mountain' | 'distance' | 'type' | 'region';

export interface ResolvedHub {
  slug: string;
  kind: HubKind;
  /** Display name, e.g. "Αθήνα", "Σεπτέμβριος 2026", "Μαραθώνιος". */
  name: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  /** Races with a date >= today, ascending. */
  upcoming: RaceWithSubRaces[];
  /** Races already run (shown collapsed), descending, capped. */
  past: RaceWithSubRaces[];
  /** Geographic footprint for city/mountain hubs — outlined on the map. */
  area?: { lat: number; lng: number; radiusKm: number };
}

export const KIND_META: Record<HubKind, { heading: string; order: number }> = {
  month: { heading: 'Ανά Μήνα', order: 1 },
  city: { heading: 'Ανά Πόλη', order: 2 },
  mountain: { heading: 'Βουνά & Περιοχές Trail', order: 3 },
  distance: { heading: 'Ανά Απόσταση', order: 4 },
  type: { heading: 'Είδος Αγώνα', order: 5 },
  region: { heading: 'Ανά Περιφέρεια', order: 6 },
};

// --- Registries -------------------------------------------------------------

interface CityDef {
  slug: string;
  name: string;
  /** Prepositional phrase for prose, e.g. "κοντά στην Αθήνα". */
  inPhrase: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

const CITIES: CityDef[] = [
  { slug: 'athina', name: 'Αθήνα', inPhrase: 'κοντά στην Αθήνα', lat: 37.9838, lng: 23.7275, radiusKm: 50 },
  { slug: 'thessaloniki', name: 'Θεσσαλονίκη', inPhrase: 'κοντά στη Θεσσαλονίκη', lat: 40.6401, lng: 22.9444, radiusKm: 50 },
  { slug: 'patra', name: 'Πάτρα', inPhrase: 'κοντά στην Πάτρα', lat: 38.2466, lng: 21.7346, radiusKm: 45 },
  { slug: 'irakleio', name: 'Ηράκλειο', inPhrase: 'κοντά στο Ηράκλειο', lat: 35.3387, lng: 25.1442, radiusKm: 45 },
  { slug: 'larisa', name: 'Λάρισα', inPhrase: 'κοντά στη Λάρισα', lat: 39.639, lng: 22.4191, radiusKm: 40 },
  { slug: 'volos', name: 'Βόλος', inPhrase: 'κοντά στον Βόλο', lat: 39.3622, lng: 22.9422, radiusKm: 35 },
  { slug: 'ioannina', name: 'Ιωάννινα', inPhrase: 'κοντά στα Ιωάννινα', lat: 39.665, lng: 20.8537, radiusKm: 45 },
  { slug: 'kalamata', name: 'Καλαμάτα', inPhrase: 'κοντά στην Καλαμάτα', lat: 37.0389, lng: 22.1142, radiusKm: 45 },
  { slug: 'chania', name: 'Χανιά', inPhrase: 'κοντά στα Χανιά', lat: 35.5138, lng: 24.018, radiusKm: 45 },
  { slug: 'kavala', name: 'Καβάλα', inPhrase: 'κοντά στην Καβάλα', lat: 40.9396, lng: 24.4129, radiusKm: 45 },
  { slug: 'alexandroupoli', name: 'Αλεξανδρούπολη', inPhrase: 'κοντά στην Αλεξανδρούπολη', lat: 40.8457, lng: 25.874, radiusKm: 45 },
  { slug: 'trikala', name: 'Τρίκαλα', inPhrase: 'κοντά στα Τρίκαλα', lat: 39.5557, lng: 21.7679, radiusKm: 35 },
  { slug: 'serres', name: 'Σέρρες', inPhrase: 'κοντά στις Σέρρες', lat: 41.0856, lng: 23.5484, radiusKm: 40 },
  { slug: 'rodos', name: 'Ρόδος', inPhrase: 'στη Ρόδο', lat: 36.4341, lng: 28.2176, radiusKm: 45 },
];

interface MountainDef {
  slug: string;
  name: string;
  inPhrase: string;
  lat: number;
  lng: number;
  radiusKm: number;
  /** Conservative normalized substrings matched against race name/place. */
  nameMatches: string[];
}

const MOUNTAINS: MountainDef[] = [
  { slug: 'olympos', name: 'Όλυμπος', inPhrase: 'στον Όλυμπο', lat: 40.0859, lng: 22.3583, radiusKm: 30, nameMatches: ['ολυμπος', 'ολυμπου', 'olympus', 'olympos'] },
  { slug: 'parnitha', name: 'Πάρνηθα', inPhrase: 'στην Πάρνηθα', lat: 38.1707, lng: 23.7237, radiusKm: 15, nameMatches: ['παρνηθα', 'parnitha'] },
  { slug: 'ymittos', name: 'Υμηττός', inPhrase: 'στον Υμηττό', lat: 37.95, lng: 23.81, radiusKm: 12, nameMatches: ['υμηττος', 'υμηττου', 'ymittos', 'hymettus'] },
  { slug: 'penteli', name: 'Πεντέλη', inPhrase: 'στην Πεντέλη', lat: 38.0578, lng: 23.8623, radiusKm: 12, nameMatches: ['πεντελη', 'penteli'] },
  { slug: 'pilio', name: 'Πήλιο', inPhrase: 'στο Πήλιο', lat: 39.44, lng: 23.05, radiusKm: 30, nameMatches: ['πηλιο', 'pilio', 'pelion'] },
  { slug: 'parnassos', name: 'Παρνασσός', inPhrase: 'στον Παρνασσό', lat: 38.535, lng: 22.6242, radiusKm: 30, nameMatches: ['παρνασσος', 'παρνασσου', 'parnassos'] },
  { slug: 'taygetos', name: 'Ταΰγετος', inPhrase: 'στον Ταΰγετο', lat: 36.955, lng: 22.35, radiusKm: 30, nameMatches: ['ταυγετος', 'ταυγετου', 'taygetos'] },
  { slug: 'zagori', name: 'Ζαγόρι', inPhrase: 'στο Ζαγόρι', lat: 39.9, lng: 20.75, radiusKm: 30, nameMatches: ['ζαγορι', 'zagori', 'τυμφη', 'tymfi', 'βικος', 'vikos'] },
  { slug: 'tzoumerka', name: 'Τζουμέρκα', inPhrase: 'στα Τζουμέρκα', lat: 39.5, lng: 21.2, radiusKm: 30, nameMatches: ['τζουμερκα', 'tzoumerka'] },
  { slug: 'psiloritis', name: 'Ψηλορείτης', inPhrase: 'στον Ψηλορείτη', lat: 35.23, lng: 24.77, radiusKm: 25, nameMatches: ['ψηλορειτης', 'psiloritis'] },
  { slug: 'dirfys', name: 'Δίρφυς', inPhrase: 'στη Δίρφυ', lat: 38.626, lng: 23.871, radiusKm: 20, nameMatches: ['διρφυς', 'διρφυος', 'dirfys'] },
  { slug: 'chelmos', name: 'Χελμός', inPhrase: 'στον Χελμό', lat: 38.0, lng: 22.2, radiusKm: 25, nameMatches: ['χελμος', 'χελμου', 'chelmos', 'helmos'] },
];

interface RegionDef {
  slug: string;
  /** Canonical Greek label, as returned by getRegionLabel(). */
  label: string;
  inPhrase: string;
}

const REGIONS: RegionDef[] = [
  { slug: 'attiki', label: 'Αττική', inPhrase: 'στην Αττική' },
  { slug: 'kentriki-makedonia', label: 'Κεντρική Μακεδονία', inPhrase: 'στην Κεντρική Μακεδονία' },
  { slug: 'thessalia', label: 'Θεσσαλία', inPhrase: 'στη Θεσσαλία' },
  { slug: 'dytiki-ellada', label: 'Δυτική Ελλάδα', inPhrase: 'στη Δυτική Ελλάδα' },
  { slug: 'peloponnisos', label: 'Πελοπόννησος', inPhrase: 'στην Πελοπόννησο' },
  { slug: 'kriti', label: 'Κρήτη', inPhrase: 'στην Κρήτη' },
  { slug: 'anatoliki-makedonia-thraki', label: 'Ανατολική Μακεδονία & Θράκη', inPhrase: 'στην Ανατολική Μακεδονία & Θράκη' },
  { slug: 'ipeiros', label: 'Ήπειρος', inPhrase: 'στην Ήπειρο' },
  { slug: 'sterea-ellada', label: 'Στερεά Ελλάδα', inPhrase: 'στη Στερεά Ελλάδα' },
  { slug: 'notio-aigaio', label: 'Νότιο Αιγαίο', inPhrase: 'στο Νότιο Αιγαίο' },
  { slug: 'dytiki-makedonia', label: 'Δυτική Μακεδονία', inPhrase: 'στη Δυτική Μακεδονία' },
  { slug: 'ionia-nisia', label: 'Ιόνια Νησιά', inPhrase: 'στα Ιόνια Νησιά' },
  { slug: 'voreio-aigaio', label: 'Βόρειο Αιγαίο', inPhrase: 'στο Βόρειο Αιγαίο' },
];

const MONTHS = [
  { num: 1, slug: 'ianouarios', nom: 'Ιανουάριος', gen: 'Ιανουαρίου' },
  { num: 2, slug: 'fevrouarios', nom: 'Φεβρουάριος', gen: 'Φεβρουαρίου' },
  { num: 3, slug: 'martios', nom: 'Μάρτιος', gen: 'Μαρτίου' },
  { num: 4, slug: 'aprilios', nom: 'Απρίλιος', gen: 'Απριλίου' },
  { num: 5, slug: 'maios', nom: 'Μάιος', gen: 'Μαΐου' },
  { num: 6, slug: 'iounios', nom: 'Ιούνιος', gen: 'Ιουνίου' },
  { num: 7, slug: 'ioulios', nom: 'Ιούλιος', gen: 'Ιουλίου' },
  { num: 8, slug: 'avgoustos', nom: 'Αύγουστος', gen: 'Αυγούστου' },
  { num: 9, slug: 'septemvrios', nom: 'Σεπτέμβριος', gen: 'Σεπτεμβρίου' },
  { num: 10, slug: 'oktovrios', nom: 'Οκτώβριος', gen: 'Οκτωβρίου' },
  { num: 11, slug: 'noemvrios', nom: 'Νοέμβριος', gen: 'Νοεμβρίου' },
  { num: 12, slug: 'dekemvrios', nom: 'Δεκέμβριος', gen: 'Δεκεμβρίου' },
];

interface DistanceDef {
  slug: string;
  name: string;
  /** Nominative plural ("οι μαραθώνιοι") and accusative ("τους μαραθώνιους"). */
  pluralNom: string;
  pluralAcc: string;
  minM: number;
  maxM: number; // exclusive
}

const DISTANCES: DistanceDef[] = [
  { slug: '5k', name: 'Αγώνες 5χλμ', pluralNom: 'αγώνες 5 χιλιομέτρων', pluralAcc: 'αγώνες 5 χιλιομέτρων', minM: 4500, maxM: 6000 },
  { slug: '10k', name: 'Αγώνες 10χλμ', pluralNom: 'αγώνες 10 χιλιομέτρων', pluralAcc: 'αγώνες 10 χιλιομέτρων', minM: 9000, maxM: 11500 },
  { slug: 'imimarathonios', name: 'Ημιμαραθώνιοι', pluralNom: 'ημιμαραθώνιοι', pluralAcc: 'ημιμαραθώνιους', minM: 20000, maxM: 21600 },
  { slug: 'marathonios', name: 'Μαραθώνιοι', pluralNom: 'μαραθώνιοι', pluralAcc: 'μαραθώνιους', minM: 41000, maxM: 43500 },
  { slug: 'ultra', name: 'Ultra & Υπεραποστάσεις', pluralNom: 'αγώνες ultra', pluralAcc: 'αγώνες ultra', minM: 43500, maxM: Infinity },
];

const TYPES = [
  { slug: 'dromos', name: 'Αγώνες Δρόμου', eventType: 'road', inPhrase: 'δρόμου (άσφαλτος)' },
  { slug: 'vouno', name: 'Ορεινό Τρέξιμο & Trail', eventType: 'trail', inPhrase: 'βουνού και trail' },
];

// --- Helpers ----------------------------------------------------------------

/** Today's date (YYYY-MM-DD) in Greece — hub pages revalidate daily. */
export function athensToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' });
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ς/g, 'σ');
}

function raceSearchText(race: RaceWithSubRaces): string {
  return normalizeText(
    [race.event_name, race.event_name_en, race.location_place, race.location_city]
      .filter(Boolean)
      .join(' '),
  );
}

function isNear(race: RaceWithSubRaces, lat: number, lng: number, radiusKm: number): boolean {
  return (
    race.location_lat != null &&
    race.location_lng != null &&
    haversineKm(lat, lng, race.location_lat, race.location_lng) <= radiusKm
  );
}

function formatDateGr(iso: string): string {
  return new Date(iso).toLocaleDateString('el-GR', { day: 'numeric', month: 'long' });
}

/** Splits into upcoming (asc) and past (desc, capped); undated races excluded. */
function splitByToday(races: RaceWithSubRaces[], today: string) {
  const dated = races
    .map((r) => ({ r, d: raceDate(r) }))
    .filter((x): x is { r: RaceWithSubRaces; d: string } => !!x.d);
  const upcoming = dated
    .filter((x) => x.d.slice(0, 10) >= today)
    .sort((a, b) => a.d.localeCompare(b.d))
    .map((x) => x.r);
  const past = dated
    .filter((x) => x.d.slice(0, 10) < today)
    .sort((a, b) => b.d.localeCompare(a.d))
    .slice(0, 40)
    .map((x) => x.r);
  return { upcoming, past };
}

function nextRacePhrase(upcoming: RaceWithSubRaces[]): string {
  const next = upcoming.find((r) => r.status !== 'cancelled');
  const d = next ? raceDate(next) : null;
  return next && d ? ` Επόμενος αγώνας: «${next.event_name}» στις ${formatDateGr(d)}.` : '';
}

// --- Hub construction -------------------------------------------------------

function makeHub(
  kind: HubKind,
  slug: string,
  name: string,
  races: RaceWithSubRaces[],
  today: string,
  copy: { h1: string; metaTitle: string; metaDescription: string; intro: string },
): ResolvedHub {
  const { upcoming, past } = splitByToday(races, today);
  return { slug, kind, name, upcoming, past, ...copy };
}

function buildAllHubs(all: RaceWithSubRaces[], today: string): ResolvedHub[] {
  const year = today.slice(0, 4);
  const hubs: ResolvedHub[] = [];

  // Months: current month and forward, ≥3 races.
  const byMonth = new Map<string, RaceWithSubRaces[]>();
  for (const r of all) {
    const d = raceDate(r);
    if (!d) continue;
    const ym = d.slice(0, 7);
    if (ym < today.slice(0, 7)) continue;
    byMonth.set(ym, [...(byMonth.get(ym) ?? []), r]);
  }
  for (const [ym, races] of [...byMonth.entries()].sort()) {
    if (races.length < 3) continue;
    const m = MONTHS[parseInt(ym.slice(5, 7), 10) - 1];
    const y = ym.slice(0, 4);
    const name = `${m.nom} ${y}`;
    // Skip months whose races have all already run (e.g. the current month
    // near its end) — a "0 upcoming" calendar page helps nobody.
    if (!races.some((r) => (raceDate(r) ?? '').slice(0, 10) >= today)) continue;
    hubs.push(
      makeHub('month', `${m.slug}-${y}`, name, races, today, {
        h1: `Αγώνες Δρόμου & Trail – ${m.nom} ${y}`,
        metaTitle: `Αγώνες Δρόμου ${m.nom} ${y} – Όλοι οι Αγώνες & Ημερομηνίες`,
        metaDescription: `Όλοι οι αγώνες τρεξίματος τον ${m.gen} ${y} στην Ελλάδα: ${races.length} αγώνες δρόμου και βουνού με ημερομηνίες, αποστάσεις και τοποθεσίες στον χάρτη.`,
        intro: `Οι αγώνες που τρέχουν τον ${m.gen} ${y} σε όλη την Ελλάδα — δρόμος, βουνό και trail, με μια ματιά στον χάρτη.`,
      }),
    );
  }

  // Cities: geo-radius, ≥5 upcoming.
  for (const c of CITIES) {
    const races = all.filter((r) => isNear(r, c.lat, c.lng, c.radiusKm));
    const hub = makeHub('city', c.slug, c.name, races, today, {
      h1: `Αγώνες Δρόμου & Trail ${c.inPhrase.startsWith('κοντά') ? c.inPhrase : c.inPhrase}`,
      metaTitle: `Αγώνες Δρόμου ${c.name} ${year} – Ημερολόγιο & Χάρτης`,
      metaDescription: `Όλοι οι αγώνες δρόμου και trail ${c.inPhrase} το ${year}: ημερομηνίες, αποστάσεις, τιμές και εγγραφές, σε ακτίνα ${c.radiusKm}χλμ στον διαδραστικό χάρτη του RaceMap.`,
      intro: '',
    });
    if (hub.upcoming.length < 5) continue;
    hub.intro = `Τρέξιμο ${c.inPhrase}: αγώνες δρόμου και trail σε απόσταση έως ${c.radiusKm}χλμ από την πόλη, με τις διαδρομές τους στον χάρτη.${nextRacePhrase(hub.upcoming)}`;
    hub.area = { lat: c.lat, lng: c.lng, radiusKm: c.radiusKm };
    hubs.push(hub);
  }

  // Mountains: name match (any type) OR radius match (trail only); ≥2 races, ≥1 upcoming.
  for (const m of MOUNTAINS) {
    const races = all.filter((r) => {
      const nameHit = m.nameMatches.some((t) => raceSearchText(r).includes(t));
      const geoHit = r.event_type?.toLowerCase() === 'trail' && isNear(r, m.lat, m.lng, m.radiusKm);
      return nameHit || geoHit;
    });
    const hub = makeHub('mountain', m.slug, m.name, races, today, {
      h1: `Αγώνες Βουνού ${m.inPhrase}`,
      metaTitle: `Αγώνες Βουνού ${m.name} ${year} – Trail & Ορεινό Τρέξιμο`,
      metaDescription: `Οι αγώνες ορεινού τρεξίματος ${m.inPhrase} για το ${year}: ημερομηνίες, αποστάσεις, υψομετρικά προφίλ και διαδρομές στον χάρτη του RaceMap.`,
      intro: '',
    });
    if (races.length < 2 || hub.upcoming.length < 1) continue;
    hub.intro = `Ορεινό τρέξιμο ${m.inPhrase}: οι αγώνες βουνού της περιοχής, με διαδρομές και υψομετρικά πάνω στον χάρτη.${nextRacePhrase(hub.upcoming)}`;
    hub.area = { lat: m.lat, lng: m.lng, radiusKm: m.radiusKm };
    hubs.push(hub);
  }

  // Distances: any sub-race in bucket, ≥3 upcoming.
  for (const d of DISTANCES) {
    const races = all.filter((r) =>
      r.sub_races.some((s) => typeof s.distance === 'number' && s.distance >= d.minM && s.distance < d.maxM),
    );
    const hub = makeHub('distance', d.slug, d.name, races, today, {
      h1: `${d.name} στην Ελλάδα ${year}`,
      metaTitle: `${d.name} στην Ελλάδα ${year} – Ημερολόγιο Αγώνων`,
      metaDescription: `Όλοι οι ${d.pluralNom} στην Ελλάδα για το ${year}: ημερομηνίες, τοποθεσίες, τιμές συμμετοχής και σύνδεσμοι εγγραφής στον χάρτη του RaceMap.`,
      intro: '',
    });
    if (hub.upcoming.length < 3) continue;
    hub.intro = `Όλοι οι ${d.pluralNom} της Ελλάδας σε ένα μέρος — με ημερομηνίες, τοποθεσίες και εγγραφές.${nextRacePhrase(hub.upcoming)}`;
    hubs.push(hub);
  }

  // Types: always.
  for (const t of TYPES) {
    const races = all.filter((r) => r.event_type?.toLowerCase() === t.eventType);
    const hub = makeHub('type', t.slug, t.name, races, today, {
      h1: `${t.name} στην Ελλάδα ${year}`,
      metaTitle: `${t.name} στην Ελλάδα ${year} – Καλεντάρι & Χάρτης`,
      metaDescription: `Όλοι οι αγώνες ${t.inPhrase} στην Ελλάδα για το ${year}: ${races.length} αγώνες με ημερομηνίες, αποστάσεις και εγγραφές στον διαδραστικό χάρτη του RaceMap.`,
      intro:
        t.eventType === 'road'
          ? 'Οι αγώνες δρόμου της Ελλάδας σε έναν χάρτη — από city runs μέχρι μαραθώνιους, με ημερομηνίες και εγγραφές.'
          : 'Trail και ορεινό τρέξιμο σε όλη την Ελλάδα: αγώνες βουνού με τις διαδρομές και τα υψομετρικά τους στον χάρτη.',
    });
    hubs.push(hub);
  }

  // Regions: canonical-label grouping (folds EN/GR raw values), ≥3 upcoming.
  for (const reg of REGIONS) {
    const races = all.filter((r) => getRegionLabel(r.location_region) === reg.label);
    const hub = makeHub('region', reg.slug, reg.label, races, today, {
      h1: `Αγώνες Δρόμου & Trail ${reg.inPhrase}`,
      metaTitle: `Αγώνες Δρόμου ${reg.label} ${year} – Καλεντάρι Αγώνων`,
      metaDescription: `Το πλήρες καλεντάρι αγώνων τρεξίματος ${reg.inPhrase} για το ${year}: αγώνες δρόμου και βουνού με ημερομηνίες, αποστάσεις και συνδέσμους εγγραφής.`,
      intro: '',
    });
    if (hub.upcoming.length < 3) continue;
    hub.intro = `Το ημερολόγιο αγώνων ${reg.inPhrase}: δρόμος και βουνό, με ημερομηνίες, αποστάσεις και εγγραφές πάνω στον χάρτη.${nextRacePhrase(hub.upcoming)}`;
    hubs.push(hub);
  }

  return hubs;
}

// Memoized per races-array identity + day, since fetchRacesCached returns a
// stable reference within its TTL and hubs are pure over (races, today).
const hubCache = new WeakMap<RaceWithSubRaces[], Map<string, ResolvedHub[]>>();

export function getActiveHubs(all: RaceWithSubRaces[], today: string = athensToday()): ResolvedHub[] {
  let byDay = hubCache.get(all);
  if (!byDay) {
    byDay = new Map();
    hubCache.set(all, byDay);
  }
  let hubs = byDay.get(today);
  if (!hubs) {
    hubs = buildAllHubs(all, today);
    byDay.set(today, hubs);
  }
  return hubs;
}

export function resolveHub(
  slug: string,
  all: RaceWithSubRaces[],
  today: string = athensToday(),
): ResolvedHub | null {
  return getActiveHubs(all, today).find((h) => h.slug === slug) ?? null;
}

// --- Race-page cross links ---------------------------------------------------

export interface HubLink {
  href: string;
  label: string;
}

/**
 * Hub links for a race detail page ("Αγώνες κοντά στην Αθήνα", "Μαραθώνιοι…").
 * Only links to hubs that are currently active (so no links into 404s), and
 * skips month hubs, which expire. Capped to keep the panel tidy.
 */
export function hubLinksForRace(
  race: RaceWithSubRaces,
  all: RaceWithSubRaces[],
  today: string = athensToday(),
): HubLink[] {
  const active = new Map(getActiveHubs(all, today).map((h) => [`${h.kind}:${h.slug}`, h]));
  const links: HubLink[] = [];

  const regionLabel = getRegionLabel(race.location_region);
  const region = REGIONS.find((r) => r.label === regionLabel);
  if (region && active.has(`region:${region.slug}`)) {
    links.push({ href: `/agones/${region.slug}`, label: `Όλοι οι αγώνες ${region.inPhrase}` });
  }

  if (race.location_lat != null && race.location_lng != null) {
    const city = CITIES.filter((c) => isNear(race, c.lat, c.lng, c.radiusKm) && active.has(`city:${c.slug}`))
      .sort(
        (a, b) =>
          haversineKm(a.lat, a.lng, race.location_lat!, race.location_lng!) -
          haversineKm(b.lat, b.lng, race.location_lat!, race.location_lng!),
      )[0];
    if (city) links.push({ href: `/agones/${city.slug}`, label: `Αγώνες ${city.inPhrase}` });
  }

  for (const m of MOUNTAINS) {
    if (links.length >= 4) break;
    const nameHit = m.nameMatches.some((t) => raceSearchText(race).includes(t));
    const geoHit = race.event_type?.toLowerCase() === 'trail' && isNear(race, m.lat, m.lng, m.radiusKm);
    if ((nameHit || geoHit) && active.has(`mountain:${m.slug}`)) {
      links.push({ href: `/agones/${m.slug}`, label: `Αγώνες βουνού ${m.inPhrase}` });
    }
  }

  for (const d of DISTANCES) {
    if (links.length >= 5) break;
    const hit = race.sub_races.some(
      (s) => typeof s.distance === 'number' && s.distance >= d.minM && s.distance < d.maxM,
    );
    if (hit && active.has(`distance:${d.slug}`)) {
      links.push({ href: `/agones/${d.slug}`, label: `${d.name} στην Ελλάδα` });
    }
  }

  return links.slice(0, 5);
}

/** Absolute-path helper shared by sitemap and pages. */
export function hubPath(hub: Pick<ResolvedHub, 'slug'>): string {
  return `/agones/${hub.slug}`;
}

export interface HubDirectoryGroup {
  heading: string;
  links: { href: string; slug: string; label: string; count: number }[];
}

/** Grouped hub links for the /agones directory panel in the sidebar. */
export function buildHubDirectory(hubs: ResolvedHub[]): HubDirectoryGroup[] {
  const kinds = (Object.keys(KIND_META) as HubKind[]).sort(
    (a, b) => KIND_META[a].order - KIND_META[b].order,
  );
  return kinds
    .map((kind) => ({
      heading: KIND_META[kind].heading,
      links: hubs
        .filter((h) => h.kind === kind)
        .map((h) => ({ href: hubPath(h), slug: h.slug, label: h.name, count: h.upcoming.length })),
    }))
    .filter((g) => g.links.length > 0);
}

/** The client-side shape a hub takes when activated in the map app. */
export interface ActiveHub {
  slug: string;
  name: string;
  h1: string;
  intro: string;
  raceIds: string[];
  area: { lat: number; lng: number; radiusKm: number } | null;
}

export function toActiveHub(hub: ResolvedHub, raceIds: string[]): ActiveHub {
  return {
    slug: hub.slug,
    name: hub.name,
    h1: hub.h1,
    intro: hub.intro,
    raceIds,
    area: hub.area ?? null,
  };
}

export { getRaceSlug };
