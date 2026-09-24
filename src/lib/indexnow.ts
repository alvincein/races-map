import { SITE_URL } from './site';

// Public by design: IndexNow verifies ownership by fetching this key from
// public/<key>.txt, so the key and that file must always match.
export const INDEXNOW_KEY = '6e0f4c395de22dcdc82314162fc937aa';

// Shared endpoint: one submission reaches every IndexNow engine (Bing, Yandex,
// Seznam, Naver, Yep). Google does not take part.
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

export interface IndexNowResult {
  submitted: number;
  /** HTTP status from IndexNow (200/202 = accepted); null if not sent or failed. */
  status: number | null;
}

export function buildIndexNowPayload(urls: string[]) {
  const host = new URL(SITE_URL).host;
  const urlList = Array.from(new Set(urls)).filter((u) => {
    try {
      return new URL(u).host === host;
    } catch {
      return false;
    }
  });
  return { host, key: INDEXNOW_KEY, keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`, urlList };
}

/**
 * Tells the IndexNow engines these URLs were added or changed. Never throws —
 * a failed ping must not fail the revalidation it rides along with.
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult> {
  const payload = buildIndexNowPayload(urls);
  if (payload.urlList.length === 0) return { submitted: 0, status: null };
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      // The scraper's request times out at 30s; this call must not eat into it.
      signal: AbortSignal.timeout(5000),
    });
    return { submitted: payload.urlList.length, status: res.status };
  } catch (err) {
    console.error('IndexNow submission failed:', err);
    return { submitted: 0, status: null };
  }
}
