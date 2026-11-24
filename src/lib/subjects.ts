import { query, queryOne } from "./db";
import type { Plan, Structure } from "./schemas";

interface SubjectRow {
  id: string;
  user_id: string;
  title: string;
  level: string;
  goal: string;
  exam_date: string | null;
  hours_per_day: number;
  syllabus_text: string;
  structure_json: string;
  plan_json: string;
  created_at: string | number;
}

export interface Subject {
  id: string;
  title: string;
  level: string;
  goal: string;
  examDate: string | null;
  hoursPerDay: number;
  structure: Structure;
  plan: Plan;
  createdAt: number;
}

/** Loads a subject only if it belongs to the given user. */
export async function getSubject(id: string, userId: string): Promise<Subject | null> {
  const r = await queryOne<SubjectRow>("SELECT * FROM subjects WHERE id = $1 AND user_id = $2", [id, userId]);
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    level: r.level,
    goal: r.goal,
    examDate: r.exam_date,
    hoursPerDay: Number(r.hours_per_day),
    structure: JSON.parse(r.structure_json) as Structure,
    plan: JSON.parse(r.plan_json) as Plan,
    createdAt: Number(r.created_at),
  };
}

export async function listSubjects(userId: string) {
  const rows = await query<{
    id: string;
    title: string;
    level: string;
    exam_date: string | null;
    structure_json: string;
    created_at: string | number;
    done: number;
  }>(
    `SELECT s.id, s.title, s.level, s.exam_date, s.structure_json, s.created_at,
            (SELECT COUNT(*)::int FROM progress p WHERE p.subject_id = s.id) AS done
     FROM subjects s WHERE s.user_id = $1 ORDER BY s.created_at DESC`,
    [userId],
  );

  return rows.map((r) => {
    const structure = JSON.parse(r.structure_json) as Structure;
    const total = structure.units.reduce((n, u) => n + u.topics.length, 0);
    return {
      id: r.id,
      title: r.title,
      level: r.level,
      examDate: r.exam_date,
      units: structure.units.length,
      total,
      done: Number(r.done),
    };
  });
}
