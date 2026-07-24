export const REGION_TRANSLATIONS: Record<string, string> = {
  'Attiki': 'Αττική',
  'Attica': 'Αττική',
  'Kentriki Makedonia': 'Κεντρική Μακεδονία',
  'Central Macedonia': 'Κεντρική Μακεδονία',
  'Thessalia': 'Θεσσαλία',
  'Thessaly': 'Θεσσαλία',
  'Dytiki Ellada': 'Δυτική Ελλάδα',
  'Western Greece': 'Δυτική Ελλάδα',
  'Peloponnisos': 'Πελοπόννησος',
  'Peloponnese': 'Πελοπόννησος',
  'Kriti': 'Κρήτη',
  'Crete': 'Κρήτη',
  'Anatoliki Makedonia kai Thraki': 'Ανατολική Μακεδονία & Θράκη',
  'Eastern Macedonia and Thrace': 'Ανατολική Μακεδονία & Θράκη',
  'Ipeiros': 'Ήπειρος',
  'Epirus': 'Ήπειρος',
  'Sterea Ellada': 'Στερεά Ελλάδα',
  'Central Greece': 'Στερεά Ελλάδα',
  'Notio Aigaio': 'Νότιο Αιγαίο',
  'South Aegean': 'Νότιο Αιγαίο',
  'Southern Aegean': 'Νότιο Αιγαίο',
  'Dytiki Makedonia': 'Δυτική Μακεδονία',
  'Western Macedonia': 'Δυτική Μακεδονία',
  'Ionia Nisia': 'Ιόνια Νησιά',
  'Ionian Islands': 'Ιόνια Νησιά',
  'Voreio Aigaio': 'Βόρειο Αιγαίο',
  'North Aegean': 'Βόρειο Αιγαίο',
  'Northern Aegean': 'Βόρειο Αιγαίο',
  'Mount Athos': 'Άγιο Όρος',
  'Agion Oros': 'Άγιο Όρος',
  'Cyprus': 'Κύπρος',
  'Kypros': 'Κύπρος',
};

/**
 * Returns the localized Greek name for a location region string.
 * Falls back to the raw string if no translation match is found.
 */
export function getRegionLabel(region: string | null | undefined): string {
  if (!region) return '';
  const trimmed = region.trim();
  return REGION_TRANSLATIONS[trimmed] || trimmed;
}
