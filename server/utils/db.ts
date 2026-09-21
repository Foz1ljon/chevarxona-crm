import mongoose from 'mongoose'

/**
 * Mongoose keeps a single global connection pool. We cache the in-flight
 * promise on `globalThis` so Nitro HMR / lambda re-entry never opens a
 * second pool against the same process.
 */
const globalCache = globalThis as typeof globalThis & {
  __chevarMongoose?: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
    supportsTransactions: boolean | null
  }
}

const cache = globalCache.__chevarMongoose ??= {
  conn: null,
  promise: null,
  supportsTransactions: null
}

mongoose.set('strictQuery', true)

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn && cache.conn.connection.readyState === 1) return cache.conn

  if (!cache.promise) {
    const { mongodbUri } = useRuntimeConfig()

    cache.promise = mongoose
      .connect(mongodbUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
        // Every model in this app declares its own timestamps/indexes.
        autoIndex: process.env.NODE_ENV !== 'production'
      })
      .then((m) => {
        cache.conn = m
        return m
      })
      .catch((error) => {
        // Reset so the next request retries instead of resolving a dead promise.
        cache.promise = null
        throw error
      })
  }

  return cache.promise
}

/**
 * Multi-document transactions require a replica set or mongos. Plenty of
 * workshops run a single standalone `mongod`, so we probe once and degrade
 * to sequential writes rather than failing the request outright.
 */
export async function supportsTransactions(): Promise<boolean> {
  if (cache.supportsTransactions !== null) return cache.supportsTransactions

  const conn = await connectToDatabase()
  try {
    const info = await conn.connection.db!.admin().command({ hello: 1 })
    cache.supportsTransactions = Boolean(info.setName || info.msg === 'isdbgrid')
  } catch {
    cache.supportsTransactions = false
  }
  return cache.supportsTransactions
}

export type TxSession = mongoose.ClientSession | undefined

/**
 * Runs `fn` inside a real transaction when the deployment supports one,
 * otherwise runs it directly with `session === undefined`. Every write inside
 * `fn` must forward the session so the two modes stay equivalent.
 */
export async function withTransaction<T>(fn: (session: TxSession) => Promise<T>): Promise<T> {
  const conn = await connectToDatabase()

  if (!(await supportsTransactions())) {
    return fn(undefined)
  }

  const session = await conn.startSession()
  try {
    let result!: T
    await session.withTransaction(async () => {
      result = await fn(session)
    })
    return result
  } finally {
    await session.endSession()
  }
}

export { mongoose }
