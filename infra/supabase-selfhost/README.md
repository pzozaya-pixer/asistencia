# Supabase Self-Hosted

## Dokploy target

Create a separate compose service named `supabase` in Dokploy and point it to the official repository:

- repository: `https://github.com/supabase/supabase.git`
- branch: `master`
- compose path: `docker/docker-compose.yml`

## Environment

Use the values from [.env.dokploy.example](/Users/pzozaya/Documents/asistencia/infra/supabase-selfhost/.env.dokploy.example) as the minimum starting point.

## App integration

Once Supabase is running behind your public domain, `asistencia` should use:

```env
NEXT_PUBLIC_SUPABASE_URL=https://supabase.agenciapixer.es
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from self-hosted Supabase>
```

## Notes

- Keep Supabase separated from `asistencia` in Dokploy.
- Do not invent `ANON_KEY` and `SERVICE_ROLE_KEY` unless you are aligning them with the official Supabase self-hosted auth setup.
- Prefer HTTPS and a dedicated subdomain such as `supabase.agenciapixer.es`.

