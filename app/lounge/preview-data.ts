// 백엔드(lounge 테이블)가 아직 없어서 화면을 볼 수 없다. `/lounge?preview=1` 로 들어오면
// 이 가짜 데이터로 그린다. 홈의 `/home-preview` 와 같은 취지다.
//
// ⚠️ 백엔드가 붙으면 이 파일과 page.tsx 두 곳의 `preview` 분기를 지운다.
import type { LoungePostDetail } from "../lib/lounge";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const PREVIEW_POSTS: LoungePostDetail[] = [
  {
    id: 3,
    category: "suggestion",
    icon: "thinking",
    title: "회비 납부일 좀 앞당기면 안 될까요",
    body: "월말에 몰려서 다들 잊어버리는 것 같아요.\n월 초로 옮기면 구장비 정산도 편할 것 같습니다.",
    status: "received",
    authorLabel: "익명",
    author: null,
    mine: true,
    commentCount: 2,
    likeCount: 3,
    likedByMe: true,
    adminReply: null,
    adminReplyAuthor: null,
    adminReplyAt: null,
    createdAt: hoursAgo(5),
    comments: [
      { id: 31, parentId: null, authorLabel: "물갈퀴", author: null, mine: false, message: "저도 매번 까먹어요 ㅋㅋ", emoticon: "me-too", createdAt: hoursAgo(4) },
      { id: 32, parentId: 31, authorLabel: "글쓴이", author: null, mine: true, message: "그쵸 저만 그런 게 아니었네요", emoticon: null, createdAt: hoursAgo(3) },
    ],
  },
  {
    id: 2,
    category: "suggestion",
    icon: "cry",
    title: "구장 주차가 너무 빡세요",
    body: "8시 경기인데 7시 반에 가도 자리가 없습니다. 근처에 댈 데도 마땅치 않아요.",
    status: "resolved",
    authorLabel: "익명",
    author: null,
    mine: false,
    commentCount: 4,
    likeCount: 11,
    likedByMe: false,
    adminReply: "구장 측과 얘기해서 8시 이후에는 뒷문 주차장을 열어두기로 했습니다.\n다음 경기부터 적용돼요.",
    adminReplyAuthor: "이재준",
    adminReplyAt: hoursAgo(30),
    createdAt: hoursAgo(24 * 9),
    comments: [
      { id: 21, parentId: null, authorLabel: "물갈퀴", author: null, mine: false, message: "진짜 이거 해결됐으면", emoticon: null, createdAt: hoursAgo(24 * 8) },
      { id: 22, parentId: null, authorLabel: "하프타임간식", author: null, mine: false, message: "저는 그냥 대중교통 타요", emoticon: null, createdAt: hoursAgo(24 * 8) },
      { id: 23, parentId: 21, authorLabel: "글쓴이", author: null, mine: false, message: "오 빠르네요 감사합니다", emoticon: "sorry", createdAt: hoursAgo(29) },
      { id: 24, parentId: null, authorLabel: "물갈퀴", author: null, mine: false, message: "", emoticon: "fire", createdAt: hoursAgo(28) },
    ],
  },
  {
    id: 1,
    category: "chat",
    icon: null,
    title: "다들 축구화 뭐 신으세요?",
    body: "인조잔디에서 자꾸 미끄러져서 바꾸려고요. 추천 좀 부탁드립니다.",
    status: "received",
    authorLabel: "익명",
    author: null,
    mine: false,
    commentCount: 7,
    likeCount: 5,
    likedByMe: true,
    adminReply: null,
    adminReplyAuthor: null,
    adminReplyAt: null,
    createdAt: hoursAgo(24 * 11),
    comments: [
      { id: 11, parentId: null, authorLabel: "물갈퀴", author: null, mine: false, message: "TF 밑창으로 가세요", emoticon: null, createdAt: hoursAgo(24 * 11) },
      { id: 12, parentId: null, authorLabel: "하프타임간식", author: null, mine: false, message: "저는 그냥 HG 신는데 괜찮아요", emoticon: "laugh", createdAt: hoursAgo(24 * 10) },
    ],
  },
];
