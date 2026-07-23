import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), ".oxzi/projects");
const INDEX_PATH = join(process.cwd(), ".oxzi/index.json");

function ensureDir(): void {
  mkdirSync(DATA_DIR, { recursive: true });
}

// ── Types ──────────────────────────────────────────────────────────

export interface ProjectRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  brief: string;
  canonicalState: Record<string, unknown> | null;
  discoveryResult: Record<string, unknown> | null;
  extractionResult: Record<string, unknown> | null;
  generatedFiles: Record<string, string> | null;
}

export interface ProjectIndexEntry {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// ── CRUD ───────────────────────────────────────────────────────────

function readIndex(): ProjectIndexEntry[] {
  try {
    if (!existsSync(INDEX_PATH)) return [];
    return JSON.parse(readFileSync(INDEX_PATH, "utf-8")) as ProjectIndexEntry[];
  } catch {
    return [];
  }
}

function writeIndex(entries: ProjectIndexEntry[]): void {
  ensureDir();
  writeFileSync(INDEX_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

export function listProjects(): ProjectIndexEntry[] {
  return readIndex().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getProject(id: string): ProjectRecord | null {
  ensureDir();
  const filePath = join(DATA_DIR, `${id}.json`);
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as ProjectRecord;
  } catch {
    return null;
  }
}

export function createProject(input: { id: string; title: string; brief: string }): ProjectRecord {
  ensureDir();
  const now = new Date().toISOString();
  const record: ProjectRecord = {
    id: input.id,
    title: input.title,
    createdAt: now,
    updatedAt: now,
    brief: input.brief,
    canonicalState: null,
    discoveryResult: null,
    extractionResult: null,
    generatedFiles: null,
  };
  const filePath = join(DATA_DIR, `${input.id}.json`);
  writeFileSync(filePath, JSON.stringify(record, null, 2), "utf-8");

  const index = readIndex();
  index.push({ id: input.id, title: input.title, createdAt: now, updatedAt: now });
  writeIndex(index);

  return record;
}

export function updateProject(
  id: string,
  updates: Partial<Omit<ProjectRecord, "id" | "createdAt">>,
): ProjectRecord | null {
  const record = getProject(id);
  if (!record) return null;

  const updated: ProjectRecord = {
    ...record,
    ...updates,
    id: record.id,
    createdAt: record.createdAt,
    updatedAt: new Date().toISOString(),
  };

  const filePath = join(DATA_DIR, `${id}.json`);
  writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");

  const index = readIndex();
  const idx = index.findIndex((entry) => entry.id === id);
  if (idx !== -1) {
    index[idx]!.updatedAt = updated.updatedAt;
    writeIndex(index);
  }

  return updated;
}

export function deleteProject(id: string): boolean {
  const filePath = join(DATA_DIR, `${id}.json`);
  if (!existsSync(filePath)) return false;
  rmSync(filePath);

  const index = readIndex().filter((entry) => entry.id !== id);
  writeIndex(index);

  return true;
}
