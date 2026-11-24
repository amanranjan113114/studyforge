"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Plan, PlanDay } from "@/lib/schemas";

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export default function PlanTab({
  subject,
  plan,
}: {
  subject: { id: string; examDate: string | null; hoursPerDay: number };
  plan: Plan;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/subjects/${subject.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examDate: f.get("examDate") || null, hoursPerDay: f.get("hoursPerDay") }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not update the plan");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setBusy(false);
  }

  const weeks: PlanDay[][] = [];
  for (let i = 0; i < plan.days.length; i += 7) weeks.push(plan.days.slice(i, i + 7));

  return (
    <div>
      <form className="card" onSubmit={onSubmit} style={{ marginBottom: 16 }}>
        <div className="row">
          <div className="field">
            <label htmlFor="p-exam">Exam date</label>
            <input id="p-exam" name="examDate" type="date" defaultValue={subject.examDate ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="p-hours">Study hours per day</label>
            <input
              id="p-hours"
              name="hoursPerDay"
              type="number"
              min={0.5}
              max={16}
              step={0.5}
              defaultValue={subject.hoursPerDay}
              required
            />
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn small" disabled={busy}>
          {busy ? "Rebuilding..." : "Rebuild plan from today"}
        </button>
      </form>

      {plan.note && <div className="notice">{plan.note}</div>}
      <p className="muted small">
        {plan.days.length} days · {formatDate(plan.startDate)} to {formatDate(plan.endDate)} ·{" "}
        {plan.totalStudyHours}h of new material
      </p>

      {weeks.map((w, wi) => (
        <section key={wi} className="card week">
          <h3>Week {wi + 1}</h3>
          {w.map((d) => (
            <div key={d.date} className={`day ${d.date === today ? "today" : ""}`}>
              <div className="date">
                {formatDate(d.date)}
                {d.date === today && <div className="badge low">today</div>}
              </div>
              <div>
                {d.items.map((it, i) => (
                  <div key={i} className="item">
                    <span className={it.kind === "learn" ? "" : `kind-${it.kind}`}>{it.title}</span>
                    <span className="muted small">{it.hours}h</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
