// public/sw.js
//
// UNDERDUCK FC 서비스워커 — 푸시 알림 + 앱셸 캐싱.
//
// ⚠️ 데이터는 절대 캐시하지 않는다.
//    경기 점수·투표 결과·게시판 좋아요가 오래된 값으로 보이는 건 최악의 사용자 경험이다.
//    그래서 캐시 대상은 "앱껍데기"뿐 — 빌드 해시가 붙은 /_next/static 과 public 이미지.
//    HTML(문서) 응답은 RSC 데이터를 품고 있어 캐시하지 않고, 오프라인일 때만
//    데이터가 전혀 없는 /offline.html 을 보여준다.
//
// 캐시 이름에 붙은 v1 은 "캐시 전략 버전"이다. 배포마다 올리지 않는다.
//   - /_next/static/* 은 URL에 콘텐츠 해시가 있어 새 빌드는 자연히 새 키가 된다.
//   - 이름을 배포마다 바꾸면 activate 때 구 청크를 지워, 이미 열려 있던 탭이
//     lazy 청크를 못 받아 깨질 수 있다. 그래서 append-only로 둔다.

const SHELL_CACHE = 'udk-shell-v1';
const ASSET_CACHE = 'udk-assets-v1';
// 마지막으로 본 홈 화면. 앱을 켜면 이걸 먼저 띄우고 뒤에서 새로 받는다.
// ⚠️ 팀 데이터가 든 HTML 이다. 로그아웃 때 AppHeader 가 이 캐시를 지운다 — 이름을 바꾸면 거기도 바꾼다.
const HOME_CACHE = 'udk-home-v1';
const KEEP = [SHELL_CACHE, ASSET_CACHE, HOME_CACHE];

const OFFLINE_URL = '/offline.html';

// 로컬 개발에서는 fetch 가로채기를 하지 않는다.
// dev 서버의 /_next/static 은 해시가 안정적이지 않고 HMR이 물려 있어서,
// 캐시가 끼면 코드를 고쳤는데도 옛 화면이 뜨는 혼란이 생긴다. 푸시는 그대로 동작한다.
const IS_LOCAL = ['localhost', '127.0.0.1', '::1'].includes(self.location.hostname);

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // 오프라인 폴백은 항상 최신으로 받아둔다(의존성 없는 단일 HTML).
      await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith('udk-') && !KEEP.includes(n)).map((n) => caches.delete(n))
      );
      // 서비스워커가 깨어나는 동안 네비게이션 요청을 미리 보내 둔다(앱 실행 지연 제거).
      if (!IS_LOCAL && self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })()
  );
});

/** 빌드 해시가 붙은 불변 정적 자산 → 캐시 우선. */
function isImmutableAsset(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/fonts/');
}

/**
 * 홈: 서버가 "저장본과 같은 빌드"라고 확인해 준 경우에만 저장본을 내준다.
 *
 * proxy.ts 가 로그인된 응답에 x-ud-build(배포 id)를 붙인다. 응답 헤더만 오면 비교할 수 있으므로
 * 본문(백엔드 조회·렌더)을 기다리지 않고 저장본을 띄울 수 있다. 화면 갱신은 HomeFreshness 가 한다.
 *
 * ⚠️ 옛 빌드의 저장본은 절대 내주면 안 된다. 그 화면이 최신 데이터를 받는 순간 Next 가 빌드 불일치를
 *    감지해 페이지를 통째로 새로고침하고, 새로고침에도 저장본이 나가면 그게 반복돼 스크롤이 계속
 *    맨 위로 튄다(실제로 겪었다). 그래서 서버 확인 없이 저장본을 쓰는 건 오프라인·서버 오류일 때뿐이다.
 *
 * 헤더가 없으면(로그인 화면) 저장본을 지운다. 예전 서비스워커가 보던 x-ud-authed 를 더 보내지 않는
 * 것도 같은 이유다 — 아직 갱신 안 된 폰의 옛 서비스워커가 저장본을 스스로 지우게 된다.
 */
async function homeResponse(event) {
  const cache = await caches.open(HOME_CACHE);
  const hit = await cache.match('/');
  let res;
  try {
    res = (await event.preloadResponse) ?? (await fetch(event.request));
  } catch (err) {
    if (hit) return hit;
    throw err;
  }
  if (!res.ok || res.redirected) return res.status >= 500 && hit ? hit : res;

  const build = res.headers.get('x-ud-build');
  if (!build) {
    await cache.delete('/');
    return res;
  }
  const sameBuild = !!hit && hit.headers.get('x-ud-build') === build;
  event.waitUntil(cache.put('/', res.clone()).catch(() => {}));
  return sameBuild ? hit : res;
}

async function offlinePage() {
  const cache = await caches.open(SHELL_CACHE);
  return (
    (await cache.match(OFFLINE_URL)) ??
    new Response('오프라인입니다.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  );
}

/** public 폴더 이미지·폰트 → 있으면 즉시 쓰고 뒤에서 갱신. */
function isPublicAsset(url) {
  return /\.(?:png|jpe?g|webp|avif|gif|svg|ico|woff2?)$/i.test(url.pathname);
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  if (hit) return hit;
  const res = await network;
  if (res) return res;
  return new Response('', { status: 504, statusText: 'offline' });
}

self.addEventListener('fetch', (event) => {
  if (IS_LOCAL) return;

  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // 외부 도메인은 손대지 않음

  // 데이터 경로는 절대 캐시하지 않는다.
  if (url.pathname.startsWith('/api/')) return;

  // 문서 요청: 홈만 저장본을 먼저 띄우고, 나머지는 항상 네트워크.
  // 실패(= 오프라인)일 때만 폴백 화면.
  if (request.mode === 'navigate') {
    if (url.pathname === '/' && !url.search) {
      event.respondWith(homeResponse(event).catch(offlinePage));
      return;
    }

    event.respondWith(
      (async () => (await event.preloadResponse) ?? (await fetch(request)))().catch(offlinePage)
    );
    return;
  }

  // RSC 페이로드(?_rsc=…)도 데이터다 — 캐시 금지.
  if (url.searchParams.has('_rsc')) return;

  if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isPublicAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// ── 푸시 알림 (기존 동작 유지) ────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'UNDERDUCK FC', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      const url = event.notification.data?.url || '/';
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
