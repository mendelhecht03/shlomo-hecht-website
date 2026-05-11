import type { APIRoute } from 'astro';

export const prerender = false;

const CALENDAR_ID = 'shlomohechtmusic@gmail.com';
const TIMEZONE = 'America/New_York';

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request, locals }) => {
  const apiKey = (locals as any)?.runtime?.env?.GOOGLE_CALENDAR_API_KEY as string | undefined;
  if (!apiKey) return json({ error: 'Server not configured' }, 500);

  let body: { timeMin?: string; timeMax?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const { timeMin, timeMax } = body ?? {};
  if (!timeMin || !timeMax) return json({ error: 'Missing timeMin or timeMax' }, 400);

  const url = new URL('https://www.googleapis.com/calendar/v3/freeBusy');
  url.searchParams.set('key', apiKey);

  try {
    const googleRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone: TIMEZONE,
        items: [{ id: CALENDAR_ID }],
      }),
    });
    const data: any = await googleRes.json();

    if (!googleRes.ok) {
      const reason = data?.error?.errors?.[0]?.reason;
      const message = reason === 'notFound'
        ? 'Calendar not found or not shared publicly.'
        : data?.error?.message ?? `Google API ${googleRes.status}`;
      return json({ error: message }, googleRes.status);
    }

    const calendarData = data?.calendars?.[CALENDAR_ID];
    if (calendarData?.errors?.length) {
      const calErr = calendarData.errors[0];
      return json({ error: calErr.reason ?? 'Calendar access error' }, 403);
    }

    return json({ busy: calendarData?.busy ?? [] }, 200);
  } catch {
    return json({ error: 'Upstream request failed' }, 502);
  }
};
