import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaModels?: readonly string[];
};

/** CamelCase delegate keys Prisma exposes on the client (e.g. directoryListing). */
function expectedModelDelegates(): string[] {
  return Object.values(Prisma.ModelName).map(
    (model) => model.charAt(0).toLowerCase() + model.slice(1),
  );
}

function clientHasCurrentSchema(client: PrismaClient): boolean {
  const expected = expectedModelDelegates();
  const record = client as unknown as Record<string, unknown>;
  return expected.every((delegate) => typeof record[delegate] !== "undefined");
}

function createPrisma(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function replacePrismaClient(cached: PrismaClient | undefined): PrismaClient {
  if (cached) {
    void cached.$disconnect().catch(() => undefined);
  }
  const fresh = createPrisma();
  globalForPrisma.prisma = fresh;
  globalForPrisma.prismaSchemaModels = expectedModelDelegates();
  return fresh;
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;

  if (!cached || !clientHasCurrentSchema(cached)) {
    return replacePrismaClient(cached);
  }
  return cached;
}

/** Always resolves to the current singleton (safe after resetPrismaConnection). */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});

export function resetPrismaConnection(): void {
  replacePrismaClient(globalForPrisma.prisma);
}

/** True when Postgres/Neon is unreachable or the connection was closed. */
export function isPrismaUnavailableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P1001" || error.code === "P1002" || error.code === "P1017";
  }
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error && typeof error === "object" && "kind" in error) {
    const kind = (error as { kind?: unknown }).kind;
    if (kind === "Closed" || kind === "Reset") return true;
  }
  if (error instanceof Error) {
    return /can't reach database|connection.*closed|kind:\s*Closed|ECONNRESET|ETIMEDOUT/i.test(
      error.message,
    );
  }
  return false;
}

/** Run a query after a long idle period; reconnect once if Neon/pgbouncer closed the socket. */
export async function withPrismaRetry<T>(
  fn: (client: PrismaClient) => Promise<T>,
): Promise<T> {
  const run = async () => {
    const client = getPrismaClient();
    await client.$connect();
    return fn(client);
  };

  try {
    return await run();
  } catch (error) {
    if (!isPrismaUnavailableError(error)) throw error;
    resetPrismaConnection();
    return run();
  }
}
