import type { Plan, PlanDay, PlanItem, Structure } from "./schemas";

const DAY_MS = 86_400_000;
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => new Date(`${s}T00:00:00Z`);
const round2 = (n: number) => Math.round(n * 100) / 100;

export const todayStr = () => fmt(new Date());

/**
 * Deterministic study planner (no AI call, so it is instant and free).
 * - With an exam date: schedules everything between startDate and the exam,
 *   keeping the last ~15% of days for revision and a final mock test.
 * - Without one: sizes the plan from total hours plus a 25% revision buffer.
 * - Every 7th learning day is a weekly review + self-test day.
 * - If the hours do not fit, it raises the daily hours and flags the plan as overloaded.
 */
export function buildPlan(
  structure: Structure,
  opts: { startDate: string; examDate?: string | null; hoursPerDay: number },
): Plan {
  const topics = structure.units.flatMap((u) => u.topics.map((t) => ({ ...t, unit: u.title })));
  const total = topics.reduce((s, t) => s + t.estimatedHours, 0);
  const start = parse(opts.startDate);
  const hpd = Math.max(0.5, opts.hoursPerDay);

  let totalDays: number;
  let note: string | undefined;
  if (opts.examDate) {
    const diff = Math.round((parse(opts.examDate).getTime() - start.getTime()) / DAY_MS);
    if (diff < 1) note = "The exam date is today or in the past, so this is a one-day crash plan.";
    totalDays = Math.max(1, Math.min(365, diff));
  } else {
    totalDays = Math.min(365, Math.max(1, Math.ceil((total * 1.25) / hpd)));
  }

  const reviseDays = totalDays >= 7 ? Math.max(1, Math.floor(totalDays * 0.15)) : 0;
  // The last day is always a mock test (when there are 2+ days). For plans of 7+ days it
  // is one of the revision days; for shorter plans it takes a day away from learning.
  const reservedDays = Math.max(reviseDays, totalDays >= 2 ? 1 : 0);
  const learnDays = totalDays - reservedDays;
  const weeklyReviewDays = learnDays >= 14 ? Math.floor(learnDays / 7) : 0;
  const effectiveLearnDays = Math.max(1, learnDays - weeklyReviewDays);

  const required = total / effectiveLearnDays;
  const overloaded = required > hpd + 1e-9;
  const perDay = overloaded ? Math.ceil(required * 2) / 2 : hpd;
  if (overloaded && !note) {
    note = `Your syllabus needs about ${round2(total)} study hours but ${hpd}h/day is not enough before the exam. The plan assumes ${perDay}h/day. Consider more daily time, a later date or trimming low-priority topics.`;
  }

  const units = structure.units;
  let reviseIdx = 0;
  const reviseItem = (hours: number): PlanItem => {
    const u = units[reviseIdx % units.length];
    reviseIdx++;
    return { title: `Revise: ${u.title}`, hours: round2(hours), kind: "revise" };
  };

  const days: PlanDay[] = [];
  let ti = 0;
  let remaining = topics[0]?.estimatedHours ?? 0;
  let startedCurrent = false;

  for (let d = 0; d < totalDays; d++) {
    const date = fmt(new Date(start.getTime() + d * DAY_MS));
    const items: PlanItem[] = [];
    const isLast = d === totalDays - 1;

    if (isLast && totalDays >= 2) {
      items.push({ title: "Full mock test + review of weak topics", hours: round2(hpd), kind: "mock" });
    } else if (d >= learnDays) {
      items.push(reviseItem(hpd));
    } else if (weeklyReviewDays > 0 && d % 7 === 6) {
      items.push({ title: "Weekly review + self-test", hours: round2(perDay), kind: "mock" });
    } else if (ti >= topics.length) {
      items.push(reviseItem(hpd)); // finished early: spend spare days on revision
    } else {
      let cap = perDay;
      while (cap > 0.01 && ti < topics.length) {
        const take = Math.min(cap, remaining);
        items.push({
          topicId: topics[ti].id,
          title: startedCurrent ? `${topics[ti].title} (continued)` : topics[ti].title,
          hours: round2(take),
          kind: "learn",
        });
        cap -= take;
        remaining -= take;
        startedCurrent = true;
        if (remaining <= 0.001) {
          ti++;
          remaining = topics[ti]?.estimatedHours ?? 0;
          startedCurrent = false;
        }
      }
    }

    days.push({ date, items, hours: round2(items.reduce((s, i) => s + i.hours, 0)) });
  }

  return {
    startDate: opts.startDate,
    endDate: days[days.length - 1].date,
    days,
    totalStudyHours: round2(total),
    hoursPerDay: hpd,
    requiredHoursPerDay: round2(required),
    overloaded,
    note,
  };
}
