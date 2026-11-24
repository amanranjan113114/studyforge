import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSubject } from "@/lib/subjects";
import { buildPlan, todayStr } from "@/lib/planner";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const { id } = await ctx.params;
  await query("DELETE FROM subjects WHERE id = $1 AND user_id = $2", [id, user.id]);
  return NextResponse.json({ ok: true });
}

const PatchBody = z.object({
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal("")),
  hoursPerDay: z.coerce.number().min(0.5).max(16),
});

/** Updates exam date / daily hours and rebuilds the study plan from today. */
export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const { id } = await ctx.params;

  const subject = await getSubject(id, user.id);
  if (!subject) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the date and hours" }, { status: 400 });
  }
  const examDate = parsed.data.examDate || null;
  const plan = buildPlan(subject.structure, {
    startDate: todayStr(),
    examDate,
    hoursPerDay: parsed.data.hoursPerDay,
  });

  await query("UPDATE subjects SET exam_date = $1, hours_per_day = $2, plan_json = $3 WHERE id = $4 AND user_id = $5", [
    examDate,
    parsed.data.hoursPerDay,
    JSON.stringify(plan),
    id,
    user.id,
  ]);
  return NextResponse.json({ ok: true });
}
