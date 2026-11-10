import type {
  Accent,
  Habit,
  HabitIconName,
  ListId,
  Mode,
  Note,
  Priority,
  Session,
  Settings,
  Snapshot,
  Task,
  TimerState,
} from "@/vektor/types";

const WEEKDAY = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const MONTH = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const RANK: Record<Priority, number> = { high: 0, mid: 1, low: 2, none: 3 };

export function uid(): string {
  return crypto.randomUUID();
}

export function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseYmd(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

export function addDays(value: string, days: number): string {
  const date = parseYmd(value);
  date.setDate(date.getDate() + days);
  return ymd(date);
}

export function weekdayShort(value: string): string {
  return WEEKDAY[parseYmd(value).getDay()] ?? "";
}

export function weekOf(anchor: string): string[] {
  const js = parseYmd(anchor).getDay();
  const mondayOffset = js === 0 ? -6 : 1 - js;
  const monday = addDays(anchor, mondayOffset);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 5) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

export function longDate(now: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
}

export function formatDue(due: string, today: string): string {
  if (due === today) return "сегодня";
  if (due === addDays(today, 1)) return "завтра";
  if (due === addDays(today, -1)) return "вчера";
  const date = parseYmd(due);
  return `${date.getDate()} ${MONTH[date.getMonth()]}`;
}

export function isOverdue(due: string | null, today: string, done: boolean): boolean {
  return Boolean(due && !done && due < today);
}

export function streak(checks: string[], today: string): number {
  const set = new Set(checks);
  let cursor = today;
  if (!set.has(cursor)) {
    cursor = addDays(today, -1);
    if (!set.has(cursor)) return 0;
  }
  let count = 0;
  while (set.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const ad = a.due ?? "9999-99-99";
    const bd = b.due ?? "9999-99-99";
    if (ad !== bd) return ad < bd ? -1 : 1;
    if (RANK[a.priority] !== RANK[b.priority]) return RANK[a.priority] - RANK[b.priority];
    return b.createdAt - a.createdAt;
  });
}

export function todayQueue(tasks: Task[], today: string): Task[] {
  return sortTasks(
    tasks.filter((task) => task.doneAt === today || (task.due !== null && task.due <= today && !task.done)),
  );
}

export function focusMinutesOn(sessions: Session[], day: string): number {
  return sessions.filter((session) => ymd(new Date(session.at)) === day).reduce((sum, session) => sum + session.minutes, 0);
}

export function checkedOn(habit: Habit, day: string): boolean {
  return habit.checks.includes(day);
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function remainingMs(timer: { running: boolean; endsAt: number | null; remainingMs: number }, now: number): number {
  if (timer.running && timer.endsAt) return Math.max(0, timer.endsAt - now);
  return timer.remainingMs;
}

const LISTS = new Set<ListId>(["inbox", "work", "home", "later"]);
const PRIORITIES = new Set<Priority>(["none", "low", "mid", "high"]);
const ICONS = new Set<HabitIconName>(["droplets", "footprints", "book", "moon", "dumbbell", "coffee"]);
const ACCENTS = new Set<Accent>(["lagoon", "amber", "clay"]);
const MODES = new Set<Mode>(["dark", "light"]);

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseSnapshot(raw: unknown): Snapshot | null {
  const root = record(raw);
  if (!root || !Array.isArray(root.tasks) || !Array.isArray(root.habits) || !Array.isArray(root.notes)) return null;

  const tasks: Task[] = [];
  for (const item of root.tasks) {
    const row = record(item);
    if (!row) continue;
    const title = text(row.title).trim();
    if (!title) continue;
    const list = LISTS.has(row.list as ListId) ? (row.list as ListId) : "inbox";
    const priority = PRIORITIES.has(row.priority as Priority) ? (row.priority as Priority) : "none";
    const due = typeof row.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.due) ? row.due : null;
    const done = row.done === true;
    tasks.push({
      id: text(row.id) || uid(),
      title: title.slice(0, 140),
      notes: text(row.notes).slice(0, 2000),
      list,
      priority,
      due,
      done,
      doneAt: done && typeof row.doneAt === "string" ? row.doneAt : done ? due : null,
      createdAt: typeof row.createdAt === "number" ? row.createdAt : Date.now(),
    });
  }

  const habits: Habit[] = [];
  for (const item of root.habits) {
    const row = record(item);
    if (!row) continue;
    const title = text(row.title).trim();
    if (!title) continue;
    const checks = Array.isArray(row.checks) ? row.checks.filter((value): value is string => typeof value === "string") : [];
    habits.push({
      id: text(row.id) || uid(),
      title: title.slice(0, 80),
      icon: ICONS.has(row.icon as HabitIconName) ? (row.icon as HabitIconName) : "droplets",
      checks,
    });
  }

  const notes: Note[] = [];
  for (const item of root.notes) {
    const row = record(item);
    if (!row) continue;
    const title = text(row.title).trim();
    const body = text(row.body);
    if (!title && !body.trim()) continue;
    notes.push({
      id: text(row.id) || uid(),
      title: (title || "Без названия").slice(0, 120),
      body: body.slice(0, 8000),
      pinned: row.pinned === true,
      updatedAt: typeof row.updatedAt === "number" ? row.updatedAt : Date.now(),
    });
  }

  const sessions: Session[] = [];
  if (Array.isArray(root.sessions)) {
    for (const item of root.sessions) {
      const row = record(item);
      if (!row || typeof row.minutes !== "number" || typeof row.at !== "number") continue;
      sessions.push({ id: text(row.id) || uid(), minutes: Math.max(1, Math.round(row.minutes)), at: row.at });
    }
  }

  const settingsRow = record(root.settings);
  const settings: Settings = {
    name: text(settingsRow?.name, "Алекс").slice(0, 40),
    mode: MODES.has(settingsRow?.mode as Mode) ? (settingsRow?.mode as Mode) : "dark",
    accent: ACCENTS.has(settingsRow?.accent as Accent) ? (settingsRow?.accent as Accent) : "lagoon",
  };

  const timerRow = record(root.timer);
  const totalMs = typeof timerRow?.totalMs === "number" ? timerRow.totalMs : 25 * 60_000;
  const timer: TimerState = {
    running: false,
    endsAt: null,
    totalMs,
    remainingMs: typeof timerRow?.remainingMs === "number" ? timerRow.remainingMs : totalMs,
  };

  return { tasks, habits, notes, sessions: sessions.slice(0, 40), settings, timer };
}
