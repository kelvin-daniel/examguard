import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";

/**
 * Prisma config — handles both local SQLite and remote Turso seamlessly.
 *
 * The CLI's URL parser doesn't speak `libsql://` (the schema.prisma
 * provider is `sqlite`), so the `datasource.url` we hand it has to be
 * a `file:` URL even when we're targeting Turso. The actual connection
 * goes through the libsql adapter, which reads DATABASE_URL +
 * TURSO_AUTH_TOKEN directly.
 *
 * In practice: set DATABASE_URL=libsql://... + TURSO_AUTH_TOKEN=... for
 * remote, or DATABASE_URL=file:./dev.db for local. We strip the libsql
 * scheme before handing to the URL parser.
 */
function localPlaceholderUrl(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  // The libsql adapter takes the real URL; the parser just needs *any*
  // valid file: URL to pass scheme validation.
  return url.startsWith("libsql://") ? "file:./dev.db" : url;
}

const config: Parameters<typeof defineConfig>[0] = {
  schema: "prisma/schema.prisma",
  datasource: {
    url: localPlaceholderUrl(),
  },
  migrations: {
    path: "prisma/migrations",
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(config as any).adapter = async () =>
  new PrismaLibSql({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

export default defineConfig(config);
