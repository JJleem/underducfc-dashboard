// 라인업 좌표 ↔ 포지션 파생 단일 소스.
//
// 좌표계: x = 0(왼쪽) ~ 100(오른쪽), y = 0(상대 골대) ~ 100(우리 골대).
// 프리셋 좌표는 FormationField가 쓰던 값을 그대로 옮긴 것이라 기존 화면과 동일하게 그려진다.
//
// ⚠️ 밴드 경계를 건드릴 때 지켜야 하는 불변식:
//    좌표 → 포지션 그룹(GK/DF/MF/FW) 결과가 프리셋 11칸 × 7포메이션 = 77칸 전부
//    titles.ts가 쓰던 (슬롯 인덱스, 포메이션) 규칙과 같아야 한다.
//    과거 라인업은 좌표가 없어 프리셋으로 폴백되므로, 이 일치가 곧 칭호·마이페이지 하위호환이다.

export interface Point {
  x: number;
  y: number;
}

export const FORMATION_PRESETS: Record<string, Point[]> = {
  "4-3-3": [
    { x: 50, y: 88 },
    { x: 12, y: 70 }, { x: 36, y: 70 }, { x: 64, y: 70 }, { x: 88, y: 70 },
    { x: 22, y: 48 }, { x: 50, y: 46 }, { x: 78, y: 48 },
    { x: 16, y: 22 }, { x: 50, y: 18 }, { x: 84, y: 22 },
  ],
  "4-4-2": [
    { x: 50, y: 88 },
    { x: 12, y: 70 }, { x: 36, y: 70 }, { x: 64, y: 70 }, { x: 88, y: 70 },
    { x: 12, y: 48 }, { x: 36, y: 48 }, { x: 64, y: 48 }, { x: 88, y: 48 },
    { x: 34, y: 22 }, { x: 66, y: 22 },
  ],
  "3-5-2": [
    { x: 50, y: 88 },
    { x: 22, y: 70 }, { x: 50, y: 70 }, { x: 78, y: 70 },
    { x: 8, y: 50 }, { x: 28, y: 50 }, { x: 50, y: 48 }, { x: 72, y: 50 }, { x: 92, y: 50 },
    { x: 34, y: 22 }, { x: 66, y: 22 },
  ],
  "4-2-3-1": [
    { x: 50, y: 88 },
    { x: 12, y: 72 }, { x: 36, y: 72 }, { x: 64, y: 72 }, { x: 88, y: 72 },
    { x: 32, y: 56 }, { x: 68, y: 56 },
    { x: 14, y: 38 }, { x: 50, y: 36 }, { x: 86, y: 38 },
    { x: 50, y: 18 },
  ],
  "3-4-3": [
    { x: 50, y: 88 },
    { x: 22, y: 70 }, { x: 50, y: 70 }, { x: 78, y: 70 },
    { x: 12, y: 50 }, { x: 36, y: 50 }, { x: 64, y: 50 }, { x: 88, y: 50 },
    { x: 16, y: 22 }, { x: 50, y: 18 }, { x: 84, y: 22 },
  ],
  "5-3-2": [
    { x: 50, y: 88 },
    { x: 8, y: 70 }, { x: 26, y: 70 }, { x: 50, y: 70 }, { x: 74, y: 70 }, { x: 92, y: 70 },
    { x: 22, y: 48 }, { x: 50, y: 46 }, { x: 78, y: 48 },
    { x: 34, y: 22 }, { x: 66, y: 22 },
  ],
  "4-1-4-1": [
    { x: 50, y: 88 },
    { x: 12, y: 74 }, { x: 36, y: 74 }, { x: 64, y: 74 }, { x: 88, y: 74 },
    { x: 50, y: 60 },
    { x: 10, y: 44 }, { x: 34, y: 44 }, { x: 66, y: 44 }, { x: 90, y: 44 },
    { x: 50, y: 18 },
  ],
};

export type PosGroup = "GK" | "DF" | "MF" | "FW";

export type Role =
  | "GK"
  | "LB" | "LCB" | "CB" | "RCB" | "RB"
  | "LWB" | "LDM" | "CDM" | "RDM" | "RWB"
  | "LM" | "LCM" | "CM" | "RCM" | "RM"
  | "LAM" | "CAM" | "RAM"
  | "LW" | "LF" | "LS" | "ST" | "CF" | "RS" | "RF" | "RW";

// y 밴드 경계 (0 = 상대 골대, 100 = 우리 골대).
// 프리셋 y값(88 / 74·72·70 / 60·56 / 50·48·46·44 / 38·36 / 22·18)이
// 각각 의도한 밴드에 떨어지도록 잡았다.
const BAND_GK = 80;   // 이상 → GK
const BAND_DEF = 65;  // 65~80 수비 라인
const BAND_DM = 56;   // 56~65 수비형 (윙백·DM)
const BAND_MID = 44;  // 44~56 중원
const BAND_AM = 34;   // 34~44 공격형, 미만은 최전방

// 가로 분할 경계. 구간은 전부 [시작, 끝) 반열림이라 존 오버레이 사각형과 정확히 일치한다.
const LANE5_EDGES = [18, 38, 62, 82];

const laneOf = (x: number, edges: number[]) => {
  const i = edges.findIndex((edge) => x < edge);
  return i === -1 ? edges.length : i;
};

// 최전방은 좌우 윙(LW/RW)이 밴드 전체 높이를 쓰고,
// 가운데 3칸만 앞줄(LS·ST·RS)과 처진 줄(LF·CF·RF)로 한 번 더 나뉜다.
const FW_WING_EDGES = [18, 82];
const FW_CORE_EDGES = [39, 61];
const FW_FRONT: Role[] = ["LS", "ST", "RS"];
const FW_DEEP: Role[] = ["LF", "CF", "RF"];
// 앞줄과 처진 줄을 가르는 높이
const CF_LINE = 24;

const DEF_LANES: Role[] = ["LB", "LCB", "CB", "RCB", "RB"];
const DM_LANES: Role[] = ["LWB", "LDM", "CDM", "RDM", "RWB"];
const MID_LANES: Role[] = ["LM", "LCM", "CM", "RCM", "RM"];
// 공격형 라인의 좌우 끝은 관례상 LM/RM으로 부른다 (4-2-3-1 좌우 2선)
const AM_LANES: Role[] = ["LM", "LAM", "CAM", "RAM", "RM"];

/** 좌표 → 세부 포지션 (LB, LCM, ST …) */
export function roleFromPoint({ x, y }: Point): Role {
  if (y >= BAND_GK) return "GK";
  if (y >= BAND_DEF) return DEF_LANES[laneOf(x, LANE5_EDGES)];
  if (y >= BAND_DM) return DM_LANES[laneOf(x, LANE5_EDGES)];
  if (y >= BAND_MID) return MID_LANES[laneOf(x, LANE5_EDGES)];
  if (y >= BAND_AM) return AM_LANES[laneOf(x, LANE5_EDGES)];
  const wing = laneOf(x, FW_WING_EDGES);
  if (wing === 0) return "LW";
  if (wing === 2) return "RW";
  const core = laneOf(x, FW_CORE_EDGES);
  return y >= CF_LINE ? FW_DEEP[core] : FW_FRONT[core];
}

/**
 * 포지션이 바뀌는 경계를 화면에 그리기 위한 사각형 목록.
 * roleFromPoint와 같은 상수에서 만들어지므로 표시와 판정이 어긋날 수 없다.
 */
export interface Zone {
  role: Role;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

function bandZones(roles: Role[], edges: number[], y0: number, y1: number): Zone[] {
  const bounds = [0, ...edges, 100];
  return roles.map((role, i) => ({ role, x0: bounds[i], x1: bounds[i + 1], y0, y1 }));
}

export const POSITION_ZONES: Zone[] = [
  { role: "GK", x0: 0, x1: 100, y0: BAND_GK, y1: 100 },
  ...bandZones(DEF_LANES, LANE5_EDGES, BAND_DEF, BAND_GK),
  ...bandZones(DM_LANES, LANE5_EDGES, BAND_DM, BAND_DEF),
  ...bandZones(MID_LANES, LANE5_EDGES, BAND_MID, BAND_DM),
  ...bandZones(AM_LANES, LANE5_EDGES, BAND_AM, BAND_MID),
  // 최전방: 좌우 윙은 통짜, 가운데 3칸은 앞줄/처진 줄 2단
  { role: "LW", x0: 0, x1: FW_WING_EDGES[0], y0: 0, y1: BAND_AM },
  { role: "RW", x0: FW_WING_EDGES[1], x1: 100, y0: 0, y1: BAND_AM },
  ...FW_FRONT.map((role, i) => ({
    role,
    x0: [FW_WING_EDGES[0], ...FW_CORE_EDGES][i],
    x1: [...FW_CORE_EDGES, FW_WING_EDGES[1]][i],
    y0: 0,
    y1: CF_LINE,
  })),
  ...FW_DEEP.map((role, i) => ({
    role,
    x0: [FW_WING_EDGES[0], ...FW_CORE_EDGES][i],
    x1: [...FW_CORE_EDGES, FW_WING_EDGES[1]][i],
    y0: CF_LINE,
    y1: BAND_AM,
  })),
];

/** 좌표가 속한 존의 인덱스 (드래그 중 현재 칸 강조용) */
export function zoneIndexOf({ x, y }: Point): number {
  return POSITION_ZONES.findIndex(
    (z) =>
      x >= z.x0 && (x < z.x1 || z.x1 === 100) &&
      y >= z.y0 && (y < z.y1 || z.y1 === 100)
  );
}

const ROLE_GROUP: Record<Role, PosGroup> = {
  GK: "GK",
  LB: "DF", LCB: "DF", CB: "DF", RCB: "DF", RB: "DF",
  LWB: "DF", RWB: "DF",
  LDM: "MF", CDM: "MF", RDM: "MF",
  LM: "MF", LCM: "MF", CM: "MF", RCM: "MF", RM: "MF",
  LAM: "MF", CAM: "MF", RAM: "MF",
  LW: "FW", LF: "FW", LS: "FW", ST: "FW", CF: "FW", RS: "FW", RF: "FW", RW: "FW",
};

/** 센터백 계열 (칭호: 공격적인 센터백 / 리베로) */
export const CENTERBACK_ROLES: Role[] = ["LCB", "CB", "RCB"];
/** 측면 수비 계열 (칭호: 공격적인 윙백) */
export const FULLBACK_ROLES: Role[] = ["LB", "RB", "LWB", "RWB"];

export function groupOfRole(role: Role): PosGroup {
  return ROLE_GROUP[role];
}

export const POS_GROUP_COLOR: Record<PosGroup, string> = {
  GK: "#F59E0B",
  DF: "#3B82F6",
  MF: "#10B981",
  FW: "#FF8FA3",
};

export function roleColor(role: Role): string {
  return POS_GROUP_COLOR[groupOfRole(role)];
}

/**
 * 저장된 좌표 문자열("x,y;x,y;…" 11개)을 파싱한다.
 * 값이 없거나 형식이 깨졌으면 null → 호출부가 프리셋으로 폴백한다.
 */
export function parsePositions(raw?: string | null): Point[] | null {
  if (!raw) return null;
  const points = raw.split(";").map((pair) => {
    const [x, y] = pair.split(",").map(Number);
    if (!isFinite(x) || !isFinite(y)) return null;
    return { x: clamp(x), y: clamp(y) };
  });
  if (points.length !== 11 || points.some((p) => p === null)) return null;
  return points as Point[];
}

export function serializePositions(points: Point[]): string {
  return points.map((p) => `${round1(p.x)},${round1(p.y)}`).join(";");
}

/** 라인업 한 줄의 실제 좌표 (커스텀 없으면 프리셋) */
export function positionsFor(formation: string, custom?: string | null): Point[] {
  return parsePositions(custom) ?? FORMATION_PRESETS[formation] ?? FORMATION_PRESETS["4-3-3"];
}

/** 라인업 한 줄의 11개 포지션 라벨 */
export function rolesFor(formation: string, custom?: string | null): Role[] {
  return positionsFor(formation, custom).map(roleFromPoint);
}

/**
 * 실제 배치에서 포메이션 이름을 만든다 (GK 제외, 빈 줄은 건너뛰고 뒤에서 앞 순서).
 * 7개 프리셋은 자기 이름을 그대로 되돌려주고, 자유 배치면 "4-2-2-2"처럼 실제 모양이 나온다.
 */
export function formationOf(points: Point[]): string {
  const counts = [0, 0, 0, 0, 0]; // 수비 / 수비형 / 중원 / 공격형 / 최전방
  points.forEach(({ y }) => {
    if (y >= BAND_GK) return; // 골키퍼는 이름에 넣지 않는다
    if (y >= BAND_DEF) counts[0]++;
    else if (y >= BAND_DM) counts[1]++;
    else if (y >= BAND_MID) counts[2]++;
    else if (y >= BAND_AM) counts[3]++;
    else counts[4]++;
  });
  return counts.filter((c) => c > 0).join("-");
}

/** 프리셋에서 벗어났는지 (헤더에 "커스텀" 표기용) */
export function isCustomShape(formation: string, custom?: string | null): boolean {
  const points = parsePositions(custom);
  const preset = FORMATION_PRESETS[formation];
  if (!points || !preset) return false;
  return points.some((p, i) => Math.abs(p.x - preset[i].x) > 0.5 || Math.abs(p.y - preset[i].y) > 0.5);
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

// ── 전술 ──

export interface TacticOption {
  id: string;
  label: string;
  desc: string;
}

export const TACTICS: TacticOption[] = [
  { id: "attack", label: "공격적", desc: "라인 올리고 숫자 싸움" },
  { id: "balance", label: "균형", desc: "무난하게 주고받기" },
  { id: "defense", label: "수비적", desc: "라인 내리고 버티기" },
  { id: "counter", label: "역습", desc: "뺏으면 바로 전진" },
  { id: "possession", label: "점유율", desc: "짧게 돌려서 흔들기" },
  { id: "press", label: "압박", desc: "전방부터 강하게 압박" },
];

export function tacticOf(id?: string | null): TacticOption | null {
  if (!id) return null;
  return TACTICS.find((t) => t.id === id) ?? null;
}

// ── 개인 전술 ──
// 선수가 서 있는 위치의 포지션 그룹에 맞는 지시만 고를 수 있다.
// 드래그로 포지션이 바뀌면 맞지 않게 된 지시는 해제된다(에디터에서 처리).

export interface Instruction {
  id: string;
  label: string;
  /** 필드 마커에 겹쳐 쓰는 축약형 (4글자 이내) */
  short: string;
  /** 지정하면 이 세부 포지션에서만 고를 수 있다 (없으면 그룹 전체) */
  roles?: Role[];
}

// 윙을 뺀 중앙 최전방 (타겟터·침투처럼 중앙 스트라이커 전용 지시에 쓴다)
const CENTRAL_FORWARDS: Role[] = ["LS", "ST", "RS", "LF", "CF", "RF"];
const WINGERS: Role[] = ["LW", "RW"];
const DEF_MIDS: Role[] = ["LDM", "CDM", "RDM"];
const FULL_BACKS: Role[] = ["LB", "RB"];

export const INSTRUCTIONS: Record<PosGroup, Instruction[]> = {
  GK: [
    { id: "sweeper", label: "스위퍼키퍼", short: "스위퍼" },
    { id: "hold_line", label: "라인 지키기", short: "라인유지" },
  ],
  DF: [
    { id: "overlap", label: "오버랩핑", short: "오버랩" },
    // 인버티드는 측면 풀백 전용. LCB·CB·RCB에는 노출하지 않는다.
    { id: "inverted", label: "인버티드", short: "인버티드", roles: FULL_BACKS },
    { id: "hold", label: "위치 고수", short: "위치고수" },
    { id: "press", label: "강한 압박", short: "압박" },
    { id: "stay_back", label: "공격 가담 자제", short: "공격자제" },
  ],
  MF: [
    { id: "join_attack", label: "공격 가담", short: "공격가담" },
    { id: "join_defense", label: "수비 가담", short: "수비가담" },
    { id: "side_cover", label: "사이드 커버", short: "사이드", roles: DEF_MIDS },
    { id: "center_cover", label: "중앙 커버", short: "중앙커버", roles: DEF_MIDS },
    { id: "stay_central", label: "중앙 유지", short: "중앙유지" },
    { id: "press_high", label: "전방 압박", short: "전방압박" },
    { id: "free_roam", label: "자유 이동", short: "자유이동" },
  ],
  FW: [
    { id: "target_man", label: "타겟터", short: "타겟터", roles: CENTRAL_FORWARDS },
    // 침투는 중앙 공격수, 윙어는 대각선으로 파고드는 "안으로 침투하기"를 쓴다
    { id: "run_behind", label: "침투", short: "침투", roles: CENTRAL_FORWARDS },
    { id: "cut_inside", label: "안으로 침투하기", short: "안으로", roles: WINGERS },
    { id: "drop_deep", label: "내려서 받기", short: "내려받기" },
    { id: "stay_wide", label: "측면 벌리기", short: "측면벌림" },
    { id: "press_forward", label: "압박 수행", short: "압박" },
  ],
};

/** 이 세부 포지션에서 고를 수 있는 지시 목록 */
export function instructionsFor(role: Role): Instruction[] {
  return INSTRUCTIONS[groupOfRole(role)].filter(
    (i) => !i.roles || i.roles.includes(role)
  );
}

/** 이 세부 포지션에서 고를 수 있는 지시인지 */
export function instructionAllowed(id: string, role: Role): boolean {
  return instructionsFor(role).some((i) => i.id === id);
}

function findInstruction(id?: string | null): Instruction | null {
  if (!id) return null;
  for (const list of Object.values(INSTRUCTIONS)) {
    const found = list.find((i) => i.id === id);
    if (found) return found;
  }
  return null;
}

export function instructionLabel(id?: string | null): string | null {
  return findInstruction(id)?.label ?? null;
}

export function instructionShort(id?: string | null): string | null {
  return findInstruction(id)?.short ?? null;
}

// ── 개인 전술 방향 표시 ──
// 방향이 뜻을 갖는 지시만 마커에 작은 화살표로 보여준다.
// 공격 방향 움직임은 핑크, 수비 방향은 파랑.

export type ArrowDir = "up" | "down" | "left" | "right" | "upLeft" | "upRight";
export type ArrowTone = "attack" | "defense";

export interface InstructionArrow {
  dir: ArrowDir;
  tone: ArrowTone;
}

const LEFT_SIDE: Role[] = ["LB", "LWB", "LDM", "LM", "LAM", "LW", "LF", "LS"];

/** 이 지시를 이 포지션에서 걸었을 때 그려줄 화살표 (없으면 빈 배열) */
export function instructionArrows(id: string, role: Role): InstructionArrow[] {
  const isLeft = LEFT_SIDE.includes(role);
  const attack = (dir: ArrowDir): InstructionArrow[] => [{ dir, tone: "attack" }];
  const defend = (dir: ArrowDir): InstructionArrow[] => [{ dir, tone: "defense" }];

  switch (id) {
    // 수비 → 전진
    case "overlap":
      return attack("up");
    // 인버티드 풀백은 미드필드 안쪽으로 접혀 들어간다
    case "inverted":
      return FULL_BACKS.includes(role) ? attack(isLeft ? "right" : "left") : [];

    // 수비형 미드의 커버 범위
    case "side_cover":
      return role === "CDM"
        ? [{ dir: "left", tone: "defense" }, { dir: "right", tone: "defense" }]
        : defend(isLeft ? "left" : "right");
    case "center_cover":
      // 중앙(CDM)은 이미 가운데라 뒤로 내려가 커버한다
      return role === "CDM" ? defend("down") : defend(isLeft ? "right" : "left");

    // 미드필더 가담
    case "join_attack":
      return attack("up");
    case "join_defense":
      return defend("down");

    // 최전방
    case "run_behind":
      return attack("up");
    case "drop_deep":
      return attack("down");
    case "stay_wide":
      // 중앙 공격수는 양옆, 좌우로 치우친 선수는 자기 쪽으로
      return role === "ST" || role === "CF"
        ? [{ dir: "left", tone: "attack" }, { dir: "right", tone: "attack" }]
        : attack(isLeft ? "left" : "right");
    // 윙어가 대각선으로 골대를 향해 파고든다
    case "cut_inside":
      return attack(isLeft ? "upRight" : "upLeft");

    default:
      return [];
  }
}

/** 슬롯의 지시들을 화살표 목록으로 (같은 방향은 하나로 합친다) */
export function arrowsForSlot(ids: string[], role: Role): InstructionArrow[] {
  const seen = new Set<ArrowDir>();
  const out: InstructionArrow[] = [];
  ids.forEach((id) => {
    instructionArrows(id, role).forEach((a) => {
      if (seen.has(a.dir)) return;
      seen.add(a.dir);
      out.push(a);
    });
  });
  return out;
}

/** 선수 한 명에게 걸 수 있는 개인 전술 최대 개수 */
export const MAX_INSTRUCTIONS = 2;

/**
 * 슬롯별 개인 전술 11칸. 저장 형식은 슬롯을 ";"로, 슬롯 안의 지시를 ","로 잇는다.
 * 예: "overlap,press;;join_attack" → 1번 슬롯 2개, 2번 없음, 3번 1개
 */
export function parseInstructions(raw?: string | null): string[][] {
  const slots: string[][] = Array.from({ length: 11 }, () => []);
  if (!raw) return slots;
  raw.split(";").slice(0, 11).forEach((cell, i) => {
    slots[i] = cell
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, MAX_INSTRUCTIONS);
  });
  return slots;
}

export function serializeInstructions(slots: string[][]): string {
  const cells = slots
    .slice(0, 11)
    .map((ids) => ids.slice(0, MAX_INSTRUCTIONS).join(","));
  return cells.some(Boolean) ? cells.join(";") : "";
}

/** 백엔드 저장용: 슬롯당 "id,id" 문자열 11개 */
export function instructionCells(raw?: string | null): string[] {
  return parseInstructions(raw).map((ids) => ids.join(","));
}
