import { runSeed } from '../utils/seed'

/**
 * Boots the demo/starting data. The heavy lifting lives in `utils/seed` so the
 * same routine can be triggered with `SEED_RESET=true` to start over.
 */
export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  if (!config.seedOnBoot) return

  try {
    const result = await runSeed({ reset: config.seedReset })
    if (result.reset) {
      console.info('[chevarxona] SEED_RESET was set — the workshop was rebuilt from scratch.')
    }
  } catch (error) {
    const message = (error as Error).message ?? String(error)

    if (/ECONNREFUSED|ENOTFOUND|Server selection timed out|MongoServerSelectionError/i.test(message)) {
      console.warn(
        '\n[chevarxona] Could not reach MongoDB — skipping seed.\n'
        + `  ${message}\n`
        + '  Set MONGODB_URI in .env and restart.\n'
      )
      return
    }

    console.error('[chevarxona] seed failed:', message)
  }
})
