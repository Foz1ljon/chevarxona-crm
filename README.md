# Chevarxona CRM

A CRM for a custom tailoring and apparel workshop — clients and their measurement
history, fabric and accessory stock, and the cutting-room queue from first draft
to pickup.

Built with **Nuxt 4**, **Nuxt UI v3**, **Tailwind CSS v4**, **Pinia**, **Mongoose**
and **zod**.

---

## Quick start

```bash
pnpm install
cp .env.example .env        # then edit MONGODB_URI and NUXT_SESSION_PASSWORD
pnpm dev
```

On first boot against an empty database the app seeds itself with a full demo
workshop: four roles, a super admin, **18 fabrics**, **19 accessories**, **10
garment types** with working BOM templates, plus five staff accounts, twelve
clients with measurement history and sixteen orders spread across every Kanban
lane (stock is moved through the real reservation engine, so the ledger, the
balances and the dashboard all reconcile). The credentials are printed to the
console.

```
admin@chevarxona.uz / admin123     # super admin
nodira@chevarxona.uz / demo1234    # manager (every demo staff account)
```

Change that password immediately under **Settings → Staff**, or set
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` before the first run.

### Rebuilding the demo data

The fastest way to get a clean, fully populated workshop is the reset script.
With `pnpm dev` running in another terminal:

```bash
pnpm seed:reset      # wipe business data + rebuild the demo workshop
pnpm seed:reset --seed-only   # only fill collections that are still empty
```

It signs in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, calls a
development-only endpoint (`POST /api/dev/seed`, which does not exist in a
production bundle) and prints the resulting row counts.

The seed itself is additive: it only fills collections that are still empty. The
reset clears orders, clients, stock movements, materials, garment types, counters
and non-admin staff. **Roles and the super admin are always preserved**, so you
can never lock yourself out. The same wipe can be triggered on a single boot with
`SEED_RESET=true pnpm dev` — remove the variable afterwards.

### Environment

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Connection string. A replica set enables real transactions; a standalone server works too (see below). |
| `NUXT_SESSION_PASSWORD` | Secret sealing the session cookie. **Must be ≥ 32 characters.** |
| `SEED_ON_BOOT` | `false` disables the bootstrap seed entirely. |
| `SEED_RESET` | `true` wipes business data and rebuilds the demo workshop on that boot. Roles and the super admin are kept. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Credentials for the first super admin. |
| `NUXT_PUBLIC_CURRENCY` | Currency suffix shown in the UI (default `UZS`). |

### Scripts

```bash
pnpm dev          # dev server
pnpm seed:reset   # rebuild the demo workshop (dev server must be running)
pnpm build        # production build
pnpm preview      # run the built server
npx nuxt typecheck
```

---

## How the domain works

### Order life-cycle

```
DRAFT → PENDING_DEPOSIT → MATERIAL_ALLOCATED → IN_CUTTING
      → IN_TAILORING → FITTING_STAGE → READY_FOR_PICKUP → COMPLETED
                                                        ↘ CANCELLED
```

Transitions are not free-form. `shared/utils/orderStatus.ts` declares which moves
are legal, and the server rejects anything else with a `409` — the Kanban board
reads the same table, so a card simply will not drop into a lane it cannot reach.

### Stock: reserve, then consume

Material moves through three phases, tied to the order status:

| Phase | From status | What happens to stock |
| --- | --- | --- |
| `none` | `DRAFT`, `PENDING_DEPOSIT` | Nothing is committed. |
| `reserved` | `MATERIAL_ALLOCATED` | `reservedQty` rises; `available = stock − reserved` falls. |
| `consumed` | `IN_CUTTING` onwards | The reservation clears and `stockQty` is permanently deducted. |

Rolling a status backwards reverses exactly what the forward move took, and
cancelling an order releases everything. Every change appends a row to
`stock_movements`, an append-only ledger that always reconciles with the balances.

Quantity never changes anywhere else: `PATCH` on a fabric or accessory cannot
touch `stockQty`. Receiving goods and correcting a stock count both go through
`POST /api/inventory/adjust`, and an intake recomputes the weighted-average cost.

Two safeguards worth knowing about:

- Reservation is refused up-front when a material is short, with the exact
  shortfall returned in `data.shortages` so the order form can show it.
- Each quantity change is a conditional `findOneAndUpdate` with a `$gte` guard,
  so two concurrent orders cannot drive stock negative — even on a deployment
  without transactions.

**Transactions.** Multi-document transactions need a replica set or `mongos`.
`withTransaction` probes the deployment once and falls back to sequential writes
on a standalone `mongod`, so a single-node workshop install still works; the
compare-and-swap guards above are what keep stock correct in that mode.

### Bill of materials

Each garment type carries a BOM template — quantity per garment plus a wastage
percentage. Creating an order expands the template (`3.4 m × 2 garments × 1.08
wastage = 7.344 m`), merges duplicate materials across garments so one fabric is
reserved once rather than per row, and prices the result.

`POST /api/orders/bom-preview` runs the whole calculation without touching stock,
which is what the order form's live BOM panel calls as you type.

Tailors log what they actually used per garment; the difference between planned
and consumed settles when the order closes.

### Measurements

Measurement profiles are versioned, never overwritten. Re-saving a profile under
the same name supersedes the previous revision and keeps it on file, so an order
cut six months ago still shows the numbers it was cut to.

Which fields appear is driven by the garment type — `measurementFields` on each
category feeds the dynamic measurement card, so selecting *Trousers* shows
inseam and thigh while *Dress Shirt* shows neck and cuff.

### Roles and permissions

Four roles ship by default:

| Role | Scope |
| --- | --- |
| `SUPER_ADMIN` | Everything, including staff, roles, finance and the audit log. |
| `MANAGER` | Orders, clients, materials, tailor assignment, operational analytics. |
| `TAILOR` (Chevar) | Only garments assigned to them: progress and material usage. |
| `INVENTORY_CLERK` (Omborchi) | Fabrics, accessories, intake and dispatch. |

Access is permission-based, not role-based — roles are just named bundles of
permissions like `orders:status_change`, editable from **Settings → Roles**, plus
optional per-person overrides. Effective access is
`role grant + personal extras − personal revocations`; `SUPER_ADMIN` always
resolves to the full catalogue in code, so a mis-edited role cannot lock the
owner out.

Tailors hold `orders:read_assigned` rather than `orders:read`, which scopes every
list, board, dashboard figure and agenda to their own work.

In the UI, `$can('permission')` (with `v-if`) and `useRBAC().can()` hide controls
the user cannot use. That is presentation only — **every route re-checks the same
permission server-side.**

---

## Project layout

```
app/
├── components/
│   ├── catalog/      Garment-type editor (measurement fields + BOM)
│   ├── clients/      Client form, measurement capture
│   ├── dashboard/    Pipeline bar, revenue chart
│   ├── inventory/    Material table, stock adjustment
│   ├── orders/       Kanban board, order builder, BOM calculator, item panel
│   ├── shared/       Sidebar, header, notifications, table/page primitives
│   └── users/        Permission matrix, staff form
├── composables/      useOrders, useClients, useInventory, useCatalog, useStaff, useRBAC
├── middleware/       auth.global.ts — session + per-page permission gate
├── pages/
├── plugins/can.ts    $can() template permission helper
└── stores/auth.ts

scripts/
└── seed-reset.mjs    Drives the dev-only reseed endpoint (`pnpm seed:reset`)

server/
├── api/              auth, clients, orders, inventory, catalog, users, roles, dashboard
│   └── dev/          Development-only helpers (seed reset)
├── models/           Mongoose schemas
├── plugins/          Bootstrap seed
└── utils/            db (connection + transaction fallback), auth/RBAC guard,
                      stock engine, BOM expansion, zod helpers, audit log, seed fixtures

shared/               Permission catalogue, order status machine, API types
                      — imported by both the server and the client
```

`shared/` is the reason the two halves cannot drift: the permission list the
server enforces and the one the sidebar filters against are the same file.

---

## API notes

All routes are session-authenticated and permission-guarded. Errors follow a
consistent shape:

```jsonc
{
  "statusCode": 422,
  "message": "VALIDATION_FAILED",
  "data": {
    "code": "VALIDATION_FAILED",
    "params": {},
    "errors": [{ "name": "phone", "message": "FIELD_PHONE_INVALID", "params": {} }]
  }
}
```

Errors travel as **stable machine codes**, never prose — `server/utils/error.ts`
emits them and `useApiToast` renders them in the operator's active language
(`apiErr.*` / `fieldErr.*` in `i18n/locales`). `data.errors` is shaped for
`UForm.setErrors()`, so server-side validation lands on the right field. A stock
shortage returns `409` with `data.shortages` describing what is missing and by
how much.

Deletes are conservative where history matters: a client with orders is archived
rather than deleted, materials and garment types in use are deactivated, staff
accounts are always deactivated, and only a `DRAFT` order with no payments can be
deleted outright.
