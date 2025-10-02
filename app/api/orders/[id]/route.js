export async function GET(_req, { params }) {
  return new Response(
    JSON.stringify({ ok: true, where: '/api/orders/[id]', id: params?.id ?? null }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
