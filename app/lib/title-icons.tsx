// app/lib/title-icons.tsx
// 칭호 icon(kebab 문자열) → lucide-react 컴포넌트 매핑.
// 트리쉐이킹: 실제 쓰는 아이콘만 import 됩니다.

import { forwardRef } from "react";
import {
  Hand, ShieldCheck, Footprints, Goal, Volleyball, Spline, Crown,
  CalendarCheck, TrendingUp, PartyPopper, Crosshair, GitFork, Star,
  Shuffle, Boxes, BrickWall, Target, HandMetal, Flame, BatteryFull,
  BadgeCheck, Sprout, RotateCcw, CloudRain, Umbrella, Sun, Snowflake,
  CloudLightning, Swords, Lock, Rocket, Sparkles, Vote, MessageCircle,
  AlarmClock, Activity, MessageSquarePlus, HeartHandshake, Handshake,
  Zap, Infinity as InfinityIcon, Trophy, Shield, Sword,
  Medal, Award, ClipboardList, CalendarHeart, WandSparkles, Droplets,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/**
 * 넥타이 — lucide 에 없어서 직접 그렸다. 감독 전용.
 *
 * 매듭(위)과 아래로 좁아지는 날(아래) 두 조각이다. 날을 얇게 그리면 12px 에서
 * 선 하나로 뭉개져서, 방패 안쪽 폭을 거의 다 쓰도록 넉넉히 잡았다.
 * lucide 와 같은 24 그리드·같은 stroke 규약을 따라야 다른 아이콘과 굵기가 맞는다.
 */
const Tie: LucideIcon = forwardRef<SVGSVGElement, LucideProps>(function Tie(
  { size = 24, strokeWidth = 2, color = "currentColor", ...rest },
  ref,
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="M8.4 2.4h7.2l1.3 4.3-4.9 2.4-4.9-2.4z" />
      <path d="M10.1 9.6 8.6 17.1 12 21.8l3.4-4.7-1.5-7.5z" />
    </svg>
  );
}) as LucideIcon;

const ICONS: Record<string, LucideIcon> = {
  tie: Tie,
  hand: Hand,
  "shield-check": ShieldCheck,
  footprints: Footprints,
  goal: Goal,
  volleyball: Volleyball,
  spline: Spline,
  crown: Crown,
  "calendar-check": CalendarCheck,
  "trending-up": TrendingUp,
  "party-popper": PartyPopper,
  crosshair: Crosshair,
  "git-fork": GitFork,
  star: Star,
  shuffle: Shuffle,
  boxes: Boxes,
  "brick-wall": BrickWall,
  target: Target,
  "hand-metal": HandMetal,
  flame: Flame,
  "battery-full": BatteryFull,
  "badge-check": BadgeCheck,
  sprout: Sprout,
  "rotate-ccw": RotateCcw,
  "cloud-rain": CloudRain,
  umbrella: Umbrella,
  sun: Sun,
  snowflake: Snowflake,
  "cloud-lightning": CloudLightning,
  sword: Sword,
  swords: Swords,
  lock: Lock,
  rocket: Rocket,
  sparkles: Sparkles,
  vote: Vote,
  "message-circle": MessageCircle,
  "alarm-clock": AlarmClock,
  activity: Activity,
  "message-square-plus": MessageSquarePlus,
  "heart-handshake": HeartHandshake,
  handshake: Handshake,
  zap: Zap,
  infinity: InfinityIcon,
  trophy: Trophy,
  medal: Medal,
  award: Award,
  "clipboard-list": ClipboardList,
  "calendar-heart": CalendarHeart,
  "wand-sparkles": WandSparkles,
  droplets: Droplets,
};

export function titleIcon(name: string): LucideIcon {
  return ICONS[name] ?? Shield;
}

/** 칭호 아이콘 한 개. 정적 맵에서 꺼내 쓰는 것뿐인데, 호출부에서 `const Icon = titleIcon(...)`
 *  으로 받으면 "렌더 중에 컴포넌트를 만든다"로 잡힌다. 꺼내는 곳을 여기로 모은다. */
export function TitleIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Shield;
  return <Icon {...props} />;
}
