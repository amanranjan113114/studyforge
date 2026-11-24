import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateJSON } from "@/lib/ai";
import { structurePrompt, STRUCTURE_SYSTEM } from "@/lib/prompts";
import { StructureSchema, withIds } from "@/lib/schemas";
import { buildPlan, todayStr } from "@/lib/planner";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  title: z.string().trim().min(2, "Give the subject a title").max(120),
  level: z.string().trim().max(120).default(""),
  goal: z.string().trim().max(300).default(""),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal("")),
  hoursPerDay: z.coerce.number().min(0.5).max(16).default(2),
  syllabusText: z.string().trim().min(30, "Paste or upload a longer syllabus").max(60000),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  if (!rateLimit(`ai:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "AI usage limit reached. Try again in an hour." }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const b = parsed.data;
  const examDate = b.examDate || null;

  let structure;
  try {
    const raw = await generateJSON({
      system: STRUCTURE_SYSTEM,
      prompt: structurePrompt({
        title: b.title,
        level: b.level,
        goal: b.goal,
        syllabus: b.syllabusText.slice(0, 30000),
      }),
      schema: StructureSchema,
      maxTokens: 10000,
    });
    structure = withIds(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `Could not generate the study structure. ${msg}` }, { status: 502 });
  }

  const plan = buildPlan(structure, { startDate: todayStr(), examDate, hoursPerDay: b.hoursPerDay });
  const id = randomUUID();
  try {
    await query(
      `INSERT INTO subjects
        (id, user_id, title, level, goal, exam_date, hours_per_day, syllabus_text, structure_json, plan_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        user.id,
        b.title,
        b.level,
        b.goal,
        examDate,
        b.hoursPerDay,
        b.syllabusText,
        JSON.stringify(structure),
        JSON.stringify(plan),
        Date.now(),
      ],
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `Could not save the subject. ${msg}` }, { status: 500 });
  }

  return NextResponse.json({ id });
}
