import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getSubject } from "@/lib/subjects";
import type { Practice } from "@/lib/schemas";
import SubjectView from "@/components/SubjectView";

export default async function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const subject = await getSubject(id, user.id);
  if (!subject) notFound();

  const done = (await query<{ topic_id: string }>("SELECT topic_id FROM progress WHERE subject_id = $1", [id])).map(
    (r) => r.topic_id,
  );

  const practice: Record<string, Practice> = {};
  const rows = await query<{ topic_id: string; content_json: string }>(
    "SELECT topic_id, content_json FROM practice WHERE subject_id = $1",
    [id],
  );
  for (const r of rows) practice[r.topic_id] = JSON.parse(r.content_json) as Practice;

  return (
    <main className="wrap page">
      <SubjectView
        subject={{
          id: subject.id,
          title: subject.title,
          level: subject.level,
          goal: subject.goal,
          examDate: subject.examDate,
          hoursPerDay: subject.hoursPerDay,
        }}
        structure={subject.structure}
        plan={subject.plan}
        initialDone={done}
        initialPractice={practice}
      />
    </main>
  );
}
