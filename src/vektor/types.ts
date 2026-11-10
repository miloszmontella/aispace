export type ListId = "inbox" | "work" | "home" | "later";
export type Priority = "none" | "low" | "mid" | "high";
export type Accent = "lagoon" | "amber" | "clay";
export type Mode = "dark" | "light";
export type HabitIconName = "droplets" | "footprints" | "book" | "moon" | "dumbbell" | "coffee";
export type TabId = "today" | "tasks" | "habits" | "notes" | "more";

export type Task = {
  id: string;
  title: string;
  notes: string;
  list: ListId;
  priority: Priority;
  due: string | null;
  done: boolean;
  doneAt: string | null;
  createdAt: number;
};

export type Habit = {
  id: string;
  title: string;
  icon: HabitIconName;
  checks: string[];
};

export type Note = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  updatedAt: number;
};

export type Session = {
  id: string;
  minutes: number;
  at: number;
};

export type Settings = {
  name: string;
  mode: Mode;
  accent: Accent;
};

export type TimerState = {
  running: boolean;
  endsAt: number | null;
  remainingMs: number;
  totalMs: number;
};

export type Snapshot = {
  tasks: Task[];
  habits: Habit[];
  notes: Note[];
  sessions: Session[];
  settings: Settings;
  timer: TimerState;
};
