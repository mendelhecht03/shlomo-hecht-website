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

  try {
    const googleRes = await fetch(
      `https://www.googleapis.com/calendar/v3/freeBusy?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeMin,
          timeMax,
          timeZone: TIMEZONE,
          items: [{ id: CALENDAR_ID }],
        }),
      }
    );

    const data = await googleRes.json();

    if (!googleRes.ok) {
      return new Response(
        JSON.stringify({ error: data?.error?.message ?? `Google API ${googleRes.status}` }),
        { status: googleRes.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const calInfo = data.calendars?.[CALENDAR_ID];
    if (calInfo?.errors?.length) {
      const reason = calInfo.errors[0].reason;
      const message = reason === 'notFound'
        ? 'Calendar not found or not shared publicly.'
        : `Calendar error: ${reason}`;
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ busy: calInfo?.busy ?? [] }), {
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
