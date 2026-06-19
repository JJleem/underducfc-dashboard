// app/lib/underduck.ts
//
// underduck 백엔드(FastAPI + Postgres) 서버사이드 전용 fetch 헬퍼.
//
// ⚠️ 클라이언트 컴포넌트/브라우저에서 import·호출 금지.
//    X-Underduck-Secret이 클라이언트 번들에 노출되면 안 됨.
//    route handler(app/api/*) 또는 server component에서만 사용할 것.
//
// 모든 엔드포인트는 백엔드의 `/api/underduck/*` 아래에 있고 require_underduck 가드를 거친다.

// 실수로 클라이언트에 번들되면 즉시 터지도록 모듈 로드 시점에 차단한다.
if (typeof window !== "undefined") {
  throw new Error(
    "app/lib/underduck.ts는 서버에서만 사용할 수 있습니다. (X-Underduck-Secret 노출 방지)",
  );
}

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface NextFetchOptions {
  revalidate?: number | false;
  tags?: string[];
}

interface UnderduckRequest {
  method?: HttpMethod;
  /** JSON으로 직렬화해 보낼 본문. 생략 시 본문 없음. */
  body?: unknown;
  /** 기본 no-store. `next`를 넘기면 cache 대신 next 옵션이 적용된다. */
  cache?: RequestCache;
  next?: NextFetchOptions;
}

/**
 * underduck 백엔드 호출 코어. `path`는 "/api/underduck/..." 형식을 기대한다.
 * 429/5xx 같은 일시적 오류는 짧게 재시도한다(google-sheets 읽기 패턴과 동일).
 */
export async function underduckFetch<T = unknown>(
  path: string,
  { method = "GET", body, cache = "no-store", next }: UnderduckRequest = {},
): Promise<T> {
  const base = process.env.UNDERDUCK_API_BASE;
  const secret = process.env.UNDERDUCK_API_SECRET;

  if (!base || !secret) {
    throw new Error(
      "underduck 백엔드 환경변수(UNDERDUCK_API_BASE / UNDERDUCK_API_SECRET)가 설정되지 않았습니다.",
    );
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = `${base.replace(/\/$/, "")}${normalized}`;

  const headers: Record<string, string> = {
    "X-Underduck-Secret": secret,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  // next(ISR) 옵션과 cache: "no-store"는 함께 쓸 수 없으므로 둘 중 하나만 적용한다.
  const init: RequestInit & { next?: NextFetchOptions } = {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
  if (next) init.next = next;
  else init.cache = cache;

  let response: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch(url, init);
    if (response.ok) break;

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }

  if (!response?.ok) {
    const status = response?.status ?? 0;
    let detail = "";
    try {
      detail = (await response?.text()) ?? "";
    } catch {
      /* 본문 파싱 실패 무시 */
    }
    console.error(`[underduck] ${method} ${normalized} 실패 (${status}) ${detail}`.trim());
    throw new Error(`underduck 요청 실패: ${method} ${normalized} (${status})`);
  }

  // 204 No Content 등 본문 없는 응답 대응
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** GET. 읽기는 server component에서 `next: { revalidate }`로 캐싱 제어 가능. */
export function udGet<T = unknown>(
  path: string,
  opts?: { cache?: RequestCache; next?: NextFetchOptions },
): Promise<T> {
  return underduckFetch<T>(path, { method: "GET", ...opts });
}

export function udPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  return underduckFetch<T>(path, { method: "POST", body });
}

export function udPatch<T = unknown>(path: string, body?: unknown): Promise<T> {
  return underduckFetch<T>(path, { method: "PATCH", body });
}

export function udPut<T = unknown>(path: string, body?: unknown): Promise<T> {
  return underduckFetch<T>(path, { method: "PUT", body });
}

export function udDelete<T = unknown>(path: string, body?: unknown): Promise<T> {
  return underduckFetch<T>(path, { method: "DELETE", body });
}
