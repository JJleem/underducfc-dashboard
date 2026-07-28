// 좌표 → 포지션 파생의 불변식 검증. `npm run verify:positions`
//
// 왜 필요한가:
//   app/lib/positions.ts의 밴드/레인 경계를 건드리면 과거 라인업의 포지션 그룹 판정이
//   조용히 바뀌고, 그 결과 칭호(골키퍼/수비수/콘크리트/윙백…)와 마이페이지 주 포지션
//   수치가 사람도 모르게 움직인다. 과거 데이터엔 좌표가 없어 프리셋으로 폴백되므로,
//   "프리셋 판정 = 예전 규칙"이 유지되는 한 수치는 절대 변하지 않는다.
//   이 스크립트가 그 등가성을 강제한다.
import {
  FORMATION_PRESETS,
  POSITION_ZONES,
  formationOf,
  groupOfRole,
  roleFromPoint,
  type PosGroup,
} from "../app/lib/positions.ts";

/** 예전 규칙 (titles.ts legacySlotToPos와 동일). 절대 수정하지 말 것 — 기준값이다. */
function legacySlotToPos(index: number, formation: string): PosGroup {
  if (index === 0) return "GK";
  const layers = formation.split("-").map(Number).filter((n) => !isNaN(n));
  if (!layers.length) return "MF";
  const totalLayers = layers.length;
  let count = 1;
  let layer = totalLayers;
  for (let i = 0; i < layers.length; i++) {
    if (index < count + layers[i]) { layer = i + 1; break; }
    count += layers[i];
  }
  if (layer === 1) return "DF";
  if (layer === totalLayers) return "FW";
  return "MF";
}

let failures = 0;
const fail = (msg: string) => { console.error("  ✗ " + msg); failures++; };

// ① 프리셋 11칸 × 7포메이션의 포지션 그룹이 예전 규칙과 같은가
let cells = 0;
for (const [formation, preset] of Object.entries(FORMATION_PRESETS)) {
  preset.forEach((point, slot) => {
    cells++;
    const got = groupOfRole(roleFromPoint(point));
    const want = legacySlotToPos(slot, formation);
    if (got !== want) {
      fail(`그룹 불일치 ${formation} slot${slot} (${point.x},${point.y}): 예전 ${want} → 지금 ${got}`);
    }
  });
}
console.log(`① 포지션 그룹 하위호환: ${cells - failures}/${cells}칸 일치`);

// ② 포메이션 이름을 좌표에서 역산하면 프리셋 이름이 그대로 나오는가
const before = failures;
for (const [formation, preset] of Object.entries(FORMATION_PRESETS)) {
  const got = formationOf(preset);
  if (got !== formation) fail(`포메이션 역산 ${formation} → ${got}`);
}
console.log(`② 포메이션 이름 역산: ${Object.keys(FORMATION_PRESETS).length - (failures - before)}/${Object.keys(FORMATION_PRESETS).length} 일치`);

// ③ 존 오버레이 사각형이 판정과 정확히 일치하고 필드를 빈틈없이 덮는가
//    (드래그 중 보이는 격자와 실제 판정이 어긋나면 사용자가 속는다)
let grid = 0, uncovered = 0, overlapped = 0, mismatched = 0;
for (let x = 0; x <= 100; x++) {
  for (let y = 0; y <= 100; y++) {
    grid++;
    const hits = POSITION_ZONES.filter(
      (z) =>
        x >= z.x0 && (x < z.x1 || z.x1 === 100) &&
        y >= z.y0 && (y < z.y1 || z.y1 === 100)
    );
    if (hits.length === 0) { uncovered++; continue; }
    if (hits.length > 1) { overlapped++; continue; }
    if (hits[0].role !== roleFromPoint({ x, y })) mismatched++;
  }
}
if (uncovered) fail(`존이 덮지 않는 좌표 ${uncovered}칸`);
if (overlapped) fail(`존이 겹치는 좌표 ${overlapped}칸`);
if (mismatched) fail(`격자 표시와 실제 판정이 다른 좌표 ${mismatched}칸`);
console.log(`③ 존 격자 무결성: ${grid}칸 검사 (미포함 ${uncovered} / 중복 ${overlapped} / 불일치 ${mismatched})`);

if (failures > 0) {
  console.error(`\n실패 ${failures}건 — 경계를 바꿨다면 과거 칭호 수치가 움직입니다.`);
  process.exit(1);
}
console.log("\n통과 — 과거 라인업의 포지션 판정이 그대로 유지됩니다.");
