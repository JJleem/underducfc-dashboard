"use client";
// 전술게시판 목록 — 인스타 릴스 탭 문법.
//
// 3열 9:16 그리드에 정지 썸네일만 깐다. 자동재생은 하지 않는다.
//   · 인스타 릴스는 임베드 자동재생이 막혀 있고 우리가 가진 건 썸네일 한 장뿐이다
//   · 유튜브는 muted 자동재생이 되지만 칸마다 iframe 을 띄워야 해서
//     스무 개면 모바일 스크롤이 버벅인다
//   · iOS 저전력 모드에서는 자동재생 자체가 차단된다
// 인스타 릴스 탭도 같은 이유로 그리드에서는 정지 화면 + 재생 아이콘만 보여준다.
//
// 렉을 만드는 건 이미지 개수가 아니라 "한 번에 그리는 양"이라, 화면 밖 칸은
// content-visibility 로 렌더를 미루고 이미지는 lazy 로 받는다.

import Link from "next/link";
import { Eye, Heart, Instagram, LayoutGrid, MessageCircle, Pin, Play } from "lucide-react";
import LineupMini from "../components/LineupMini";
import { youtubeThumb } from "../lib/youtube";
import { instagramMedia } from "../lib/instagram";
import type { BoardPost } from "../lib/board";

const DAY = 24 * 60 * 60 * 1000;

/**
 * "2026-08-03T23:51:41Z" → "방금 · 3시간 전 · 어제 · 3일 전 · 8/1"
 * 게시판은 최신 글이 위로 오는 화면이라 며칠 안쪽은 상대시간이 훨씬 빨리 읽힌다.
 */
function relativeTime(raw: string | null): string {
  if (!raw) return "";
  const then = new Date(raw);
  if (isNaN(then.getTime())) return "";
  const min = Math.floor((Date.now() - then.getTime()) / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day === 1) return "어제";
  if (day < 7) return `${day}일 전`;
  return `${then.getMonth() + 1}/${then.getDate()}`;
}

function isFresh(raw: string | null): boolean {
  if (!raw) return false;
  const t = new Date(raw).getTime();
  return !isNaN(t) && Date.now() - t < DAY;
}

/** 출처 뱃지 — 어떤 종류인지 한눈에. 라인업은 초록 필드라 색으로도 구분된다. */
function SourceBadge({ kind }: { kind: "youtube" | "instagram" | "lineup" }) {
  const map = {
    youtube: { Icon: Play, label: "영상" },
    instagram: { Icon: Instagram, label: "릴스" },
    lineup: { Icon: LayoutGrid, label: "전술" },
  } as const;
  const { Icon, label } = map[kind];
  return (
    <span className="flex items-center gap-0.5 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-black text-white backdrop-blur-[2px]">
      <Icon width={9} height={9} strokeWidth={2.6} />
      {label}
    </span>
  );
}

function Cell({ post }: { post: BoardPost }) {
  const thumb = post.lineup ? null : youtubeThumb(post.youtubeUrl);
  const insta = post.lineup ? null : instagramMedia(post.youtubeUrl);
  const kind = post.lineup ? "lineup" : insta ? "instagram" : "youtube";
  // 수정된 글은 수정 시각이 곧 "새 소식"이다. 없으면 등록 시각을 쓴다.
  const stamp = post.updatedAt ?? post.createdAt;
  const fresh = isFresh(stamp);
  const edited = !!post.updatedAt;

  return (
    <Link
      href={`/board/${post.id}`}
      // content-visibility: 화면 밖 칸은 그리지 않는다. 스무 칸이 한 번에 레이아웃되는 걸 막는다.
      // contain-intrinsic-size 가 없으면 스크롤바가 튀므로 예상 높이를 같이 준다.
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 180px" }}
      className="relative block aspect-[9/16] overflow-hidden bg-gray-100 active:opacity-80 dark:bg-white/[0.04]"
    >
      {post.lineup ? (
        <LineupMini
          formation={post.lineup.quarters[0]?.formation ?? ""}
          positions={post.lineup.quarters[0]?.positions}
        />
      ) : thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : insta ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/board/insta-thumb?code=${insta.code}&kind=${insta.kind}`}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full items-center justify-center text-gray-300 dark:text-white/20">
          <Play width={22} height={22} strokeWidth={2} />
        </span>
      )}

      <div className="absolute left-1.5 top-1.5 flex items-center gap-1">
        <SourceBadge kind={kind} />
        {post.lineup && post.lineup.quarters.length > 1 && (
          <span className="rounded bg-black/55 px-1 py-0.5 text-[9px] font-black text-white backdrop-blur-[2px]">
            {post.lineup.quarters.length}Q
          </span>
        )}
      </div>

      {/* 고정 핀 — 오른쪽 위 */}
      {post.pinned && (
        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF8FA3] text-white">
          <Pin width={10} height={10} strokeWidth={2.6} className="fill-current" />
        </span>
      )}

      {/* NEW · 수정 — 고정 핀이 있으면 아래로 밀어준다 */}
      {fresh ? (
        <span className={`absolute right-1.5 ${post.pinned ? "top-8" : "top-1.5"} rounded bg-[#FF8FA3] px-1.5 py-0.5 text-[9px] font-black tracking-wide text-white`}>
          NEW
        </span>
      ) : edited ? (
        <span className={`absolute right-1.5 ${post.pinned ? "top-8" : "top-1.5"} rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-white backdrop-blur-[2px]`}>
          수정
        </span>
      ) : null}

      {/* 하단 그라디언트 위에 제목과 반응. 릴스 탭이 조회수를 놓는 자리다. */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-1.5 pb-1.5 pt-7">
        <p className="line-clamp-2 text-[10.5px] font-black leading-[1.3] text-white">
          {post.title}
        </p>
        {/* 작성자 + 시각 — 누가 언제 올렸는지. 칸이 좁아 한 줄에 붙인다. */}
        <p className="mt-0.5 truncate text-[9.5px] font-bold text-white/55">
          {post.author}
          {stamp && (
            <>
              <span className="text-white/25"> · </span>
              {relativeTime(stamp)}
            </>
          )}
        </p>
        <p className="mt-1 flex items-center gap-2 text-[9.5px] font-bold text-white/70">
          {post.likeCount > 0 && (
            <span className="flex items-center gap-0.5">
              <Heart
                width={9}
                height={9}
                strokeWidth={2.6}
                className={post.likedByMe ? "fill-current text-[#FFB6C1]" : ""}
              />
              <span className="tabular-nums">{post.likeCount}</span>
            </span>
          )}
          {post.commentCount > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageCircle width={9} height={9} strokeWidth={2.6} />
              <span className="tabular-nums">{post.commentCount}</span>
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <Eye width={9} height={9} strokeWidth={2.6} />
            <span className="tabular-nums">{post.viewCount}</span>
          </span>
        </p>
      </div>
    </Link>
  );
}

export default function BoardGrid({ posts }: { posts: BoardPost[] }) {
  return (
    // gap-px — 릴스 탭처럼 칸끼리 붙여 화면을 꽉 채운다
    <div className="animate-fade grid grid-cols-3 gap-px bg-gray-100 dark:bg-white/[0.06]">
      {posts.map((post) => (
        <Cell key={post.id} post={post} />
      ))}
    </div>
  );
}
