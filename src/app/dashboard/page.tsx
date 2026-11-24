import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listSubjects } from "@/lib/subjects";
import NewSubjectForm from "@/components/NewSubjectForm";

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const subjects = await listSubjects(user.id);

  return (
    <main className="wrap page">
      <h1>Your subjects</h1>

      {subjects.length === 0 ? (
        <p className="muted">Nothing here yet. Add your first syllabus below.</p>
      ) : (
        <div className="grid">
          {subjects.map((s) => {
            const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
            return (
              <Link key={s.id} href={`/subjects/${s.id}`} className="card subject-card">
                <h3>{s.title}</h3>
                <div className="muted small">
                  {s.level ? `${s.level} · ` : ""}
                  {s.units} units · {s.total} topics
                  {s.examDate ? ` · exam ${s.examDate}` : ""}
                </div>
                <div className="bar">
                  <i style={{ width: `${pct}%` }} />
                </div>
                <div className="small muted">
                  {s.done}/{s.total} topics done ({pct}%)
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <h2 style={{ marginTop: 40 }}>Add a new subject</h2>
      <NewSubjectForm />
    </main>
  );
}
