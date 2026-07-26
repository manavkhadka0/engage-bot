export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type FetchOptions = RequestInit & {
  tenantId?: string | null;
  json?: unknown;
  formData?: FormData;
};

/** Browser calls go through Next `/api/be/*` rewrite so cookies are same-origin. */
function resolveUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    return `/api/be${normalized}`;
  }
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  return `${api}${normalized}`;
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { tenantId, json, formData, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);

  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (tenantId) {
    headers.set("x-tenant-id", tenantId);
  }

  const body =
    formData !== undefined
      ? formData
      : json !== undefined
        ? JSON.stringify(json)
        : rest.body;

  const res = await fetch(resolveUrl(path), {
    ...rest,
    headers,
    credentials: "include",
    body,
  });

  if (!res.ok) {
    let bodyErr: unknown = null;
    try {
      bodyErr = await res.json();
    } catch {
      bodyErr = await res.text();
    }
    const message =
      typeof bodyErr === "object" &&
      bodyErr &&
      "message" in bodyErr &&
      typeof (bodyErr as { message: unknown }).message === "string"
        ? (bodyErr as { message: string }).message
        : Array.isArray(
              typeof bodyErr === "object" &&
                bodyErr &&
                "message" in bodyErr &&
                (bodyErr as { message: unknown }).message,
            )
          ? ((bodyErr as { message: string[] }).message).join(", ")
          : `Request failed (${res.status})`;
    throw new ApiError(res.status, message, bodyErr);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
