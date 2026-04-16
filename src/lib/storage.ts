import fs from "fs";
import path from "path";
import crypto from "crypto";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

const ALLOWED_EXTENSIONS = new Set(Object.keys(MIME_TYPES));

function getUploadRoot(): string {
  const dataDir = fs.existsSync("/app/data") ? "/app/data" : process.cwd();
  return path.join(dataDir, "uploads");
}

function safePath(key: string): string | null {
  const root = getUploadRoot();
  const resolved = path.resolve(root, key);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) return null;
  return resolved;
}

export function put(category: string, filename: string, data: Buffer): string {
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`Disallowed file extension: ${ext}`);
  }

  const root = getUploadRoot();
  const dir = path.join(root, category);
  fs.mkdirSync(dir, { recursive: true });

  const id = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const key = `${category}/${id}${ext}`;
  const fullPath = path.join(root, key);

  fs.writeFileSync(fullPath, data);
  return key;
}

export function get(key: string): { data: Buffer; contentType: string } | null {
  const fullPath = safePath(key);
  if (!fullPath || !fs.existsSync(fullPath)) return null;

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  return { data: fs.readFileSync(fullPath), contentType };
}

export function remove(key: string): void {
  const fullPath = safePath(key);
  if (fullPath && fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}
