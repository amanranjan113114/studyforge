"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Plan, Practice, Structure } from "@/lib/schemas";
import { countTopics } from "@/lib/schemas";
import PlanTab from "./PlanTab";
import PracticeTab from "./PracticeTab";

interface SubjectInfo {
  id: string;
  title: string;
  level: string;
  goal: string;
  examDate: string | null;
  hoursPerDay: number;
}

type Tab = "structure" | "plan" | "practice";

export default function SubjectView(props: {
  subject: SubjectInfo;
  structure: Structure;
  plan: Plan;
  initialDone: string[];
  initialPractice: Record<string, Practice>;
}) {
  const { subject, structure, plan } = props;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("structure");
  const [done, setDone] = useState<Set<string>>(new Set(props.initialDone));
  const [error, setError] = useState("");

  const total = countTopics(structure);
  const pct = total ? Math.round((done.size / total) * 100) : 0;
  const totalHours = structure.units.reduce((s, u) => s + u.topics.reduce((a, t) => a + t.estimatedHours, 0), 0);

  async function toggle(topicId: string, checked: boolean) {
    const prev = done;
    const next = new Set(done);
    if (checked) next.add(topicId);
    else next.delete(topicId);
    setDone(next); // optimistic
    setError("");
    try {
      const res = await fetch(`/api/subjects/${subject.id}/progress`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topicId, done: checked }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setDone(prev);
      setError("Could not save progress. Check your connection.");
    }
  }

  async function remove() {
    if (!confirm(`Delete "${subject.title}" and all its progress?`)) return;
    const res = await fetch(`/api/subjects/${subject.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setError("Could not delete this subject.");
    }
  }

  return (
    <>
      <p className="small">
        <Link href="/dashboard">← All subjects</Link>
      </p>
      <div className="spread">
        <div>
          <h1>{subject.title}</h1>
          <div className="muted small">
            {subject.level ? `${subject.level} · ` : ""}
            {structure.units.length} units · {total} topics · about {Math.round(totalHours)} study hours
          </div>
        </div>
        <button className="btn danger small" onClick={remove}>
          Delete
        </button>
      </div>

      <div className="bar" style={{ marginTop: 16 }}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className="small muted">
        {done.size}/{total} topics done ({pct}%)
      </div>
      {error && <p className="error">{error}</p>}

      <div className="tabs" role="tablist">
        {(["structure", "plan", "practice"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "structure" ? "Structure" : t === "plan" ? "Study plan" : "Practice"}
          </button>
        ))}
      </div>

      {tab === "structure" && (
        <div>
          {structure.units.map((u, ui) => (
            <section key={u.id} className="card unit">
              <div className="unit-head">
                <h3>
                  Unit {ui + 1}: {u.title}
                </h3>
                <span className={`badge ${u.priority}`}>{u.priority} priority</span>
              </div>
              {u.topics.map((t) => (
                <div key={t.id} className={`topic ${done.has(t.id) ? "done" : ""}`}>
                  <input
                    type="checkbox"
                    checked={done.has(t.id)}
                    onChange={(e) => toggle(t.id, e.target.checked)}
                    aria-label={`Mark ${t.title} as done`}
                  />
                  <div>
                    <div className="t-title">
                      {t.title}{" "}
                      <span className={`badge ${t.priority}`} style={{ marginLeft: 6 }}>
                        {t.priority}
                      </span>
                    </div>
                    <div className="muted small">~{t.estimatedHours}h</div>
                    {t.subtopics.length > 0 && (
                      <div className="chips">
                        {t.subtopics.map((s, i) => (
                          <span key={i} className="chip">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    {t.prerequisites.length > 0 && (
                      <div className="small muted" style={{ marginTop: 6 }}>
                        Learn first: {t.prerequisites.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      {tab === "plan" && <PlanTab subject={subject} plan={plan} />}

      {tab === "practice" && (
        <PracticeTab subjectId={subject.id} structure={structure} initialPractice={props.initialPractice} />
      )}
    </>
  );
}
