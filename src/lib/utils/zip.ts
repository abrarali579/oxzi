import { createRequire } from "node:module";
import { Writable } from "node:stream";

const _require = createRequire(import.meta.url);
const { ZipArchive } = _require("archiver") as {
  ZipArchive: new (options?: Record<string, unknown>) => AnyArchive;
};

// Minimal type for archiver instance methods used here
interface AnyArchive {
  pipe: (dest: Writable) => void;
  append: (content: string, options: { name: string }) => void;
  finalize: () => Promise<void>;
}

export interface ZipEntry {
  path: string;
  content: string;
}

export async function createZipBuffer(entries: ZipEntry[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    const writable = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        chunks.push(chunk);
        callback();
      },
    });

    writable.on("finish", () => resolve(Buffer.concat(chunks)));
    writable.on("error", reject);

    archive.pipe(writable);

    for (const entry of entries) {
      archive.append(entry.content, { name: entry.path });
    }

    archive.finalize().catch(reject);
  });
}
