import * as FileSystem from 'expo-file-system';
import { FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const R2_UPLOAD_BASE_URL = 'https://marpha-uploader.marpha.workers.dev';

/** Files larger than this (25 MB) will use multipart upload on native. */
const MULTIPART_THRESHOLD = 25 * 1024 * 1024;
/** Each multipart chunk is 10 MB (R2 minimum is 5 MB except for the last part). */
const PART_SIZE = 10 * 1024 * 1024;

export type R2BucketType = 'LECTURES' | 'PLAYLIST_THUMBNAIL' | 'QUIZZES';

type UploadR2FileOptions = {
  uri: string;
  bucketType: R2BucketType;
  folder: string;
  fileName?: string | null;
  mimeType?: string | null;
  fallbackFileName: string;
  errorLabel?: string;
};

// ─── helpers ────────────────────────────────────────────────────────────────

function buildUploadUrl(bucketType: R2BucketType, folder: string, fileName: string) {
  const params = new URLSearchParams({ bucketType, folder, fileName });
  return `${R2_UPLOAD_BASE_URL}/api/r2/upload?${params.toString()}`;
}

function getUploadFileName(
  uri: string,
  fileName: string | null | undefined,
  fallbackFileName: string,
) {
  return fileName || uri.split('/').pop() || fallbackFileName;
}

function getMessageFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return '';
  const record = payload as Record<string, unknown>;
  return String(record.error || record.message || '');
}

function parseUploadResponse(body: string, label: string) {
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`${label}: رجع السيرفر استجابة غير صالحة.`);
  }
}

function readPublicUrl(payload: unknown, label: string) {
  if (payload && typeof payload === 'object') {
    const publicUrl = (payload as Record<string, unknown>).publicUrl;
    if (typeof publicUrl === 'string' && publicUrl.trim()) return publicUrl;
  }
  throw new Error(`${label}: لم يرجع السيرفر رابط الملف.`);
}

// ─── single-PUT (small files, native) ───────────────────────────────────────

async function uploadSinglePut(
  options: UploadR2FileOptions,
  label: string,
  contentType: string,
  fileName: string,
): Promise<string> {
  const uploadUrl = buildUploadUrl(options.bucketType, options.folder, fileName);
  const uploadTask = await uploadAsync(uploadUrl, options.uri, {
    httpMethod: 'PUT',
    uploadType: FileSystemUploadType?.BINARY_CONTENT ?? 1,
    headers: { 'Content-Type': contentType },
  });

  const payload = uploadTask.body ? parseUploadResponse(uploadTask.body, label) : null;
  if (uploadTask.status < 200 || uploadTask.status >= 300) {
    const serverMessage = getMessageFromPayload(payload);
    throw new Error(serverMessage || `${label}: فشل الرفع برمز ${uploadTask.status}.`);
  }
  return readPublicUrl(payload, label);
}

// ─── multipart upload (large files, native) ──────────────────────────────────

/** Convert a base64 string to a Uint8Array without any external dependency. */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function uploadMultipart(
  options: UploadR2FileOptions,
  label: string,
  contentType: string,
  fileName: string,
  fileSize: number,
): Promise<string> {
  const baseParams = new URLSearchParams({
    bucketType: options.bucketType,
    folder: options.folder,
    fileName,
    contentType,
  });

  // 1. Initiate
  const initiateResp = await fetch(
    `${R2_UPLOAD_BASE_URL}/api/r2/upload/initiate?${baseParams.toString()}`,
    { method: 'POST' },
  );
  if (!initiateResp.ok) {
    const body = await initiateResp.text().catch(() => '');
    throw new Error(`${label}: فشل بدء الرفع المجزأ. ${body}`);
  }
  const { uploadId, key } = (await initiateResp.json()) as {
    uploadId: string;
    key: string;
  };

  // 2. Upload parts
  const parts: { partNumber: number; etag: string }[] = [];
  let offset = 0;
  let partNumber = 1;

  try {
    while (offset < fileSize) {
      const length = Math.min(PART_SIZE, fileSize - offset);

      const base64Chunk = await FileSystem.readAsStringAsync(options.uri, {
        encoding: 'base64' as const,
        position: offset,
        length,
      });
      const bytes = base64ToUint8Array(base64Chunk);

      const partParams = new URLSearchParams({
        bucketType: options.bucketType,
        key,
        uploadId,
        partNumber: String(partNumber),
      });

      const partResp = await fetch(
        `${R2_UPLOAD_BASE_URL}/api/r2/upload/part?${partParams.toString()}`,
        {
          method: 'PUT',
          body: bytes.buffer as ArrayBuffer,
          headers: { 'Content-Type': 'application/octet-stream' },
        },
      );

      if (!partResp.ok) {
        const body = await partResp.text().catch(() => '');
        throw new Error(`${label}: فشل رفع الجزء ${partNumber}. ${body}`);
      }

      const { etag } = (await partResp.json()) as { etag: string };
      parts.push({ partNumber, etag });

      offset += length;
      partNumber++;
    }
  } catch (err) {
    // Abort the incomplete multipart upload so R2 doesn't accumulate orphaned parts.
    await fetch(
      `${R2_UPLOAD_BASE_URL}/api/r2/upload/abort?bucketType=${options.bucketType}`,
      {
        method: 'DELETE',
        body: JSON.stringify({ uploadId, key }),
        headers: { 'Content-Type': 'application/json' },
      },
    ).catch(() => {});
    throw err;
  }

  // 3. Complete
  const completeResp = await fetch(
    `${R2_UPLOAD_BASE_URL}/api/r2/upload/complete?bucketType=${options.bucketType}`,
    {
      method: 'POST',
      body: JSON.stringify({ uploadId, key, parts }),
      headers: { 'Content-Type': 'application/json' },
    },
  );

  if (!completeResp.ok) {
    const body = await completeResp.text().catch(() => '');
    throw new Error(`${label}: فشل إتمام الرفع المجزأ. ${body}`);
  }

  const completePayload = await completeResp.json();
  return readPublicUrl(completePayload, label);
}

// ─── public API ──────────────────────────────────────────────────────────────

export async function uploadR2File(options: UploadR2FileOptions): Promise<string> {
  const label = options.errorLabel || 'رفع الملف';
  const fileName = getUploadFileName(options.uri, options.fileName, options.fallbackFileName);
  const contentType = options.mimeType || 'application/octet-stream';

  // ── Web path ────────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    const uploadUrl = buildUploadUrl(options.bucketType, options.folder, fileName);
    const fileResponse = await fetch(options.uri);
    if (!fileResponse.ok) throw new Error(`${label}: تعذر قراءة الملف من الجهاز.`);

    const blob = await fileResponse.blob();
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob,
    });
    const responseBody = await response.text();
    const payload = responseBody ? parseUploadResponse(responseBody, label) : null;
    if (!response.ok) {
      throw new Error(getMessageFromPayload(payload) || `${label}: فشل الرفع برمز ${response.status}.`);
    }
    return readPublicUrl(payload, label);
  }

  // ── Native path ─────────────────────────────────────────────────────────
  // Check file size to decide between single-PUT and multipart.
  let fileSize = 0;
  try {
    const info = await FileSystem.getInfoAsync(options.uri);
    fileSize = (info as FileSystem.FileInfo & { size?: number }).size ?? 0;
  } catch {
    // If we can't determine size, fall back to single PUT.
  }

  if (fileSize > MULTIPART_THRESHOLD) {
    return uploadMultipart(options, label, contentType, fileName, fileSize);
  }

  return uploadSinglePut(options, label, contentType, fileName);
}
