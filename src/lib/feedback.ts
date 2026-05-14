import { supabase } from './supabase';

const COOLDOWN_MS = 60_000; // 60 seconds between submissions
const COOLDOWN_KEY = 'feedback_last_submit';

/** Check if the user is still within the cooldown window. */
export function isOnCooldown(): boolean {
  try {
    const last = localStorage.getItem(COOLDOWN_KEY);
    if (!last) return false;
    return Date.now() - Number(last) < COOLDOWN_MS;
  } catch {
    return false;
  }
}

/** Returns remaining cooldown seconds, or 0 if ready. */
export function cooldownRemaining(): number {
  try {
    const last = localStorage.getItem(COOLDOWN_KEY);
    if (!last) return 0;
    const remaining = COOLDOWN_MS - (Date.now() - Number(last));
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  } catch {
    return 0;
  }
}

export async function submitFeedback(payload: {
  type: 'bug' | 'feature' | 'race_data';
  message: string;
  email?: string;
  raceId?: string;
  raceName?: string;
}): Promise<{ success: boolean; error?: string }> {
  // Enforce cooldown
  if (isOnCooldown()) {
    const secs = cooldownRemaining();
    return {
      success: false,
      error: `Παρακαλώ περιμένετε ${secs} δευτερόλεπτα πριν στείλετε νέα αναφορά.`,
    };
  }

  const row = {
    type: payload.type,
    message: payload.message.trim(),
    email: payload.email?.trim() || null,
    race_id: payload.raceId || null,
    race_name: payload.raceName || null,
    page_url: typeof window !== 'undefined' ? window.location.href : null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('user_feedback') as any).insert(row);

  if (error) {
    console.error('[feedback] insert error:', error);
    return { success: false, error: 'Κάτι πήγε στραβά. Δοκιμάστε ξανά αργότερα.' };
  }

  // Mark cooldown
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  } catch { /* ignore storage errors */ }

  return { success: true };
}
