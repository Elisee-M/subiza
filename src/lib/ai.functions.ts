import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const TypeEnum = z.enum(["multiple_choice", "true_false", "fill_blank", "matching"]);

const Input = z.object({
  topic: z.string().min(2).max(200),
  count: z.number().int().min(3).max(50).default(8),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("mixed"),
  notes: z.string().optional(),
  types: z.array(TypeEnum).min(1).default(["multiple_choice"]),
});

export const generateAIQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service is not configured.");

    const allowed = data.types.join(", ");

    const systemPrompt = `You generate high-quality educational quizzes. Return STRICT JSON only:
{
  "title": string,
  "description": string,
  "questions": Array<{
    "type": "multiple_choice" | "true_false" | "fill_blank" | "matching",
    "question_text": string,
    "options": string[],
    "correct_answer": string,
    "explanation": string,
    "difficulty": "easy" | "medium" | "hard"
  }>
}

Rules for each type:
- multiple_choice: options is exactly 4 distinct strings; correct_answer EXACTLY equals one option.
- true_false: options is ["True","False"]; correct_answer is "True" or "False".
- fill_blank: options is []; question_text uses "___" for the blank; correct_answer is the missing word/phrase.
- matching: options is an array of pair strings formatted "left|right" (3 to 5 pairs). correct_answer is the same pairs joined by ";" e.g. "A|1;B|2;C|3".

Only produce question types from this allowed set: [${allowed}]. Mix them roughly evenly. No markdown, no commentary. JSON only.`;

    const userPrompt = `Topic: ${data.topic}
Number of questions: ${data.count}
Difficulty: ${data.difficulty}
Allowed types: ${allowed}
Audience: school / educational. Cover the topic broadly and avoid duplicate questions.${
      data.notes && data.notes.trim()
        ? `\n\nIMPORTANT: Base the questions strictly on the following teacher's notes / source material. Do not invent facts beyond them.\n\n--- NOTES START ---\n${data.notes.trim().slice(0, 60000)}\n--- NOTES END ---`
        : ""
    }`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Cloud settings.");
    if (!res.ok) throw new Error(`AI error (${res.status})`);

    const body = await res.json();
    const text: string = body.choices?.[0]?.message?.content ?? "{}";
    let parsed: { title?: string; description?: string; questions?: any[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    const allowedSet = new Set(data.types);
    return {
      title: parsed.title ?? data.topic,
      description: parsed.description ?? `AI-generated quiz on ${data.topic}`,
      questions: (parsed.questions ?? [])
        .map((q: any) => {
          const type = ["multiple_choice", "true_false", "fill_blank", "matching"].includes(q.type)
            ? q.type
            : "multiple_choice";
          return {
            type,
            question_text: String(q.question_text ?? ""),
            options: Array.isArray(q.options) ? q.options.map(String) : [],
            correct_answer: String(q.correct_answer ?? ""),
            explanation: q.explanation ? String(q.explanation) : "",
            difficulty: ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium",
            timer_seconds: type === "matching" ? 45 : 20,
            points: 100,
          };
        })
        .filter((q: any) => allowedSet.has(q.type)),
    };
  });
