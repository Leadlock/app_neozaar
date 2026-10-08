// USD -> INR rate for the CoSell360 ROI calculator.
// Fetched server-side (so visitors' browsers never call the FX feed) and cached for 6 hours.
// Lives under /go/ because production proxies /api/* to the Express backend.
const FX_URL = 'https://open.er-api.com/v6/latest/USD';

export const revalidate = 21600;

export async function GET() {
  try {
    const res = await fetch(FX_URL, { next: { revalidate: 21600 } });
    if (!res.ok) throw new Error(`FX feed ${res.status}`);
    const data = await res.json();
    const rate = Number(data?.rates?.INR);
    if (!Number.isFinite(rate) || rate < 50 || rate > 200) throw new Error('Unexpected INR rate');

    return Response.json(
      { rate, updated: data.time_last_update_utc || null },
      { headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' } },
    );
  } catch (error) {
    return Response.json({ error: 'unavailable' }, { status: 502 });
  }
}
