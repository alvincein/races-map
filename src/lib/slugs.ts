import { Race } from '../types/database';

const GREEK_TO_ENGLISH: Record<string, string> = {
  'α': 'a', 'β': 'v', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'i', 'θ': 'th',
  'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x', 'ο': 'o', 'π': 'p',
  'ρ': 'r', 'σ': 's', 'ς': 's', 'τ': 't', 'υ': 'y', 'φ': 'f', 'χ': 'ch', 'ψ': 'ps',
  'ω': 'o',
  'ά': 'a', 'έ': 'e', 'ή': 'i', 'ί': 'i', 'ό': 'o', 'ύ': 'y', 'ώ': 'o', 'ϊ': 'i',
  'ϋ': 'y', 'ΐ': 'i', 'ΰ': 'y',
  'Α': 'a', 'Β': 'v', 'Γ': 'g', 'Δ': 'd', 'Ε': 'e', 'Ζ': 'z', 'Η': 'i', 'Θ': 'th',
  'Ι': 'i', 'Κ': 'k', 'Λ': 'l', 'Μ': 'm', 'Ν': 'n', 'Ξ': 'x', 'Ο': 'o', 'Π': 'p',
  'Ρ': 'r', 'Σ': 's', 'Τ': 't', 'Υ': 'y', 'Φ': 'f', 'Χ': 'ch', 'Ψ': 'ps', 'Ω': 'o',
  'Ό': 'o', 'Ή': 'i', 'Έ': 'e', 'Ά': 'a', 'Ί': 'i', 'Ύ': 'y', 'Ώ': 'o', 'Ϊ': 'i',
  'Ϋ': 'y'
};

export function transliterateGreek(text: string): string {
  // Replace Greek diphthongs first (case-insensitive for Greek characters)
  const cleaned = text
    .replace(/[οo][υy]/gi, 'ou')
    .replace(/[οo][ύy]/gi, 'ou')
    .replace(/[όo][υy]/gi, 'ou');
  return cleaned.split('').map(char => GREEK_TO_ENGLISH[char] || char).join('');
}

export function slugify(text: string): string {
  const transliterated = transliterateGreek(text);
  return transliterated
    .toLowerCase()
    .normalize('NFD') // Normalize to separate accents
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Trim trailing/leading hyphens
}

export function getRaceSlug(race: Pick<Race, 'id' | 'event_name' | 'event_name_en' | 'dates'>): string {
  const name = race.event_name_en || race.event_name || 'race';
  const baseSlug = slugify(name);
  
  // Extract year if available
  let year = '';
  if (race.dates && race.dates.length > 0) {
    try {
      const date = new Date(race.dates[0]);
      if (!isNaN(date.getTime())) {
        year = date.getFullYear().toString();
      }
    } catch (e) {
      // Ignore invalid dates
    }
  }

  const shortId = race.id.substring(0, 8);
  
  if (year) {
    return `${baseSlug}-${year}-${shortId}`;
  }
  return `${baseSlug}-${shortId}`;
}
