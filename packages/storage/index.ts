import {
  S3Client,
  type S3File,
  type S3ListObjectsResponse,
  type S3Options,
  type S3Stats,
} from "bun";

export type {
  S3File,
  S3ListObjectsResponse,
  S3Options,
  S3Stats,
};

// Strict env contract: these are the only keys @repo/storage reads.
const accessKeyId = process.env.S3_ACCESS_KEY;
const secretAccessKey = process.env.S3_SECRET_KEY;
const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION ?? "us-east-1";

if (!accessKeyId || !secretAccessKey) {
  console.warn(
    "[@repo/storage] S3_ACCESS_KEY / S3_SECRET_KEY are not set in .env.",
  );
}

/** Default bucket name, from `S3_BUCKET` (falls back to `default`). */
export const bucket = process.env.S3_BUCKET ?? "default";

/**
 * Shared, lazy S3 client. No network I/O happens until a method that touches
 * the bucket is called.
 */
export const s3 = new S3Client({
  ...(accessKeyId ? { accessKeyId } : {}),
  ...(secretAccessKey ? { secretAccessKey } : {}),
  ...(endpoint ? { endpoint } : {}),
  bucket,
  region,
});

/** Lazy reference to an object in the default bucket. */
export function file(key: string, options?: S3Options): S3File {
  return s3.file(key, options);
}

// ---------------------------------------------------------------------------
// Service layer — this is where the business logic lives. The API routes only
// validate input and forward to these functions.
// ---------------------------------------------------------------------------

/** Turn a client-provided filename into a safe object key segment. */
function sanitizeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return base || "file";
}

export interface PresignParams {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "HEAD";
  expiresIn?: number;
  type?: string;
  contentDisposition?: string;
}

/** Presign a URL for direct upload/download without exposing credentials. */
export function presign(key: string, params: PresignParams = {}): string {
  return s3.presign(key, {
    ...(params.method ? { method: params.method } : {}),
    ...(params.expiresIn ? { expiresIn: params.expiresIn } : {}),
    ...(params.type ? { type: params.type } : {}),
    ...(params.contentDisposition ? { contentDisposition: params.contentDisposition } : {}),
  });
}

export interface UploadParams {
  /** Namespace for auto-generated keys (e.g. the caller's user id). */
  scope: string;
  /** Optional explicit key; defaults to `{scope}/{timestamp}-{name}`. */
  key?: string;
  file: File;
}

export interface UploadResult {
  key: string;
  size: number;
}

/** Upload a file, returning the final object key and byte count. */
export async function upload({ scope, key, file: blob }: UploadParams): Promise<UploadResult> {
  const objectKey = key ?? `${scope}/${Date.now()}-${sanitizeFileName(blob.name)}`;
  const size = await s3.write(objectKey, blob, {
    ...(blob.type ? { type: blob.type } : {}),
  });
  return { key: objectKey, size };
}

/** Returns a lazy reference to the object, or `null` if it does not exist. */
export async function download(key: string): Promise<S3File | null> {
  return (await s3.exists(key)) ? s3.file(key) : null;
}

/** Delete an object from the bucket. */
export async function removeObject(key: string): Promise<{ key: string; deleted: true }> {
  await s3.delete(key);
  return { key, deleted: true };
}

export type ObjectStat =
  | { key: string; exists: false }
  | { key: string; exists: true } & S3Stats;

/** Metadata for an object, without downloading its body. */
export async function statObject(key: string): Promise<ObjectStat> {
  if (!(await s3.exists(key))) return { key, exists: false };
  return { key, exists: true, ...(await s3.stat(key)) };
}

export interface ListParams {
  prefix?: string;
  maxKeys?: number;
}

export interface ListResult {
  isTruncated: boolean;
  contents: NonNullable<S3ListObjectsResponse["contents"]>;
}

/** List objects in the bucket (up to 1,000 per request). */
export async function listObjects(params: ListParams = {}): Promise<ListResult> {
  const { isTruncated, contents } = await s3.list({
    ...(params.prefix ? { prefix: params.prefix } : {}),
    ...(params.maxKeys ? { maxKeys: params.maxKeys } : {}),
  });
  return { isTruncated: isTruncated ?? false, contents: contents ?? [] };
}
