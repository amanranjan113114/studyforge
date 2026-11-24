"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function NewSubjectForm() {
  const router = useRouter();
  const [syllabus, setSyllabus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Could not read that file");
      else setSyllabus(data.text);
    } catch {
      setError("Upload failed. Please try again.");
    }
    setReading(false);
    e.target.value = "";
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const body = {
      title: f.get("title"),
      level: f.get("level"),
      goal: f.get("goal"),
      examDate: f.get("examDate") || null,
      hoursPerDay: f.get("hoursPerDay"),
      syllabusText: syllabus,
    };
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setBusy(false);
        return;
      }
      router.push(`/subjects/${data.id}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <div className="row">
        <div className="field">
          <label htmlFor="title">Subject</label>
          <input id="title" name="title" placeholder="e.g. Data Structures" required />
        </div>
        <div className="field">
          <label htmlFor="level">Level / board</label>
          <input id="level" name="level" placeholder="e.g. B.Tech 3rd sem, Class 12 Bihar Board" />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="examDate">Exam date (optional)</label>
          <input id="examDate" name="examDate" type="date" />
        </div>
        <div className="field">
          <label htmlFor="hoursPerDay">Study hours per day</label>
          <input id="hoursPerDay" name="hoursPerDay" type="number" min={0.5} max={16} step={0.5} defaultValue={2} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="goal">Goal (optional)</label>
        <input id="goal" name="goal" placeholder="e.g. Score 80%+, clear the semester exam" />
      </div>
      <div className="field">
        <div className="spread">
          <label htmlFor="syllabus">Syllabus</label>
          <label className="btn ghost small" style={{ cursor: "pointer", marginBottom: 0 }}>
            {reading ? "Reading..." : "Upload PDF or .txt"}
            <input type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" onChange={onFile} hidden />
          </label>
        </div>
        <textarea
          id="syllabus"
          value={syllabus}
          onChange={(e) => setSyllabus(e.target.value)}
          placeholder="Paste the full syllabus here, or upload a file."
          required
        />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy || reading}>
        {busy ? "Building your study structure (up to a minute)..." : "Generate study structure"}
      </button>
    </form>
  );
}
