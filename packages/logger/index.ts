import pino from "pino";
import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { LogModule } from "@repo/db/enums";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV !== "production";
const logLevel = process.env.LOG_LEVEL ?? (isDev ? "debug" : "info");
const logsDir = resolve(__dirname, "../../logs");

/** Module names are owned by `@repo/db/enums`. */
export type ModuleName = (typeof LogModule)[number]["value"];
const MODULES: ModuleName[] = LogModule.map((module) => module.value);

type Destination = ReturnType<typeof pino.destination>;

const dateKey = (date = new Date()): string => date.toISOString().substring(0, 10);

function moduleLogger(module: ModuleName): pino.Logger {
  let date = "";
  let destination: Destination | null = null;
  let instance: pino.Logger | null = null;

  const ensure = (): pino.Logger => {
    const today = dateKey();
    if (destination !== null && date === today) return instance!;

    if (destination === null) {
      destination = pino.destination({
        dest: resolve(logsDir, module, `${today}.log`),
        mkdir: true,
        sync: true,
      });
      instance = pino({ level: logLevel }, destination);
    } else {
      destination.flushSync();
      destination.reopen(resolve(logsDir, module, `${today}.log`));
    }
    date = today;
    return instance!;
  };

  return new Proxy({} as pino.Logger, {
    get: (_target, prop) => {
      const current = ensure();
      const value = (current as any)[prop];
      return typeof value === "function" ? value.bind(current) : value;
    },
    set: (_target, prop, value) => {
      (ensure() as any)[prop] = value;
      return true;
    },
  });
}

export const logger = Object.fromEntries(
  MODULES.map((module) => [module, moduleLogger(module)]),
) as Record<ModuleName, pino.Logger>;

export interface LogEntry {
  level: number;
  time: number;
  msg?: string;
  [key: string]: unknown;
}

export interface LogQuery {
  module: ModuleName;
  date?: string;
  levels?: number[];
  search?: string;
}

export function readLogs(query: LogQuery): LogEntry[] {
  const { module } = query;
  const date = query.date ?? dateKey();
  const levels = query.levels?.length ? [...new Set(query.levels)] : undefined;
  const search = query.search?.trim().toLowerCase().slice(0, 200);

  const file = resolve(logsDir, module, `${date}.log`);
  let entries: LogEntry[] = [];
  if (existsSync(file)) {
    entries = readFileSync(file, "utf8")
      .split("\n")
      .map((line): LogEntry | null => {
        try {
          return JSON.parse(line) as LogEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is LogEntry => entry !== null);
  }

  return entries
    .filter((entry) => !levels || levels.includes(entry.level))
    .filter((entry) => !search || JSON.stringify(entry).toLowerCase().includes(search))
    .sort((a, b) => (b.time ?? 0) - (a.time ?? 0));
}
