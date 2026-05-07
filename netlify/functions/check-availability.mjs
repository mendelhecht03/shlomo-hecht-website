const CALENDAR_ID = 'shlomohechtmusic@gmail.com';
const TIMEZONE = 'America/New_York';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { timeMin, timeMax } = body ?? {};
  if (!timeMin || !timeMax) {
    return new Response(JSON.stringify({ error: 'Missing timeMin or timeMax' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`
  );
  url.searchParams.set('key', apiKey);
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('timeZone', TIMEZONE);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '50');

  try {
    const googleRes = await fetch(url);
    const data = await googleRes.json();

    if (!googleRes.ok) {
      const reason = data?.error?.errors?.[0]?.reason;
      const message = reason === 'notFound'
        ? 'Calendar not found or not shared publicly with event details.'
        : data?.error?.message ?? `Google API ${googleRes.status}`;
      return new Response(JSON.stringify({ error: message }), {
        status: googleRes.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const events = (data.items ?? []).filter((e) => e.status !== 'cancelled');
    const busy = events.map((e) => ({
      start: e.start?.dateTime ?? e.start?.date,
      end: e.end?.dateTime ?? e.end?.date,
    }));

    return new Response(JSON.stringify({ busy }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Upstream request failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
