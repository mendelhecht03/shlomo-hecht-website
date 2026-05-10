const CALENDAR_ID = 'shlomohechtmusic@gmail.com';
const TIMEZONE = 'America/New_York';

export async function onRequestPost(context) {
  const { request, env } = context;

  const apiKey = env.GOOGLE_CALENDAR_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await request.json();
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
    const data = await googleRes.json();

    if (!googleRes.ok) {
      const reason = data?.error?.errors?.[0]?.reason;
      const message = reason === 'notFound'
        ? 'Calendar not found or not shared publicly.'
        : data?.error?.message ?? `Google API ${googleRes.status}`;
      return new Response(JSON.stringify({ error: message }), {
        status: googleRes.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const calendarData = data?.calendars?.[CALENDAR_ID];
    if (calendarData?.errors?.length) {
      const calErr = calendarData.errors[0];
      return new Response(JSON.stringify({ error: calErr.reason ?? 'Calendar access error' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const busy = calendarData?.busy ?? [];

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
}
