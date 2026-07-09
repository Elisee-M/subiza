import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Sparkles, Loader2, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateAIQuiz } from "@/lib/ai.functions";
import { saveQuiz } from "@/lib/quiz.functions";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export type QuestionDraft = {
  id?: string;
  type: "multiple_choice" | "true_false" | "fill_blank" | "poll" | "matching";
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
  timer_seconds: number;
  points: number;
  image_url?: string | null;
  difficulty?: string;
};

const AI_TYPES: { value: "multiple_choice" | "true_false" | "fill_blank" | "matching"; label: string }[] = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "true_false", label: "True / False" },
  { value: "fill_blank", label: "Fill in the blank" },
  { value: "matching", label: "Matching" },
];

export function QuizEditor({
  initial,
  initialAI,
}: {
  initial?: { id?: string; title: string; description: string; visibility: "public" | "private"; questions: QuestionDraft[] };
  initialAI?: boolean;
}) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [visibility, setVisibility] = useState<"public" | "private">(initial?.visibility ?? "private");
  const [questions, setQuestions] = useState<QuestionDraft[]>(initial?.questions ?? []);
  const [aiOpen, setAiOpen] = useState(!!initialAI && !initial);
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(8);
  const [aiNotes, setAiNotes] = useState("");
  const [aiNotesFileName, setAiNotesFileName] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [aiTypes, setAiTypes] = useState<Record<string, boolean>>({
    multiple_choice: true,
    true_false: true,
    fill_blank: false,
    matching: false,
  });

  const aiGen = useServerFn(generateAIQuiz);
  const save = useServerFn(saveQuiz);

  function addQuestion(type: QuestionDraft["type"] = "multiple_choice") {
    setQuestions((qs) => [
      ...qs,
      {
        type,
        question_text: "",
        options:
          type === "true_false"
            ? ["True", "False"]
            : type === "fill_blank"
            ? []
            : type === "matching"
            ? ["|", "|", "|"]
            : ["", "", "", ""],
        correct_answer: "",
        timer_seconds: type === "matching" ? 45 : 20,
        points: 100,
        explanation: "",
      },
    ]);
  }

  async function handleAI() {
    if (!aiTopic.trim() && !aiNotes.trim()) return toast.error("Add a topic or upload notes");
    const selectedTypes = AI_TYPES.filter((t) => aiTypes[t.value]).map((t) => t.value);
    if (selectedTypes.length === 0) return toast.error("Select at least one question type");
    setAiLoading(true);
    try {
      const res = await aiGen({ data: { topic: aiTopic.trim() || "From uploaded notes", count: aiCount, difficulty: "mixed", notes: aiNotes ? aiNotes.slice(0, 60000) : undefined, types: selectedTypes } });
      if (!title) setTitle(res.title);
      if (!description) setDescription(res.description);
      setQuestions((qs) => [...qs, ...(res.questions as QuestionDraft[])]);
      setAiOpen(false);
      toast.success(`Generated ${res.questions.length} questions`);
    } catch (e: any) {
      toast.error(e?.message ?? "AI generation failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleNotesFile(file: File | null) {
    if (!file) return;
    if (file.size > 15_000_000) return toast.error("File too large (max 15MB)");
    const name = file.name.toLowerCase();
    try {
      let text = "";
      if (name.endsWith(".pdf")) {
        const pdfjs: any = await import("pdfjs-dist");
        // Use a bundled worker to avoid CDN/CORS issues
        const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
        const buf = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buf }).promise;
        const parts: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          parts.push(content.items.map((it: any) => it.str).join(" "));
        }
        text = parts.join("\n\n");
      } else if (name.endsWith(".docx")) {
        const mammoth: any = await import(/* @vite-ignore */ "mammoth/mammoth.browser" as any);
        const buf = await file.arrayBuffer();
        const res = await mammoth.extractRawText({ arrayBuffer: buf });
        text = res.value;
      } else if (name.endsWith(".doc")) {
        return toast.error("Legacy .doc not supported — please save as .docx or PDF");
      } else {
        text = await file.text();
      }
      if (!text.trim()) return toast.error("Could not extract text from file");
      setAiNotes((prev) => (prev ? prev + "\n\n" : "") + text);
      setAiNotesFileName(file.name);
      toast.success(`Loaded ${file.name}`);
    } catch (e: any) {
      toast.error(`Failed to read file: ${e?.message ?? "unknown error"}`);
    }
  }


  async function handleSave() {
    if (!title.trim()) return toast.error("Add a title");
    if (questions.length === 0) return toast.error("Add at least one question");
    for (const q of questions) {
      if (!q.question_text.trim()) return toast.error("All questions need text");
      if (q.type === "matching") {
        const pairs = (q.options ?? []).map((p) => p.split("|").map((s) => s.trim())).filter((p) => p[0] && p[1]);
        if (pairs.length < 2) return toast.error("Matching questions need at least 2 pairs");
        q.options = pairs.map((p) => `${p[0]}|${p[1]}`);
        q.correct_answer = pairs.map((p) => `${p[0]}|${p[1]}`).join(";");
      } else if (q.type !== "fill_blank" && q.type !== "poll" && !q.correct_answer) {
        return toast.error("Mark the correct answer for each question");
      }
    }
    setSaving(true);
    try {
      const res = await save({ data: { id: initial?.id, title, description, visibility, questions } });
      toast.success("Saved!");
      navigate({ to: "/quizzes/$id/edit", params: { id: res.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-card border-2">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Intro to Computer Networks" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {aiOpen && (
        <Card className="p-6 border-2 border-primary/40 bg-primary/5">
          <div className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-primary" /> AI Quiz Generator</div>
          <div className="grid sm:grid-cols-[1fr_120px_auto] gap-3 mt-4 items-end">
            <div>
              <Label>Topic</Label>
              <Input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="e.g. Photosynthesis" />
            </div>
            <div>
              <Label>Questions</Label>
              <Input type="number" min={3} max={50} value={aiCount} onChange={(e) => setAiCount(parseInt(e.target.value) || 8)} />
            </div>
            <Button onClick={handleAI} disabled={aiLoading} className="bg-gradient-primary">
              {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Generate
            </Button>
          </div>
          <div className="mt-4">
            <Label>Include these question types</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {AI_TYPES.map((t) => {
                const on = !!aiTypes[t.value];
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setAiTypes((s) => ({ ...s, [t.value]: !s[t.value] }))}
                    className={`px-3 py-1.5 rounded-full text-sm border-2 transition ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background border-muted-foreground/20 hover:border-primary/40"}`}
                  >
                    {on ? "✓ " : ""}{t.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4">
            <Label>Notes / source material (optional)</Label>
            <Textarea
              rows={5}
              value={aiNotes}
              onChange={(e) => setAiNotes(e.target.value)}
              placeholder="Paste class notes, a chapter summary, or any reference text the AI should base questions on..."
            />
            <div className="mt-2 flex items-center gap-3 text-sm">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-background hover:bg-muted">
                <input
                  type="file"
                  accept=".txt,.md,.markdown,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => handleNotesFile(e.target.files?.[0] ?? null)}
                />
                Upload .txt / .md / .pdf / .docx
              </label>

              {aiNotesFileName && <span className="text-muted-foreground">Loaded: {aiNotesFileName}</span>}
              {aiNotes && (
                <button type="button" className="text-muted-foreground underline" onClick={() => { setAiNotes(""); setAiNotesFileName(null); }}>
                  Clear notes
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <QuestionCard
            key={idx}
            q={q}
            index={idx}
            onChange={(nq) => setQuestions((qs) => qs.map((x, i) => i === idx ? nq : x))}
            onRemove={() => setQuestions((qs) => qs.filter((_, i) => i !== idx))}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="text-sm text-muted-foreground w-full mb-1">Add a question:</div>
        <Button variant="outline" onClick={() => addQuestion("multiple_choice")}><Plus className="size-4" /> Multiple choice</Button>
        <Button variant="outline" onClick={() => addQuestion("true_false")}><Plus className="size-4" /> True / False</Button>
        <Button variant="outline" onClick={() => addQuestion("fill_blank")}><Plus className="size-4" /> Fill in the blank</Button>
        <Button variant="outline" onClick={() => addQuestion("matching")}><Plus className="size-4" /> Matching</Button>
        <Button variant="outline" onClick={() => addQuestion("poll")}><Plus className="size-4" /> Poll</Button>
        {!aiOpen && (
          <Button variant="outline" onClick={() => setAiOpen(true)}>
            <Sparkles className="size-4" /> Generate with AI
          </Button>
        )}
      </div>

      <div className="sticky bottom-4 z-10 flex flex-wrap justify-end gap-2">
        <Button size="lg" variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
          Cancel
        </Button>
        <Button size="lg" onClick={handleSave} disabled={saving} className="bg-gradient-primary shadow-elegant">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {saving ? "Saving..." : "Save quiz"}
        </Button>
      </div>
    </div>
  );
}

function QuestionCard({ q, index, onChange, onRemove }: { q: QuestionDraft; index: number; onChange: (q: QuestionDraft) => void; onRemove: () => void }) {
  function setOpt(i: number, v: string) {
    const opts = [...q.options];
    opts[i] = v;
    onChange({ ...q, options: opts });
  }
  return (
    <Card className="p-5 border-2">
      <div className="flex justify-between items-start gap-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Q{index + 1} · {q.type.replace("_", " ")}</div>
        <Button size="sm" variant="ghost" onClick={onRemove} aria-label="Remove question">
          <Trash2 className="size-4" /> Remove
        </Button>
      </div>
      <Textarea
        className="mt-2 text-base"
        rows={2}
        value={q.question_text}
        onChange={(e) => onChange({ ...q, question_text: e.target.value })}
        placeholder="Question text"
      />
      {q.type === "fill_blank" ? (
        <div className="mt-3">
          <Label>Correct answer</Label>
          <Input value={q.correct_answer} onChange={(e) => onChange({ ...q, correct_answer: e.target.value })} />
          <p className="text-xs text-muted-foreground mt-1">Tip: use "___" in your question text where the blank goes.</p>
        </div>
      ) : q.type === "matching" ? (
        <div className="mt-3 space-y-2">
          <Label>Pairs (left ↔ right)</Label>
          {q.options.map((pair, i) => {
            const [left = "", right = ""] = pair.split("|");
            const setPair = (l: string, r: string) => setOpt(i, `${l}|${r}`);
            return (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                <Input value={left} placeholder={`Left ${i + 1}`} onChange={(e) => setPair(e.target.value, right)} />
                <span className="text-muted-foreground">↔</span>
                <Input value={right} placeholder={`Right ${i + 1}`} onChange={(e) => setPair(left, e.target.value)} />
                <Button size="sm" variant="ghost" onClick={() => onChange({ ...q, options: q.options.filter((_, j) => j !== i) })} aria-label="Remove pair">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
          <Button size="sm" variant="outline" onClick={() => onChange({ ...q, options: [...q.options, "|"] })}>
            <Plus className="size-4" /> Add pair
          </Button>
        </div>
      ) : (
        <div className="mt-3 grid sm:grid-cols-2 gap-2">
          {q.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...q, correct_answer: o })}
                className={`size-7 shrink-0 rounded-full grid place-items-center border-2 ${q.correct_answer === o && o ? "bg-success border-success text-success-foreground" : "border-muted-foreground/30"}`}
                title="Mark correct"
              >
                {q.correct_answer === o && o ? <Check className="size-4" /> : null}
              </button>
              <Input
                value={o}
                disabled={q.type === "true_false"}
                onChange={(e) => {
                  const newVal = e.target.value;
                  const wasCorrect = q.correct_answer === o;
                  setOpt(i, newVal);
                  if (wasCorrect) onChange({ ...q, options: q.options.map((x, j) => j === i ? newVal : x), correct_answer: newVal });
                }}
                placeholder={`Option ${i + 1}`}
              />
            </div>
          ))}
        </div>
      )}
      <div className="grid sm:grid-cols-3 gap-3 mt-4">
        <div>
          <Label>Timer (s)</Label>
          <Input type="number" min={5} max={120} value={q.timer_seconds} onChange={(e) => onChange({ ...q, timer_seconds: parseInt(e.target.value) || 20 })} />
        </div>
        <div>
          <Label>Points</Label>
          <Input type="number" min={0} value={q.points} onChange={(e) => onChange({ ...q, points: parseInt(e.target.value) || 100 })} />
        </div>
        <div>
          <Label>Image URL</Label>
          <Input value={q.image_url ?? ""} onChange={(e) => onChange({ ...q, image_url: e.target.value })} placeholder="Optional" />
        </div>
      </div>
      <div className="mt-3">
        <Label>Explanation (optional)</Label>
        <Textarea rows={2} value={q.explanation ?? ""} onChange={(e) => onChange({ ...q, explanation: e.target.value })} />
      </div>
    </Card>
  );
}
