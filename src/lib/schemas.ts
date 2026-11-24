import { z } from "zod";

export type Priority = "high" | "medium" | "low";

export interface Topic {
  id: string;
  title: string;
  subtopics: string[];
  prerequisites: string[];
  estimatedHours: number;
  priority: Priority;
}
export interface Unit {
  id: string;
  title: string;
  priority: Priority;
  topics: Topic[];
}
export interface Structure {
  subject: string;
  units: Unit[];
}

export interface PlanItem {
  topicId?: string;
  title: string;
  hours: number;
  kind: "learn" | "revise" | "mock";
}
export interface PlanDay {
  date: string;
  items: PlanItem[];
  hours: number;
}
export interface Plan {
  startDate: string;
  endDate: string;
  days: PlanDay[];
  totalStudyHours: number;
  hoursPerDay: number;
  requiredHoursPerDay: number;
  overloaded: boolean;
  note?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}
export interface Flashcard {
  front: string;
  back: string;
}
export interface Practice {
  quiz: QuizQuestion[];
  flashcards: Flashcard[];
}

// ---- Zod schemas used to validate what the AI returns ----
const PrioritySchema = z.enum(["high", "medium", "low"]).catch("medium");

const TopicSchema = z.object({
  title: z.string().min(1),
  subtopics: z.array(z.string()).catch([]),
  prerequisites: z.array(z.string()).catch([]),
  estimatedHours: z.coerce
    .number()
    .catch(2)
    .transform((n) => Math.min(20, Math.max(0.5, n))),
  priority: PrioritySchema,
});

const UnitSchema = z.object({
  title: z.string().min(1),
  priority: PrioritySchema,
  topics: z.array(TopicSchema).min(1),
});

export const StructureSchema = z.object({
  subject: z.string().catch(""),
  units: z.array(UnitSchema).min(1),
});

export const PracticeSchema = z.object({
  quiz: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z.array(z.string()).length(4),
        answerIndex: z.coerce.number().int().min(0).max(3),
        explanation: z.string().catch(""),
      }),
    )
    .min(1),
  flashcards: z.array(z.object({ front: z.string().min(1), back: z.string().min(1) })).min(1),
});

/** Adds stable ids (u1, u1.t1, ...) to the AI's raw structure. */
export function withIds(raw: z.infer<typeof StructureSchema>): Structure {
  return {
    subject: raw.subject,
    units: raw.units.map((u, ui) => ({
      id: `u${ui + 1}`,
      title: u.title,
      priority: u.priority,
      topics: u.topics.map((t, ti) => ({
        id: `u${ui + 1}.t${ti + 1}`,
        title: t.title,
        subtopics: t.subtopics,
        prerequisites: t.prerequisites,
        estimatedHours: t.estimatedHours,
        priority: t.priority,
      })),
    })),
  };
}

export function countTopics(s: Structure): number {
  return s.units.reduce((n, u) => n + u.topics.length, 0);
}
