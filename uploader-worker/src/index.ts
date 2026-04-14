/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	LECTURES: R2Bucket;
	QUIZZES: R2Bucket;
	PROFILES: R2Bucket;
	
	VITE_R2_LECTURES_PUBLIC_URL: string;
	VITE_R2_QUIZZES_PUBLIC_URL: string;
	VITE_R2_PROFILES_PUBLIC_URL: string;
}

// Ensure the bucket name exists locally on the env
const getBucket = (env: Env, type: string): R2Bucket | undefined => {
	if (type === "LECTURES") return env.LECTURES;
	if (type === "QUIZZES") return env.QUIZZES;
	if (type === "PROFILES") return env.PROFILES;
	return undefined;
};

const getPublicUrl = (env: Env, type: string): string => {
	let baseUrl = "";
	if (type === "LECTURES") baseUrl = env.VITE_R2_LECTURES_PUBLIC_URL;
	else if (type === "QUIZZES") baseUrl = env.VITE_R2_QUIZZES_PUBLIC_URL;
	else if (type === "PROFILES") baseUrl = env.VITE_R2_PROFILES_PUBLIC_URL;
	return baseUrl ? baseUrl.replace(/\/+$/, "") : "";
};

const sanitizeSegment = (value: string): string =>
	value
		.trim()
		.replace(/\\/g, "/")
		.split("/")
		.map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, "_"))
		.filter(Boolean)
		.join("/");

const sanitizeFileName = (value: string): string =>
	value
		.trim()
		.replace(/\s+/g, "-")
		.replace(/[^a-zA-Z0-9._-]/g, "_")
		.toLowerCase();

// Handle CORS
const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		const url = new URL(request.url);

		if (url.pathname === "/api/r2/upload" && request.method === "PUT") {
			try {
				const rawBucketType = (url.searchParams.get("bucketType") || "LECTURES").toUpperCase();
				const bucket = getBucket(env, rawBucketType);

				if (!bucket) {
					return new Response(JSON.stringify({ error: "Invalid bucketType" }), {
						status: 400,
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					});
				}

				const folder = sanitizeSegment(url.searchParams.get("folder") || "");
				const rawFileName = url.searchParams.get("fileName") || "upload.bin";
				const cleanFileName = sanitizeFileName(rawFileName);
				const keyName = `${folder ? `${folder}/` : ""}${Date.now()}-${cleanFileName}`;

				const contentType = request.headers.get("Content-Type") || "application/octet-stream";

				// Upload the body to Cloudflare R2
				await bucket.put(keyName, request.body, {
					httpMetadata: { contentType },
				});

				const publicBase = getPublicUrl(env, rawBucketType);
				const publicUrl = publicBase ? `${publicBase}/${keyName}` : keyName;

				return new Response(JSON.stringify({ publicUrl }), {
					status: 200,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				});
			} catch (error: any) {
				const message = error instanceof Error ? error.message : "Upload failed";
				return new Response(JSON.stringify({ error: message }), {
					status: 500,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				});
			}
		}

		if (url.pathname === "/api/r2/delete" && request.method === "DELETE") {
			try {
				const text = await request.text();
				const body = text ? JSON.parse(text) : {};
				const rawBucketType = (body.bucketType || "").toUpperCase();
				const fileUrl = body.fileUrl || "";

				const bucket = getBucket(env, rawBucketType);
				if (!bucket) {
					return new Response(JSON.stringify({ error: "Invalid bucketType" }), {
						status: 400,
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					});
				}

				const publicBase = getPublicUrl(env, rawBucketType);
				let keyName = fileUrl;
				if (publicBase && fileUrl.startsWith(publicBase + "/")) {
					keyName = fileUrl.substring(publicBase.length + 1);
				}

				if (keyName) {
					await bucket.delete(keyName);
				}

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				});
			} catch (error: any) {
				const message = error instanceof Error ? error.message : "Delete failed";
				return new Response(JSON.stringify({ error: message }), {
					status: 500,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				});
			}
		}

		return new Response("Not found", { status: 404, headers: corsHeaders });
	},
};