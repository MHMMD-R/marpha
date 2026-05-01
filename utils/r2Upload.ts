import { FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const R2_UPLOAD_BASE_URL = 'https://marpha-uploader.marpha.workers.dev';

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

function buildUploadUrl(bucketType: R2BucketType, folder: string, fileName: string) {
  const params = new URLSearchParams({
    bucketType,
    folder,
    fileName,
  });

  return `${R2_UPLOAD_BASE_URL}/api/r2/upload?${params.toString()}`;
}

function getUploadFileName(uri: string, fileName: string | null | undefined, fallbackFileName: string) {
  return fileName || uri.split('/').pop() || fallbackFileName;
}

function getMessageFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

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
    if (typeof publicUrl === 'string' && publicUrl.trim()) {
      return publicUrl;
    }
  }

  throw new Error(`${label}: لم يرجع السيرفر رابط الملف.`);
}

export async function uploadR2File(options: UploadR2FileOptions): Promise<string> {
  const label = options.errorLabel || 'رفع الملف';
  const fileName = getUploadFileName(options.uri, options.fileName, options.fallbackFileName);
  const uploadUrl = buildUploadUrl(options.bucketType, options.folder, fileName);
  const contentType = options.mimeType || 'application/octet-stream';

  if (Platform.OS === 'web') {
    const fileResponse = await fetch(options.uri);
    if (!fileResponse.ok) {
      throw new Error(`${label}: تعذر قراءة الملف من الجهاز.`);
    }

    const blob = await fileResponse.blob();
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob,
    });
    const responseBody = await response.text();
    const payload = responseBody ? parseUploadResponse(responseBody, label) : null;

    if (!response.ok) {
      const serverMessage = getMessageFromPayload(payload);
      throw new Error(serverMessage || `${label}: فشل الرفع برمز ${response.status}.`);
    }

    return readPublicUrl(payload, label);
  }

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
