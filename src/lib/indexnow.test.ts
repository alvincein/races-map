import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildIndexNowPayload, submitToIndexNow, INDEXNOW_KEY } from './indexnow';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('IndexNow key', () => {
  it('is served verbatim from public/<key>.txt', () => {
    const file = readFileSync(join(process.cwd(), 'public', `${INDEXNOW_KEY}.txt`), 'utf8');
    expect(file).toBe(INDEXNOW_KEY);
  });
});

describe('buildIndexNowPayload', () => {
  it("dedupes and keeps only this site's URLs", () => {
    expect(
      buildIndexNowPayload([
        'https://racemap.gr/race/a',
        'https://racemap.gr/race/a',
        'https://example.com/race/b',
        'not a url',
      ]),
    ).toEqual({
      host: 'racemap.gr',
      key: INDEXNOW_KEY,
      keyLocation: `https://racemap.gr/${INDEXNOW_KEY}.txt`,
      urlList: ['https://racemap.gr/race/a'],
    });
  });
});

describe('submitToIndexNow', () => {
  it('reports what IndexNow answered', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 202 })));
    await expect(
      submitToIndexNow(['https://racemap.gr/', 'https://racemap.gr/race/a']),
    ).resolves.toEqual({ submitted: 2, status: 202 });
  });

  it('never throws when the endpoint is unreachable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(submitToIndexNow(['https://racemap.gr/'])).resolves.toEqual({
      submitted: 0,
      status: null,
    });
  });

  it('sends nothing when no URL belongs to the site', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await submitToIndexNow(['https://example.com/']);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
