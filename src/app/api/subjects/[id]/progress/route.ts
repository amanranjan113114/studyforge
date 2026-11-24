import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSubject } from "@/lib/subjects";

export const runtime = "nodejs";

const Body = z.object({ topicId: z.string().min(1).max(40), done: z.boolean() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const { id } = await ctx.params;

  const subject = await getSubject(id, user.id);
  if (!subject) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const validTopic = subject.structure.units.some((u) => u.topics.some((t) => t.id === parsed.data.topicId));
  if (!validTopic) return NextResponse.json({ error: "Unknown topic" }, { status: 400 });

  if (parsed.data.done) {
    await query("INSERT INTO progress (subject_id, topic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [
      id,
      parsed.data.topicId,
    ]);
  } else {
    await query("DELETE FROM progress WHERE subject_id = $1 AND topic_id = $2", [id, parsed.data.topicId]);
  }
  return NextResponse.json({ ok: true });
}
