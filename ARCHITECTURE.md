# Arquitectura reusable de TAAK Studio CRM

Este documento captura los patrones de arquitectura y UX que ya resolvimos en TAAK Studio CRM para reutilizarlos en otra aplicación. La siguiente app tendrá otro dominio —credit arbitrage, credit float, stoozing—, por lo que se deben conservar los patrones técnicos y de interacción, pero reemplazar las entidades, textos y reglas de negocio según su propio `specs.md`.

## 1. Stack base

- Next.js con App Router.
- React con componentes cliente donde existe interacción.
- TypeScript.
- Turso/libSQL como base de datos SQLite remota.
- Drizzle ORM para schema y queries.
- API Routes de Next.js para operaciones CRUD.
- CSS propio con variables de diseño y hojas específicas para responsive.
- `lucide-react` para iconos.
- PWA básica con manifest, iconos y service worker.
- Web Push opcional con `web-push` y claves VAPID.

Principio general: mantener una aplicación pequeña y directa, con una sola superficie autenticada, un API sencillo y componentes de UI orientados a operación diaria.

## 2. Estructura de archivos

```text
app/
  page.tsx                 Entrada protegida / redirección
  layout.tsx               HTML raíz, metadata, favicon, manifest y CSS global
  login/page.tsx           Login visual centrado
  dashboard.tsx            Shell principal y vistas operativas
  globals.css              Variables y estilos base
  overrides.css            Ajustes visuales específicos
  mobile.css               Ajustes de pantallas pequeñas
  operations.css           Kanban, Gantt, calendario y menú móvil
  api/
    auth/login/route.ts    Login y cookie de sesión
    data/route.ts          GET, POST, PATCH y DELETE autenticados
    push/subscribe/route.ts
    push/reminders/route.ts

db/
  schema.ts                Tablas Drizzle
  migrations/              Migraciones generadas

lib/
  db.ts                    Cliente Turso + Drizzle
  auth.ts                  Firma y validación de sesión

public/
  manifest.json            Instalación PWA
  sw.js                    Recepción de push notifications
  icon-192.png
  icon-512.png
```

## 3. Autenticación de una sola cuenta

El producto es single-user. No hay registro, correo, roles ni recuperación de contraseña.

Flujo:

1. La pantalla `/login` recibe una contraseña.
2. El formulario llama `POST /api/auth/login`.
3. El servidor compara la contraseña configurada en environment.
4. Si es correcta, crea una cookie HTTP-only persistente.
5. Las rutas de datos llaman `isAuthed()` antes de leer o escribir.
6. La cookie dura 30 días y se renueva mediante un nuevo login.

La sesión no debe almacenarse en `localStorage`. La cookie firmada debe tener:

- `httpOnly: true`
- `sameSite: "lax"`
- `secure: true` en producción
- `path: "/"`
- `maxAge` persistente

Variables recomendadas:

```env
ADMIN_PASSWORD=...
SESSION_SECRET=una-cadena-larga-y-aleatoria
```

El secreto debe ser estable entre deploys. Si cambia, todas las sesiones existentes dejan de ser válidas.

## 4. Turso y Drizzle

`lib/db.ts` crea un cliente libSQL usando:

```env
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

`db/schema.ts` es la fuente de verdad del modelo. Cada nueva entidad debe:

1. Añadirse al schema Drizzle.
2. Crear o generar su migración.
3. Aplicarse en Turso antes de usarla en producción.
4. Añadirse al GET global si la aplicación utiliza un payload inicial único.

Para una app operativa pequeña, el patrón usado es un único `GET /api/data` que devuelve todas las colecciones necesarias para el dashboard. Es práctico y reduce round-trips, pero si el nuevo dominio crece mucho conviene separar endpoints por módulo o paginar historiales.

## 5. Modelo de API CRUD

El endpoint `/api/data` usa un discriminador `type`:

```json
{
  "type": "entity",
  "id": 123,
  "changes": {}
}
```

Convenciones:

- `GET`: carga todas las colecciones del dashboard.
- `POST`: crea una entidad.
- `PATCH`: actualiza una entidad existente usando `{ type, id, changes }`.
- `DELETE`: elimina solo entidades explícitamente permitidas.
- Todas las operaciones verifican la sesión.
- Errores: `401` si no está autenticado, `400` si faltan datos.
- Después de guardar, el cliente cierra el modal, vuelve a cargar datos y muestra un toast.

Este patrón evita que cada modal tenga lógica de persistencia distinta. Para la app nueva, conviene conservarlo si el volumen de datos es pequeño.

## 6. Patrón de formularios y modales

Todos los formularios interactivos siguen este ciclo:

```text
abrir modal
  -> cargar defaults o entidad existente
  -> editar campos
  -> Guardar cambios
  -> estado Guardando…
  -> POST/PATCH
  -> cerrar modal
  -> recargar datos
  -> mostrar feedback
```

Reglas de UX ya resueltas:

- Los registros existentes son editables.
- El botón no parece estático mientras guarda.
- El modal se cierra al guardar correctamente.
- Hay mensaje de éxito o error.
- Los borrados requieren confirmación.
- Pagos, notas y eventos tienen controles de borrar separados.
- Los selects se usan para estados finitos; no se usa free input cuando una lista cerrada es suficiente.
- Los campos de fecha deben representar una sola verdad semántica. Por ejemplo, `paidAt` es la fecha real del pago y alimenta el reporte mensual; no debe confundirse con una fecha límite.

## 7. Kanban drag & drop

El Kanban se construye con:

- Un array ordenado de etapas.
- Un `Lane` por etapa.
- Tarjetas con `draggable`.
- `onDragStart` que guarda el ID del registro en `dataTransfer`.
- `onDragOver` con `preventDefault()`.
- `onDrop` que obtiene el ID, valida que exista y llama `PATCH` para cambiar la etapa.
- Recarga de datos y toast después del movimiento.

Patrón conceptual:

```tsx
onDragStart={event =>
  event.dataTransfer.setData("entity", String(entity.id))
}

onDrop={event => {
  event.preventDefault()
  const id = Number(event.dataTransfer.getData("entity"))
  moveEntity(id, targetStage)
}}
```

Detalles importantes de layout:

- Todas las columnas deben permanecer en una sola fila con `grid-auto-flow: column`.
- El número de columnas debe corresponder al número real de etapas.
- El contenedor general debe tener scroll horizontal.
- Cada columna debe tener altura limitada y `overflow-y: auto` para que el Kanban no crezca indefinidamente.
- El encabezado de cada columna puede ser `position: sticky` para mantener visible el nombre de la etapa.
- En móvil, la columna sigue siendo ancha y se desplaza horizontalmente; no hay que comprimir siete columnas en una pantalla.

## 8. Timeline tipo Gantt

El Gantt usa:

- Fecha mínima entre inicio y entrega como inicio global.
- Fecha máxima como fin global.
- Porcentaje de posición horizontal:

```text
left = (fechaInicio - inicioGlobal) / duraciónGlobal * 100
width = (fechaFin - fechaInicio) / duraciónGlobal * 100
```

- Línea vertical de “Hoy”.
- Barra diferente para entidades terminadas.
- Etiqueta con inicio y final planeado.
- Scroll horizontal interno.

Para evitar que un proyecto de meses aplaste visualmente las barras cortas:

- El timeline se renderiza dentro de un wrapper con `overflow-x: auto`.
- La pista tiene un ancho temporal mínimo por mes.
- El panel interno puede ser más ancho que la pantalla sin ensanchar el layout principal.
- El usuario dispone de controles `−`, `+`, porcentaje y `Ajustar`.
- Es crucial que el elemento padre flex tenga `min-width: 0`; de lo contrario el zoom expande toda la página en vez de generar scroll interno.

## 9. Calendario operativo

El calendario de TAAK es una entidad independiente, no una modificación de proyectos.

Modelo reusable:

```text
calendar_events
  id
  title
  event_date
  start_time
  end_time
  client_id nullable
  project_id nullable
  notes nullable
  reminder_minutes
  created_at
```

La vista tiene:

- Navegación de mes anterior/siguiente.
- Botón “Hoy”.
- Grid mensual de 42 celdas.
- Eventos visibles dentro de su día.
- Lista de próximos eventos para operación rápida.
- Edición desde el evento.
- Eliminación con confirmación.
- Modal para título, fecha, horas, cliente, proyecto, recordatorio y notas.

Para el proyecto de credit arbitrage, esta misma entidad puede representar:

- Pago programado.
- Fecha de corte.
- Fecha de pago de tarjeta.
- Activación de promoción.
- Recordatorio de transferencia.
- Revisión de utilización.
- Renovación o vencimiento de una línea.

## 10. Notificaciones

La arquitectura preparada usa dos capas:

### Permiso y suscripción

El botón de alertas:

1. Solicita permiso de notificaciones.
2. Registra el service worker.
3. Usa `PushManager.subscribe()` con la clave pública VAPID.
4. Guarda la suscripción en `push_subscriptions` mediante `/api/push/subscribe`.

Variables:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:...
CRON_SECRET=...
```

### Envío

`/api/push/reminders` consulta eventos y fechas próximas, y envía una notificación con `web-push`. El service worker recibe el payload y ejecuta `showNotification()`.

Para una implementación tipo Google Calendar más precisa, el siguiente proyecto debe:

- Comparar `event_date + start_time - reminder_minutes` contra la hora actual.
- Ejecutar el endpoint con un scheduler periódico.
- Evitar duplicados guardando `last_notified_at` o una tabla de entregas.
- Limpiar suscripciones expiradas cuando Web Push devuelva `404` o `410`.

## 11. Fecha y hora del sistema

La UI usa la fecha/hora actual para:

- Saludo contextual: Buenos días, tardes o noches.
- Texto de “Hoy”.
- Estados vencido, vence hoy y próximo.
- Fecha default de nuevos eventos.
- Fecha default al marcar un pago como recibido.

Las fechas de negocio se almacenan como strings ISO `YYYY-MM-DD` para evitar conversiones accidentales de zona horaria. Al crear un `Date` para mostrar una fecha de negocio, usar una hora fija como `T12:00:00`, no medianoche UTC.

Para eventos con hora real, definir explícitamente la zona horaria del producto en el nuevo specs. Si el producto es solo para Vale, `America/Mexico_City` es una buena base.

## 12. Responsive y menú móvil

La solución móvil no reduce el sidebar a una barra permanente estrecha. En su lugar:

- El sidebar está oculto fuera de pantalla.
- Un botón hamburguesa vive en el topbar.
- Al abrirlo, el sidebar entra como drawer.
- Aparece un backdrop para cerrarlo tocando fuera.
- Al seleccionar una sección, el drawer se cierra.
- El contenido principal ocupa el 100% del ancho.

CSS esencial:

```css
.main { min-width: 0; }

@media (max-width: 680px) {
  .sidebar {
    position: fixed;
    transform: translateX(-105%);
  }

  .shell.mobile-nav-open .sidebar {
    transform: translateX(0);
  }
}
```

Otros principios móviles:

- Stats en dos columnas.
- Modales de ancho completo.
- Tablas o calendarios anchos dentro de scroll horizontal interno.
- Kanban horizontal, nunca comprimido hasta volverse ilegible.
- Listas con texto truncado cuando el espacio es limitado.
- Botones de acción con targets cómodos para dedo.

## 13. Visualizaciones y dashboard

El dashboard debe priorizar decisiones operativas, no llenar la pantalla con métricas decorativas.

Buenas tarjetas resumen:

- Entidades por iniciar.
- Entidades en curso.
- Próximos vencimientos o entregas.
- Bloqueos o elementos que necesitan atención.

Evitar:

- Un KPI que solo muestra un registro cuando existen varios relevantes.
- Prospectos mezclados con deuda.
- Saldo pendiente sin contexto de etapa.
- Repetir el mismo Kanban completo en el resumen si ya existe una vista Kanban.

Las visualizaciones deben responder “¿qué debo hacer hoy?” o “¿qué riesgo viene?” antes que “¿cuántos registros existen?”.

## 14. Separación de dominio para la app de credit arbitrage

Conservar:

- Shell autenticado.
- Layout y navegación.
- API CRUD unificado.
- Modales con feedback.
- Kanban drag & drop.
- Calendario.
- Gantt.
- Responsive y menú hamburguesa.
- Service worker y push.
- Patrones de fecha/hora.

Reemplazar:

- `clients` por las entidades que defina el nuevo producto.
- `projects` por estrategias, cuentas, ciclos o posiciones.
- `payments` por transacciones, pagos de tarjetas, intereses o movimientos.
- `notes` por bitácora, hipótesis o decisiones.
- Etapas CRM por el flujo del arbitrage.
- Reglas de “deudor” por reglas de obligación financiera real.
- Dashboard financiero por métricas como float disponible, utilización, APR efectivo, fechas de corte, fechas límite, liquidez y rendimiento.

Regla de diseño: una cotización, oportunidad o escenario proyectado no debe contarse como obligación real hasta que el dominio lo confirme explícitamente. El patrón aplicado aquí fue separar potenciales de compromisos.

## 15. Prompt recomendado para Codex

Usar este archivo junto con el specs del nuevo producto:

```text
Lee ARCHITECTURE.md como la arquitectura base ya probada y specs.md como la fuente de verdad del dominio.

Reutiliza los patrones de autenticación single-user, cookie persistente, Turso + Drizzle, API CRUD, modales con feedback, Kanban drag & drop, Gantt con scroll y zoom, calendario, notificaciones, PWA, fecha/hora contextual y menú hamburguesa móvil.

No copies nombres, etapas, entidades, colores ni reglas de negocio de TAAK CRM salvo que specs.md lo pida. El nuevo dominio es la autoridad para todas las entidades y cálculos.

Implementa primero el modelo de datos y las reglas de negocio; después conecta las vistas. Ninguna métrica de prospectos, escenarios o proyecciones debe presentarse como obligación real sin una regla explícita en specs.md.

Después de cada mutación: mostrar estado de guardado, cerrar el modal al éxito, recargar datos y mostrar feedback. En móvil, usar menú hamburguesa y scroll interno para Kanban, timeline y calendarios anchos.
```

## 16. Checklist de implementación para el siguiente proyecto

- [ ] Definir entidades y reglas en `specs.md`.
- [ ] Crear schema Drizzle y migración Turso.
- [ ] Configurar `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_PASSWORD` y `SESSION_SECRET`.
- [ ] Reutilizar `lib/auth.ts` con nombre de cookie propio del producto.
- [ ] Proteger GET, POST, PATCH y DELETE.
- [ ] Implementar defaults y selects antes de crear formularios libres.
- [ ] Definir qué significa “real”, “proyectado”, “potencial” y “vencido”.
- [ ] Implementar dashboard con KPIs accionables.
- [ ] Implementar Kanban con columnas en una sola fila y scroll interno.
- [ ] Implementar Gantt con ancho temporal, scroll y zoom interno.
- [ ] Implementar calendario y relación opcional con entidades.
- [ ] Configurar PWA y service worker.
- [ ] Configurar VAPID y scheduler si se requieren push notifications.
- [ ] Convertir sidebar móvil en drawer hamburguesa.
- [ ] Hacer editables todos los datos que el usuario pueda corregir.
- [ ] Confirmar borrados y dar feedback en cada mutación.
- [ ] Revisar visualmente desktop y móvil antes de publicar.
