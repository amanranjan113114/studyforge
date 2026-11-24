export const STRUCTURE_SYSTEM =
  "You are an expert curriculum designer and teacher. You turn raw syllabi into clear, complete study structures. You reply with a single JSON object and nothing else.";

export function structurePrompt(p: {
  title: string;
  level: string;
  goal: string;
  syllabus: string;
}) {
  return `Turn the syllabus below into a complete study structure.

Subject: ${p.title}
Level: ${p.level || "not specified"}
Goal: ${p.goal || "not specified"}

Rules:
- Cover EVERY item in the syllabus. Do not invent unrelated topics.
- Group into units, then topics, then short subtopic lists.
- Order units and topics in the best learning order (prerequisites first).
- "prerequisites" lists titles of earlier topics (or general background knowledge) needed first. Use [] if none.
- "estimatedHours" is realistic study time for a student at this level (0.5 to 8 per topic).
- "priority" is high, medium or low, based on typical exam importance and how much other material depends on it.
- 3 to 12 units; 2 to 8 topics per unit; 2 to 6 subtopics per topic.

Return JSON in exactly this shape:
{
  "subject": "string",
  "units": [
    {
      "title": "string",
      "priority": "high" | "medium" | "low",
      "topics": [
        {
          "title": "string",
          "subtopics": ["string"],
          "prerequisites": ["string"],
          "estimatedHours": 2,
          "priority": "high" | "medium" | "low"
        }
      ]
    }
  ]
}

SYLLABUS:
"""
${p.syllabus}
"""`;
}

export const PRACTICE_SYSTEM =
  "You are an experienced teacher writing accurate practice material. You reply with a single JSON object and nothing else.";

export function practicePrompt(p: {
  subject: string;
  level: string;
  unit: string;
  topic: string;
  subtopics: string[];
}) {
  return `Create practice material for one topic.

Subject: ${p.subject}
Level: ${p.level || "not specified"}
Unit: ${p.unit}
Topic: ${p.topic}
Subtopics: ${p.subtopics.join("; ") || "none listed"}

Write:
- 5 multiple-choice questions. Each has exactly 4 options, one correct answer (answerIndex is 0 to 3), and a one or two sentence explanation. Mix easy, medium and harder questions. Make wrong options plausible.
- 6 flashcards covering the key definitions, formulas or ideas.

Return JSON in exactly this shape:
{
  "quiz": [
    { "question": "string", "options": ["a", "b", "c", "d"], "answerIndex": 0, "explanation": "string" }
  ],
  "flashcards": [
    { "front": "string", "back": "string" }
  ]
}`;
}
