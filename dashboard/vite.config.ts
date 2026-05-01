import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

type BucketType = "LECTURES" | "QUIZZES" | "PROFILES" | "PLAYLIST_THUMBNAIL"

const sanitizeSegment = (value: string): string =>
  value
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, "_"))
    .filter(Boolean)
    .join("/")

const sanitizeFileName = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .toLowerCase()

const readRequestBody = async (req: NodeJS.ReadableStream): Promise<string> => {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString("utf8")
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")

  const accountId = env.R2_ACCOUNT_ID || env.VITE_R2_ACCOUNT_ID
  const accessKeyId = env.R2_ACCESS_KEY_ID || env.VITE_R2_ACCESS_KEY_ID
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY || env.VITE_R2_SECRET_ACCESS_KEY

  const buckets: Record<BucketType, string> = {
    LECTURES: env.R2_LECTURES_BUCKET || env.VITE_R2_LECTURES_BUCKET || "marpha-lectures",
    QUIZZES: env.R2_QUIZZES_BUCKET || env.VITE_R2_QUIZZES_BUCKET || "marpha-quizzes",
    PROFILES: env.R2_PROFILES_BUCKET || env.VITE_R2_PROFILES_BUCKET || "profiles",
    PLAYLIST_THUMBNAIL: env.R2_PLAYLIST_THUMBNAIL_BUCKET || env.VITE_R2_PLAYLIST_THUMBNAIL_BUCKET || "playlist-thumbnail",
  }

  const publicBases: Record<BucketType, string> = {
    LECTURES: (env.R2_LECTURES_PUBLIC_URL || env.VITE_R2_LECTURES_PUBLIC_URL || "").replace(/\/+$/, ""),
    QUIZZES: (env.R2_QUIZZES_PUBLIC_URL || env.VITE_R2_QUIZZES_PUBLIC_URL || "").replace(/\/+$/, ""),
    PROFILES: (env.R2_PROFILES_PUBLIC_URL || env.VITE_R2_PROFILES_PUBLIC_URL || "").replace(/\/+$/, ""),
    PLAYLIST_THUMBNAIL: (env.R2_PLAYLISTS_PUBLIC_URL || env.VITE_R2_PLAYLISTS_PUBLIC_URL || "").replace(/\/+$/, ""),
  }

  const s3Client =
    accountId && accessKeyId && secretAccessKey
      ? new S3Client({
          region: "auto",
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        })
      : undefined

  return {
    plugins: [
      react(),
      {
        name: "r2-dev-upload-api",
        apply: "serve", // This restricts the plugin to run ONLY in dev mode (`vite` or `npm run dev`)
        configureServer(server) {
          server.middlewares.use("/api/r2/upload", (req, res, next) => {
            if (req.method !== "PUT") {
              return next()
            }

            void (async () => {
              if (!s3Client) {
                res.statusCode = 500
                res.setHeader("Content-Type", "application/json")
                res.end(JSON.stringify({ error: "Missing R2 server credentials in dashboard/.env" }))
                return
              }

              const requestUrl = new URL(req.url || "", "http://localhost")
              const rawBucketType = (requestUrl.searchParams.get("bucketType") || "LECTURES").toUpperCase()
              if (rawBucketType !== "LECTURES" && rawBucketType !== "QUIZZES" && rawBucketType !== "PROFILES" && rawBucketType !== "PLAYLIST_THUMBNAIL") {
                res.statusCode = 400
                res.setHeader("Content-Type", "application/json")
                res.end(JSON.stringify({ error: "Invalid bucketType" }))
                return
              }

              const bucketType: BucketType = rawBucketType
              const folder = sanitizeSegment(requestUrl.searchParams.get("folder") || "")
              const rawFileName = requestUrl.searchParams.get("fileName") || "upload.bin"
              const cleanFileName = sanitizeFileName(rawFileName)
              const keyName = `${folder ? `${folder}/` : ""}${Date.now()}-${cleanFileName}`

              const contentTypeHeader = req.headers["content-type"]
              const contentType = Array.isArray(contentTypeHeader)
                ? contentTypeHeader[0]
                : contentTypeHeader || "application/octet-stream"

              const contentLengthHeader = req.headers["content-length"]
              const rawContentLength = Array.isArray(contentLengthHeader)
                ? contentLengthHeader[0]
                : contentLengthHeader
              const parsedContentLength = rawContentLength
                ? Number.parseInt(rawContentLength, 10)
                : Number.NaN
              const contentLength = Number.isFinite(parsedContentLength)
                ? parsedContentLength
                : undefined

              await s3Client.send(
                new PutObjectCommand({
                  Bucket: buckets[bucketType],
                  Key: keyName,
                  Body: req,
                  ContentType: contentType,
                  ...(contentLength !== undefined ? { ContentLength: contentLength } : {}),
                })
              )

              const publicBase = publicBases[bucketType]
              const publicUrl = publicBase ? `${publicBase}/${keyName}` : keyName

              res.statusCode = 200
              res.setHeader("Content-Type", "application/json")
              res.end(JSON.stringify({ publicUrl }))
            })().catch((error: unknown) => {
              const message = error instanceof Error ? error.message : "Upload failed"
              res.statusCode = 500
              res.setHeader("Content-Type", "application/json")
              res.end(JSON.stringify({ error: message }))
            })
          })

          server.middlewares.use("/api/r2/delete", (req, res, next) => {
            if (req.method !== "DELETE") {
              return next()
            }

            void (async () => {
              if (!s3Client) {
                res.statusCode = 500
                res.setHeader("Content-Type", "application/json")
                res.end(JSON.stringify({ error: "Missing R2 server credentials in dashboard/.env" }))
                return
              }

              const rawBody = await readRequestBody(req)
              const body = rawBody ? (JSON.parse(rawBody) as { bucketType?: string; fileUrl?: string }) : {}
              const rawBucketType = (body.bucketType || "").toUpperCase()
              const fileUrl = body.fileUrl || ""

              if (rawBucketType !== "LECTURES" && rawBucketType !== "QUIZZES" && rawBucketType !== "PLAYLIST_THUMBNAIL") {
                res.statusCode = 400
                res.setHeader("Content-Type", "application/json")
                res.end(JSON.stringify({ error: "Invalid bucketType" }))
                return
              }

              const bucketType: BucketType = rawBucketType
              const publicBase = publicBases[bucketType]

              if (!publicBase || !fileUrl.startsWith(`${publicBase}/`)) {
                res.statusCode = 400
                res.setHeader("Content-Type", "application/json")
                res.end(JSON.stringify({ error: "fileUrl does not match configured public bucket URL" }))
                return
              }

              const keyName = fileUrl.replace(`${publicBase}/`, "")

              await s3Client.send(
                new DeleteObjectCommand({
                  Bucket: buckets[bucketType],
                  Key: keyName,
                })
              )

              res.statusCode = 200
              res.setHeader("Content-Type", "application/json")
              res.end(JSON.stringify({ ok: true }))
            })().catch((error: unknown) => {
              const message = error instanceof Error ? error.message : "Delete failed"
              res.statusCode = 500
              res.setHeader("Content-Type", "application/json")
              res.end(JSON.stringify({ error: message }))
            })
          })
        },
      },
    ],
    server: {
      proxy: {
        '/expo-push-api': {
          target: 'https://exp.host',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/expo-push-api/, '')
        }
      }
    },
  }
})
