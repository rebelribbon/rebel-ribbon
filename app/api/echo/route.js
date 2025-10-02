export async function GET() {
  return new Response(JSON.stringify({ ok: true, method: 'GET' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  return new Response(JSON.stringify({ ok: true, method: 'POST', body }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
