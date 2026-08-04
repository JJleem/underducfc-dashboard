const HOUR = 60 * 60 * 1000;
const ESTIMATED_MATCH_HOURS = 2;
const VOTING_HOURS = 24;

function dateParts(raw: string): [number, number, number] | null {
  const match = raw.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** 예상 경기 종료 뒤 24시간. 시간이 미정이면 다음 날 23:59까지 연다. */
export function getMomVoteDeadline(matchDate: string, matchTime?: string): Date | null {
  const parts = dateParts(matchDate);
  if (!parts) return null;
  const [year, month, day] = parts;
  const time = (matchTime || "").match(/(\d{1,2}):(\d{2})/);

  // 팀 기준 시각은 한국 시간으로 고정한다. 배포 서버의 로컬 타임존에 기대지 않는다.
  if (!time) return new Date(Date.UTC(year, month - 1, day + 1, 14, 59, 59, 999));

  const kickoff = new Date(
    Date.UTC(year, month - 1, day, Number(time[1]) - 9, Number(time[2]))
  );
  return new Date(kickoff.getTime() + (ESTIMATED_MATCH_HOURS + VOTING_HOURS) * HOUR);
}

export function momVoteTimeLabel(deadline: Date, now: number): string {
  const minutes = Math.ceil((deadline.getTime() - now) / 60_000);
  if (minutes <= 0) return "투표 마감";
  if (minutes < 60) return `${minutes}분 남음`;
  return `${Math.ceil(minutes / 60)}시간 남음`;
}
