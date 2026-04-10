const uploadApiBase = (import.meta.env.VITE_UPLOAD_API_BASE || "").replace(/\/+$/, "")

const toApiUrl = (path: string): string => `${uploadApiBase}${path}`

const readApiError = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { error?: string }
    if (payload?.error) {
      return payload.error
    }
  } catch {
    // Ignore parse failures and use generic fallback below.
  }

  return `Request failed with status ${response.status}`
}

export async function uploadToR2(
  file: File,
  bucketType: "LECTURES" | "QUIZZES",
  folder: string = ""
): Promise<string> {
  const params = new URLSearchParams({
    bucketType,
    folder,
    fileName: file.name,
  })

  const response = await fetch(toApiUrl(`/api/r2/upload?${params.toString()}`), {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  })

  if (!response.ok) {
    throw new Error(await readApiError(response))
  }

  const payload = (await response.json()) as { publicUrl?: string }
  if (!payload.publicUrl) {
    throw new Error("Upload succeeded but no public URL was returned")
  }

  return payload.publicUrl
}

export async function deleteFromR2(fileUrl: string, bucketType: "LECTURES" | "QUIZZES"): Promise<void> {
  const response = await fetch(toApiUrl("/api/r2/delete"), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileUrl,
      bucketType,
    }),
  })

  if (!response.ok) {
    throw new Error(await readApiError(response))
  }
}
