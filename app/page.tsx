"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useRef, useState } from "react";

const practitionerOptions = [
  "Occupational Therapy",
  "Physiotherapy",
  "Speech Therapy",
  "Psychology",
  "Social Work",
  "Dietitian",
  "Exercise Physiology",
];

function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value?: Date;
  onChange: (date?: Date) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover>
        <PopoverTrigger
          id={id}
          type="button"
          className="flex h-11 w-full items-center justify-between rounded-xl border border-border/70 bg-background px-3 text-left font-normal text-foreground shadow-sm transition-colors hover:bg-accent"
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {value ? format(value, "PPP") : "Pick a date"}
          </span>
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

type ParticipantFormState = {
  name: string;
  ndis_number: string;
  plan_start?: Date;
  plan_end?: Date;
  practitioner: string;
  discipline: string;
};

function ParticipantForm({
  formData,
  onFieldChange,
}: {
  formData: ParticipantFormState;
  onFieldChange: <K extends keyof ParticipantFormState>(
    key: K,
    value: ParticipantFormState[K],
  ) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl rounded-3xl border border-border/70 bg-card p-6 shadow-xl shadow-slate-900/5 ring-1 ring-border/60 backdrop-blur-sm md:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary/80">
            Participant details
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            NDIS intake form
          </h1>
        </div>
        <div className="hidden rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary md:block">
          Ready for report generation
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(event) => onFieldChange("name", event.target.value)}
            placeholder="Alex Nguyen"
            className="h-11 rounded-xl border-border/70 bg-background shadow-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ndis_number">NDIS number</Label>
          <Input
            id="ndis_number"
            type="text"
            value={formData.ndis_number}
            onChange={(event) =>
              onFieldChange("ndis_number", event.target.value)
            }
            placeholder="430000001"
            className="h-11 rounded-xl border-border/70 bg-background shadow-sm"
          />
        </div>

        <DateField
          id="plan_start"
          label="Plan start"
          value={formData.plan_start}
          onChange={(date) => onFieldChange("plan_start", date)}
        />

        <DateField
          id="plan_end"
          label="Plan end"
          value={formData.plan_end}
          onChange={(date) => onFieldChange("plan_end", date)}
        />

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="practitioner">Practitioner</Label>
          <Select
            value={formData.practitioner}
            onValueChange={(value) =>
              onFieldChange("practitioner", value ?? "")
            }
          >
            <SelectTrigger
              id="practitioner"
              className="h-11 w-full rounded-xl border-border/70 bg-background shadow-sm"
            >
              <SelectValue placeholder="Select practitioner" />
            </SelectTrigger>
            <SelectContent>
              {practitionerOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="discipline">Discipline</Label>
          <Input
            id="discipline"
            type="text"
            value={formData.discipline}
            onChange={(event) =>
              onFieldChange("discipline", event.target.value)
            }
            placeholder="Occupational Therapy"
            className="h-11 rounded-xl border-border/70 bg-background shadow-sm"
          />
        </div>
      </div>

      {/* <div className="flex flex-col-reverse gap-3 border-t border-border/60 pt-6 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="h-11 min-w-[140px] rounded-xl">
            Clear
          </Button>
          <Button type="button" className="h-11 min-w-[180px] rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            Generate Report
          </Button>
        </div> */}
    </div>
  );
}

type Goal = { id: string; text: string };

function GoalRow({
  goal,
  index,
  isFirst,
  isLast,
  onMove,
  onDelete,
  onDragStart,
  onDrop,
}: {
  goal: Goal;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMove: (fromIndex: number, toIndex: number) => void;
  onDelete: (index: number) => void;
  onDragStart: (index: number) => void;
  onDrop: (index: number) => void;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDrop(index)}
      className="flex items-center gap-3 rounded-xl border border-border/70 bg-background p-3 shadow-sm"
    >
      <button
        type="button"
        aria-label="Drag goal"
        className="cursor-grab rounded-md border border-border/70 bg-muted px-2 py-1 text-xs text-muted-foreground"
      >
        ☰
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{goal.text}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onMove(index, index - 1)}
          disabled={isFirst}
          className="h-8 w-8 rounded-md p-0"
          aria-label={`Move goal up`}
        >
          ↑
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onMove(index, index + 1)}
          disabled={isLast}
          className="h-8 w-8 rounded-md p-0"
          aria-label={`Move goal down`}
        >
          ↓
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => onDelete(index)}
          className="h-8 rounded-md"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function GoalForm({
  draftGoal,
  goals,
  onAddGoal: onAddGoal,
  onDraftChange,
  onMoveGoal,
  onDelete,
}: {
  draftGoal: string;
  goals: Goal[];
  onAddGoal: () => void;
  onDraftChange: (value: string) => void;
  onMoveGoal: (fromIndex: number, toIndex: number) => void;
  onDelete: (index: number) => void;
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDropGoal = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      return;
    }

    onMoveGoal(draggedIndex, targetIndex);
    setDraggedIndex(null);
  };

  return (
    <div className="mx-auto mt-8 w-full max-w-5xl rounded-3xl border border-border/70 bg-card p-6 shadow-xl shadow-slate-900/5 ring-1 ring-border/60 backdrop-blur-sm md:p-8">
      <div className="mb-4">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary/80">
          Goal
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Plan goals
        </h2>
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal">Add a goal</Label>
        <Textarea
          id="goal"
          value={draftGoal}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="e.g. Improve confidence and independence with personal care tasks and meal preparation."
          className="min-h-[100px] rounded-xl border-border/70 bg-background shadow-sm resize-none"
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={onAddGoal}
          className="h-11 min-w-[180px] rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"
        >
          Add Goal
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {goals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            No goals added yet.
          </div>
        ) : (
          goals.map((goal, index) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              index={index}
              isFirst={index === 0}
              isLast={index === goals.length - 1}
              onMove={onMoveGoal}
              onDelete={onDelete}
              onDragStart={setDraggedIndex}
              onDrop={handleDropGoal}
            />
          ))
        )}
      </div>
    </div>
  );
}

type NoteFormState = { id: string; label: string; text: string };

function NoteRow({
  note,
  index,
  isFirst,
  isLast,
  onMove,
  onDelete,
  onDragStart,
  onDrop,
}: {
  note: NoteFormState;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMove: (fromIndex: number, toIndex: number) => void;
  onDelete: (index: number) => void;
  onDragStart: (index: number) => void;
  onDrop: (index: number) => void;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDrop(index)}
      className="flex items-center gap-3 rounded-xl border border-border/70 bg-background p-3 shadow-sm"
    >
      <button
        type="button"
        aria-label="Drag note"
        className="cursor-grab rounded-md border border-border/70 bg-muted px-2 py-1 text-xs text-muted-foreground"
      >
        ☰
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-primary/70">
          {note.label ? format(new Date(note.label), "PPP") : "No date"}
        </p>
        <p className="truncate text-sm text-foreground">{note.text}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onMove(index, index - 1)}
          disabled={isFirst}
          className="h-8 w-8 rounded-md p-0"
          aria-label={`Move note up`}
        >
          ↑
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onMove(index, index + 1)}
          disabled={isLast}
          className="h-8 w-8 rounded-md p-0"
          aria-label={`Move note down`}
        >
          ↓
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => onDelete(index)}
          className="h-8 rounded-md"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function NotesForm({
  notes,
  draftNote,
  onDraftChange,
  onAddNote,
  onMoveNote,
  onDeleteNote,
}: {
  notes: NoteFormState[];
  draftNote: NoteFormState;
  onDraftChange: (value: NoteFormState) => void;
  onAddNote: () => void;
  onMoveNote: (fromIndex: number, toIndex: number) => void;
  onDeleteNote: (index: number) => void;
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDropNote = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      return;
    }

    onMoveNote(draggedIndex, targetIndex);
    setDraggedIndex(null);
  };

  return (
    <div className="mx-auto mt-8 w-full max-w-5xl rounded-3xl border border-border/70 bg-card p-6 shadow-xl shadow-slate-900/5 ring-1 ring-border/60 backdrop-blur-sm md:p-8">
      <div className="mb-4">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary/80">
          Notes
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Session note
        </h2>
      </div>

      <div className="space-y-6">
        <div className="max-w-xs space-y-2">
          <Label htmlFor="note-label">Label</Label>
          <Popover>
            <PopoverTrigger
              id="note-label"
              type="button"
              className="flex h-11 w-full items-center justify-between rounded-xl border border-border/70 bg-background px-3 text-left font-normal text-foreground shadow-sm transition-colors hover:bg-accent"
            >
              <span
                className={
                  draftNote.label ? "text-foreground" : "text-muted-foreground"
                }
              >
                {draftNote.label
                  ? format(new Date(draftNote.label), "PPP")
                  : "Pick a date"}
              </span>

              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={
                  draftNote.label ? new Date(draftNote.label) : undefined
                }
                onSelect={(date) =>
                  onDraftChange({
                    ...draftNote,
                    label: date ? format(date, "yyyy-MM-dd") : "",
                  })
                }
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="note-text">Text</Label>
          <Textarea
            id="note-text"
            value={draftNote.text}
            onChange={(event) =>
              onDraftChange({ ...draftNote, text: event.target.value })
            }
            placeholder="Write the session note text here..."
            className="min-h-[180px] rounded-xl border-border/70 bg-background shadow-sm resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={onAddNote}
          className="h-11 min-w-[180px] rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"
        >
          Add Note
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            No notes added yet.
          </div>
        ) : (
          notes.map((note, index) => (
            <NoteRow
              key={note.id}
              note={note}
              index={index}
              isFirst={index === 0}
              isLast={index === notes.length - 1}
              onMove={onMoveNote}
              onDelete={onDeleteNote}
              onDragStart={setDraggedIndex}
              onDrop={handleDropNote}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [participant, setParticipant] = useState<ParticipantFormState>({
    name: "",
    ndis_number: "",
    plan_start: undefined as Date | undefined,
    plan_end: undefined as Date | undefined,
    practitioner: "",
    discipline: "",
  });

  const updateParticipantField = <K extends keyof ParticipantFormState>(
    key: K,
    value: ParticipantFormState[K],
  ) => {
    setParticipant((prev) => ({ ...prev, [key]: value }));
  };

  const [draftGoal, setDraftGoal] = useState<string>("");
  const [newGoals, setNewGoals] = useState<Goal[]>([]);

  const addGoal = () => {
    const nextGoal = draftGoal.trim();
    if (!nextGoal) {
      return;
    }
    setNewGoals((currentGoals) => [
      ...currentGoals,
      { id: crypto.randomUUID(), text: nextGoal },
    ]);
    setDraftGoal("");
  };

  const moveGoal = (fromIndex: number, toIndex: number) => {
    setNewGoals((currentGoals) => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
        return currentGoals;
      }

      const updatedGoals = [...currentGoals];
      const [movedItem] = updatedGoals.splice(fromIndex, 1);
      updatedGoals.splice(toIndex, 0, movedItem);
      return updatedGoals;
    });
  };

  const deleteGoal = (indexToDelete: number) => {
    setNewGoals((currentGoals) =>
      currentGoals.filter((_, index) => index !== indexToDelete),
    );
  };

  const [draftNote, setDraftNote] = useState<NoteFormState>({
    id: "",
    label: "",
    text: "",
  });
  const [notes, setNotes] = useState<NoteFormState[]>([]);

  const addNote = () => {
    const nextText = draftNote.text.trim();
    if (!nextText) {
      return;
    }

    setNotes((currentNote) => [
      ...currentNote,
      { id: crypto.randomUUID(), label: draftNote.label, text: nextText },
    ]);
    setDraftNote({ id: "", label: "", text: "" });
  };

  const moveNote = (fromIndex: number, toIndex: number) => {
    setNotes((currentNotes) => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
        return currentNotes;
      }

      const updatedNotes = [...currentNotes];
      const [movedItem] = updatedNotes.splice(fromIndex, 1);
      updatedNotes.splice(toIndex, 0, movedItem);
      return updatedNotes;
    });
  };

  const deleteNote = (indexToDelete: number) => {
    setNotes((currentNotes) =>
      currentNotes.filter((_, index) => index !== indexToDelete),
    );
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  const [error, setError] = useState<string>();

  const handleGenerateReport = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const goals = newGoals.map((goal) => goal.text);
      const agrs = { participant, goals, notes };
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agrs),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "An unexpected error occurred.");
      }

      const { report, usage } = await res.json();
      console.log(report);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
      console.log(err);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 md:p-10">
      <ParticipantForm
        formData={participant}
        onFieldChange={updateParticipantField}
      />
      <GoalForm
        draftGoal={draftGoal}
        goals={newGoals}
        onAddGoal={addGoal}
        onDraftChange={setDraftGoal}
        onMoveGoal={moveGoal}
        onDelete={deleteGoal}
      />
      <NotesForm
        notes={notes}
        draftNote={draftNote}
        onDraftChange={setDraftNote}
        onAddNote={addNote}
        onMoveNote={moveNote}
        onDeleteNote={deleteNote}
      />
      <div className="mx-auto mt-8 flex w-full max-w-5xl justify-end">
        <Button
          type="button"
          onClick={handleGenerateReport}
          className="h-11 min-w-[180px] rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"
        >
          Generate Report
        </Button>
      </div>
    </main>
  );
}
