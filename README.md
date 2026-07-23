# TAAK CRM

CRM privado para TAAK con Next.js, Turso y Drizzle.

## Turso

```bash
turso auth login
turso db create taak-crm
turso db show taak-crm
turso db tokens create taak-crm
cp .env.example .env
npm run db:push
npm run dev
```

En `.env`, usa la URL que devuelve `turso db show taak-crm`, el token generado, una contraseña de administrador y una clave larga para `SESSION_SECRET`.
