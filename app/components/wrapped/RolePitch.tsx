"use client";

// 역할 버블 피치 — 프로필의 POSITION IDENTITY(MiniPitch)를 래핑 톤으로 옮긴 것.
//
// 막대 목록만 두면 "어디서 뛰었나" 가 숫자로만 남는다. 좌표에 버블을 찍으면
// 왼쪽에 쏠렸는지 중앙에 모였는지가 한눈에 읽힌다. 크기 = 그 자리 비중.
//
// 프로필 버전과 다른 점은 배경뿐이다(래핑은 항상 다크). 좌표·크기 규칙은 같게 둬서
// 두 화면이 같은 그림으로 보이게 한다.

import { roleColor } from "../../lib/positions";
import type { RoleShare } from "../../lib/wrapped";

export default function RolePitch({ roles }: { roles: RoleShare[] }) {
  return (
    <div className="relative aspect-[0.78] w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(180deg,#111b2c,#0b1423)]">
      <div className="absolute inset-[7%] rounded-sm border border-white/20" />
      <div className="absolute left-[7%] right-[7%] top-1/2 border-t border-white/20" />
      <div className="absolute left-1/2 top-1/2 aspect-square h-[17%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
      <div className="absolute left-[31%] right-[31%] top-[7%] h-[14%] border-x border-b border-white/20" />
      <div className="absolute bottom-[7%] left-[31%] right-[31%] h-[14%] border-x border-t border-white/20" />
      {roles.map((r, i) => {
        const size = 22 + Math.min(r.percent, 55) * 0.28;
        return (
          <div
            key={r.role}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#101522] shadow-[0_5px_14px_-5px_rgba(0,0,0,0.55)]"
            style={{
              left: `${r.x}%`,
              top: `${r.y}%`,
              width: size,
              height: size,
              background: roleColor(r.role as never),
              // 비중이 낮은 자리일수록 흐리게 — 주 포지션이 먼저 눈에 든다
              opacity: Math.max(0.45, 1 - i * 0.12),
            }}
          >
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[7px] font-black text-white">
              {r.role}
            </span>
          </div>
        );
      })}
    </div>
  );
}
