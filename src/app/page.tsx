import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="wrap">
      <section className="hero">
        <h1>Turn any syllabus into a complete study plan</h1>
        <p>
          Paste or upload your syllabus. StudyForge breaks it into units and topics, orders them by
          what to learn first, builds a day-by-day schedule to your exam date, and generates quizzes
          and flashcards for every topic.
        </p>
        <Link href="/signup" className="btn">
          Get started free
        </Link>
      </section>
      <section className="features">
        <div className="card">
          <h3>Structured syllabus</h3>
          <p className="muted">Units, topics, subtopics, prerequisites, priority and time estimates.</p>
        </div>
        <div className="card">
          <h3>Schedule to your exam</h3>
          <p className="muted">Daily plan with weekly reviews, revision days and a final mock test.</p>
        </div>
        <div className="card">
          <h3>Practice built in</h3>
          <p className="muted">AI-written quizzes and flashcards for each topic, plus progress tracking.</p>
        </div>
      </section>
    </main>
  );
}
