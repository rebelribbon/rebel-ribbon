# Pages API Routes

This directory contains the production API endpoints for the Rebel Ribbon application using Next.js Pages Router.

## Current Endpoints

### Health & Diagnostics
- `GET /api/health` — Simple health check, returns "ok"
- `GET /api/ping-db` — Database connectivity check (calls `rr_get_now()` RPC)

### Orders & Payments
- `POST /api/orders/mark-paid` — Mark an order as paid with evidence tracking

## Architecture

These endpoints are the **primary API layer** for the application. All server-side business logic should live here, not in the frontend components.

## Authentication

All endpoints perform server-side authentication using the Supabase service role key. The server client is initialized in `lib/supabase/server.js`.

## Best Practices

1. **Always use `supabaseServer()`** for database operations — never the browser client
2. **Validate all inputs** before database calls
3. **Return structured errors** with appropriate HTTP status codes
4. **Log sensitive operations** to the `payment_logs` or similar audit tables
5. **Test endpoints locally** before pushing to production

## Future

The `/app/api/` directory exists as scaffolding for a potential migration to the App Router. For now, all new endpoints should be created here in `pages/api/`.
