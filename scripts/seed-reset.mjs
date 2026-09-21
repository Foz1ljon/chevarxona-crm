#!/usr/bin/env node
/**
 * Rebuilds the workshop so it always looks alive: Uzbek demo staff, clients,
 * orders spread across every Kanban lane, plus the catalog and stock that the
 * orders consume.
 *
 * The seed itself lives in the Nitro runtime (`server/utils/seed.ts`), so this
 * script drives it over HTTP instead of duplicating the fixture logic:
 *
 *   pnpm dev            # terminal 1
 *   pnpm seed:reset     # terminal 2
 *
 * Flags:
 *   --url=<origin>            dev server origin (default http://localhost:3000)
 *   --email=<login>           super admin login (default from .env / seed defaults)
 *   --password=<password>     super admin password
 *   --seed-only               only fill empty collections, keep existing data
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Minimal `KEY=value` reader — enough for the handful of keys we need. */
function readEnv(file = '.env') {
  try {
    const entries = readFileSync(resolve(ROOT, file), 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))

    return Object.fromEntries(entries.map((line) => {
      const index = line.indexOf('=')
      return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')]
    }))
  } catch {
    return {}
  }
}

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=')
    return [key, rest.join('=') || 'true']
  })
)

const env = readEnv()
const origin = args.get('url') || process.env.SEED_URL || 'http://localhost:3000'
const email = args.get('email') || process.env.SEED_ADMIN_EMAIL || env.SEED_ADMIN_EMAIL || 'admin@chevarxona.uz'
const password = args.get('password') || process.env.SEED_ADMIN_PASSWORD || env.SEED_ADMIN_PASSWORD || 'admin123'
const reset = !args.has('seed-only')

function fail(message) {
  console.error(`\n  ✖ ${message}\n`)
  process.exit(1)
}

async function post(path, { body, cookie } = {}) {
  const response = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {})
    },
    body: JSON.stringify(body ?? {})
  }).catch((error) => {
    fail(
      `Could not reach ${origin} (${error.cause?.code ?? error.message}).\n`
      + '    Start the dev server first:  pnpm dev'
    )
  })

  return response
}

console.log(`\n  Chevarxona · seed ${reset ? 'reset' : 'top-up'} → ${origin}\n`)

const login = await post('/api/auth/login', { body: { email, password } })

if (!login.ok) {
  const payload = await login.json().catch(() => ({}))
  fail(
    `Login failed for ${email} (HTTP ${login.status}).\n`
    + `    ${payload?.data?.code ?? payload?.message ?? 'unknown error'}\n`
    + '    Check SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in .env.'
  )
}

// Nuxt keeps the session in a httpOnly cookie; forward it by hand.
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get('set-cookie')])
  .filter(Boolean)
  .map(value => value.split(';')[0])
  .join('; ')

const response = await post('/api/dev/seed', { body: { reset }, cookie })

if (!response.ok) {
  const payload = await response.json().catch(() => ({}))
  fail(`Seed failed (HTTP ${response.status}): ${payload?.data?.code ?? payload?.message ?? 'unknown error'}`)
}

const { counts, durationMs, seededCategories } = await response.json()

console.log(`  ✔ ${reset ? 'Workshop rebuilt' : 'Missing collections filled'} in ${durationMs} ms`)
if (seededCategories) {
  console.log(`    ${seededCategories} garment categories written with BOM templates`)
}
console.log('')
for (const [label, value] of Object.entries(counts)) {
  console.log(`    ${label.padEnd(11)} ${value}`)
}
console.log(`\n  Sign in as ${email} · demo staff password "demo1234"\n`)
