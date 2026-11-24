import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSubject } from "@/lib/subjects";
import { generateJSON } from "@/lib/ai";
import { PRACTICE_SYSTEM, practicePrompt } from "@/lib/prompts";
import { PracticeSchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 90;

const Body = z.object({ topicId: z.string().min(1).max(40) });

/** Generates (or regenerates) a quiz and flashcards for one topic. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const { id } = await ctx.params;

  const subject = await getSubject(id, user.id);
  if (!subject) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const found = subject.structure.units
    .flatMap((u) => u.topics.map((t) => ({ topic: t, unitTitle: u.title })))
    .find((x) => x.topic.id === parsed.data.topicId);
  if (!found) return NextResponse.json({ error: "Unknown topic" }, { status: 400 });

  if (!rateLimit(`ai:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "AI usage limit reached. Try again in an hour." }, { status: 429 });
  }

  let practice;
  try {
    practice = await generateJSON({
      system: PRACTICE_SYSTEM,
      prompt: practicePrompt({
        subject: subject.title,
        level: subject.level,
        unit: found.unitTitle,
        topic: found.topic.title,
        subtopics: found.topic.subtopics,
      }),
      schema: PracticeSchema,
      maxTokens: 5000,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `Could not generate practice material. ${msg}` }, { status: 502 });
  }

  await query(
    `INSERT INTO practice (subject_id, topic_id, content_json, created_at) VALUES ($1, $2, $3, $4)
     ON CONFLICT (subject_id, topic_id) DO UPDATE
       SET content_json = EXCLUDED.content_json, created_at = EXCLUDED.created_at`,
    [id, found.topic.id, JSON.stringify(practice), Date.now()],
  );

  return NextResponse.json({ practice });
}
