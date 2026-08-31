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

export interface UnderduckIdentity {
  userId: string;
  isAdmin?: boolean;
}

interface UnderduckRequest {
  method?: HttpMethod;
  /** JSON으로 직렬화해 보낼 본문. 생략 시 본문 없음. */
  body?: unknown;
  /** 기본 no-store. `next`를 넘기면 cache 대신 next 옵션이 적용된다. */
  cache?: RequestCache;
  next?: NextFetchOptions;
  /**
   * 신원 헤더를 붙이지 않는다. 로그인 과정에서 부르는 호출에만 쓴다
   * (세션이 아직 없거나, auth() → jwt 콜백 → 이 함수로 재귀가 도는 경로).
   */
  anonymous?: boolean;
  /** 이미 세션을 읽은 API 라우트가 넘기는 신원. auth()를 다시 호출하지 않는다. */
  identity?: UnderduckIdentity;
  /**
   * GET 에도 신원 헤더를 붙인다. 응답이 "누가 보느냐"에 따라 달라져야 하는 읽기에만
   * 쓴다(사랑방: 익명 라벨·내 글 여부·운영진에게만 주는 실명). 캐시 키가 사용자별로
   * 쪼개지므로 반드시 cache: "no-store" 와 함께 쓴다.
   */
  withIdentity?: boolean;
}

/**
 * 세션 신원을 헤더로 만든다.
 *
 * 백엔드의 공유 시크릿은 "어느 서비스가 불렀나"만 증명한다. "어떤 사용자가, 무슨
 * 권한으로"는 이 헤더로 전달하고, 백엔드는 요청 **본문**의 kakao_id 대신 이 값으로
 * 소유권·관리자 검사를 한다(본문은 클라이언트가 조작할 수 있으므로).
 *
 * `@/auth`가 (sheets-write 경유로) 이 모듈을 다시 import 하므로 정적 순환이 생긴다.
 * 동적 import로 끊는다.
 */
async function identityHeaders(): Promise<Record<string, string>> {
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    const user = session?.user as { kakaoId?: string; isAdmin?: boolean } | undefined;
    if (!user?.kakaoId) return {};
    return {
      "X-Underduck-User": user.kakaoId,
      "X-Underduck-Role": user.isAdmin ? "admin" : "member",
    };
  } catch {
    // 세션을 읽을 수 없는 문맥(빌드 타임 렌더링 등)에서는 신원 없이 진행한다.
    return {};
  }
}

/**
 * underduck 백엔드 호출 코어. `path`는 "/api/underduck/..." 형식을 기대한다.
 * 429/5xx 같은 일시적 오류는 짧게 재시도한다(google-sheets 읽기 패턴과 동일).
 */
export async function underduckFetch<T = unknown>(
  path: string,
  { method = "GET", body, cache = "no-store", next, anonymous, identity, withIdentity }: UnderduckRequest = {},
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

  // 신원 헤더는 **쓰기에만** 붙인다.
  // 읽기(GET)는 udReadOpts의 next.revalidate로 캐싱되는데, 사용자마다 달라지는 헤더를
  // 얹으면 fetch 캐시 키가 사용자별로 쪼개지고 정적 렌더링이 동적으로 바뀐다.
  // 권한 검사가 필요한 건 쓰기·삭제이므로 읽기는 지금 그대로 둔다.
  // withIdentity 를 켠 읽기만 예외 — 응답 자체가 사용자별로 달라야 하는 경우다.
  const needsIdentity = !anonymous && (method !== "GET" || !!withIdentity);

  const headers: Record<string, string> = {
    "X-Underduck-Secret": secret,
    ...(needsIdentity
      ? identity
        ? {
            "X-Underduck-User": identity.userId,
            "X-Underduck-Role": identity.isAdmin ? "admin" : "member",
          }
        : await identityHeaders()
      : {}),
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
    // 백엔드가 준 원인은 서버 내부 로그에만 묻지 말고 호출 라우트까지 전달한다.
    // HTML 오류 페이지는 사용자에게 노출하지 않는다.
    let reason = "";
    if (detail && !/^\s*</.test(detail)) {
      try {
        const parsed = JSON.parse(detail) as { detail?: unknown; error?: unknown; message?: unknown };
        reason = String(parsed.detail ?? parsed.error ?? parsed.message ?? "").trim();
      } catch {
        reason = detail.trim();
      }
    }
    throw new Error(
      reason
        ? `underduck 요청 실패: ${reason}`
        : `underduck 요청 실패: ${method} ${normalized} (${status})`,
    );
  }

  // 204 No Content 등 본문 없는 응답 대응
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/**
 * 값이 백엔드 가명 ID(pid)인가. pid = HMAC-SHA256 hex 64자.
 * 카카오 원본 ID는 10자리 안팎의 숫자라 겹치지 않는다.
 */
export function isPseudonym(value?: string | null): boolean {
  return !!value && /^[0-9a-f]{64}$/.test(value);
}

/**
 * 카카오 원본 ID → 백엔드 가명 ID(pid).
 *
 * 백엔드는 kakao_id를 원본으로 저장하지 않고 pid로만 다룬다. 프론트도 세션에 pid를
 * 담아야 소유권 비교(`currentUser.kakaoId === post.kakaoId`)가 성립한다.
 * 세션을 수립하는 도중에 부르므로 신원 헤더를 붙이지 않는다(재귀 방지).
 *
 * 원본 ID는 반드시 **본문**으로 보낸다. 쿼리스트링에 실으면 nginx access log에
 * 평문으로 남아, DB에서 원본을 없앤 의미가 사라진다.
 */
export async function resolvePseudonym(rawKakaoId: string): Promise<string> {
  const { kakao_id } = await underduckFetch<{ kakao_id: string }>(
    "/api/underduck/users/resolve",
    { method: "POST", body: { kakao_id: rawKakaoId }, anonymous: true },
  );
  return kakao_id;
}

/** GET. 읽기는 server component에서 `next: { revalidate }`로 캐싱 제어 가능. */
export function udGet<T = unknown>(
  path: string,
  opts?: { cache?: RequestCache; next?: NextFetchOptions; withIdentity?: boolean },
): Promise<T> {
  return underduckFetch<T>(path, { method: "GET", ...opts });
}

export function udPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  return underduckFetch<T>(path, { method: "POST", body });
}

export function udPatch<T = unknown>(path: string, body?: unknown): Promise<T> {
  return underduckFetch<T>(path, { method: "PATCH", body });
}

export function udPut<T = unknown>(
  path: string,
  body?: unknown,
  identity?: UnderduckIdentity,
): Promise<T> {
  return underduckFetch<T>(path, { method: "PUT", body, identity });
}

export function udDelete<T = unknown>(path: string, body?: unknown): Promise<T> {
  return underduckFetch<T>(path, { method: "DELETE", body });
}
