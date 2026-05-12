import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// The CLI accepts an `adapter` factory at runtime (needed for libsql migrate
// + introspect), but the public type for `PrismaConfig` in 7.8 doesn't expose
// it yet. Cast through `any` until that ships.
const config: Parameters<typeof defineConfig>[0] = {
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./dev.db",
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
