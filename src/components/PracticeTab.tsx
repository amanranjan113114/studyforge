"use client";

import { useState } from "react";
import type { Practice, Structure } from "@/lib/schemas";

export default function PracticeTab({
  subjectId,
  structure,
  initialPractice,
}: {
  subjectId: string;
  structure: Structure;
  initialPractice: Record<string, Practice>;
}) {
  const firstTopic = structure.units[0]?.topics[0]?.id ?? "";
  const [topicId, setTopicId] = useState(firstTopic);
  const [store, setStore] = useState<Record<string, Practice>>(initialPractice);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0); // resets quiz state after regenerating
  const current = store[topicId];

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/subjects/${subjectId}/practice`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topicId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Could not generate practice material");
      else {
        setStore((s) => ({ ...s, [topicId]: data.practice }));
        setVersion((v) => v + 1);
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="field">
          <label htmlFor="topic">Topic</label>
          <select id="topic" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            {structure.units.map((u, ui) => (
              <optgroup key={u.id} label={`Unit ${ui + 1}: ${u.title}`}>
                {u.topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {store[t.id] ? "✓ " : ""}
                    {t.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn small" onClick={generate} disabled={busy}>
          {busy ? "Generating..." : current ? "Regenerate quiz and flashcards" : "Generate quiz and flashcards"}
        </button>
      </div>

      {current && (
        <div key={`${topicId}-${version}`}>
          <Quiz practice={current} />
          <Flashcards practice={current} />
        </div>
      )}
    </div>
  );
}

function Quiz({ practice }: { practice: Practice }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const answered = Object.keys(answers).length;
  const score = practice.quiz.reduce((n, q, i) => (answers[i] === q.answerIndex ? n + 1 : n), 0);

  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <div className="spread">
        <h3>Quiz</h3>
        <span className="muted small">
          {answered}/{practice.quiz.length} answered · score {score}
        </span>
      </div>
      {practice.quiz.map((q, i) => {
        const picked = answers[i];
        const locked = picked !== undefined;
        return (
          <div key={i} className="q">
            <strong>
              {i + 1}. {q.question}
            </strong>
            {q.options.map((o, oi) => {
              let cls = "opt";
              if (locked && oi === q.answerIndex) cls += " right";
              else if (locked && oi === picked) cls += " wrong";
              return (
                <button key={oi} className={cls} disabled={locked} onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}>
                  {o}
                </button>
              );
            })}
            {locked && q.explanation && <div className="small muted">{q.explanation}</div>}
          </div>
        );
      })}
    </section>
  );
}

function Flashcards({ practice }: { practice: Practice }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const cards = practice.flashcards;
  const card = cards[i];

  function go(delta: number) {
    setI((i + delta + cards.length) % cards.length);
    setFlipped(false);
  }

  return (
    <section className="card">
      <div className="spread">
        <h3>Flashcards</h3>
        <span className="muted small">
          {i + 1}/{cards.length} · click the card to flip
        </span>
      </div>
      <div
        className="card flash"
        role="button"
        tabIndex={0}
        onClick={() => setFlipped(!flipped)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFlipped(!flipped)}
      >
        {flipped ? card.back : card.front}
      </div>
      <div className="spread" style={{ marginTop: 12 }}>
        <button className="btn ghost small" onClick={() => go(-1)}>
          Previous
        </button>
        <button className="btn ghost small" onClick={() => go(1)}>
          Next
        </button>
      </div>
    </section>
  );
}
