// app/lib/title-icons.tsx
// 칭호 icon(kebab 문자열) → lucide-react 컴포넌트 매핑.
// 트리쉐이킹: 실제 쓰는 아이콘만 import 됩니다.

import {
  Hand, ShieldCheck, Footprints, Goal, Volleyball, Spline, Crown,
  CalendarCheck, TrendingUp, PartyPopper, Crosshair, GitFork, Star,
  Shuffle, Boxes, BrickWall, Target, HandMetal, Flame, BatteryFull,
  BadgeCheck, Sprout, RotateCcw, CloudRain, Umbrella, Sun, Snowflake,
  CloudLightning, Swords, Lock, Rocket, Sparkles, Vote, MessageCircle,
  AlarmClock, Activity, MessageSquarePlus, HeartHandshake, Handshake,
  Zap, Infinity as InfinityIcon, Trophy, Shield,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
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
};

export function titleIcon(name: string): LucideIcon {
  return ICONS[name] ?? Shield;
}
