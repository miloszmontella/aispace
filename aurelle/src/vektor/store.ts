import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createDemo } from "@/vektor/demo";
import { uid, ymd } from "@/vektor/logic";
import type { HabitIconName, Note, Settings, Snapshot, Task, TimerState } from "@/vektor/types";

const seed = createDemo();

type Actions = {
  toggleTask: (id: string) => void;
  saveTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  toggleHabit: (id: string, day: string) => void;
  addHabit: (title: string, icon: HabitIconName) => void;
  deleteHabit: (id: string) => void;
  saveNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;
  patchSettings: (patch: Partial<Settings>) => void;
  setPreset: (minutes: number) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  completeFocus: () => void;
  applySnapshot: (snapshot: Snapshot) => void;
  resetDemo: () => void;
};

function blankTimer(minutes = 25): TimerState {
  const totalMs = minutes * 60_000;
  return { running: false, endsAt: null, remainingMs: totalMs, totalMs };
}

export const useVektor = create<Snapshot & Actions>()(
  persist(
    (set, get) => ({
      ...seed,
      toggleTask: (id) =>
        set({
          tasks: get().tasks.map((task) => {
            if (task.id !== id) return task;
            const done = !task.done;
            return { ...task, done, doneAt: done ? ymd(new Date()) : null };
          }),
        }),
      saveTask: (task) => {
        const tasks = get().tasks;
        const exists = tasks.some((item) => item.id === task.id);
        set({
          tasks: exists ? tasks.map((item) => (item.id === task.id ? task : item)) : [task, ...tasks],
        });
      },
      deleteTask: (id) => set({ tasks: get().tasks.filter((task) => task.id !== id) }),
      toggleHabit: (id, day) =>
        set({
          habits: get().habits.map((habit) => {
            if (habit.id !== id) return habit;
            const has = habit.checks.includes(day);
            return {
              ...habit,
              checks: has ? habit.checks.filter((value) => value !== day) : [...habit.checks, day],
            };
          }),
        }),
      addHabit: (title, icon) =>
        set({
          habits: [...get().habits, { id: uid(), title, icon, checks: [] }],
        }),
      deleteHabit: (id) => set({ habits: get().habits.filter((habit) => habit.id !== id) }),
      saveNote: (note) => {
        const notes = get().notes;
        const exists = notes.some((item) => item.id === note.id);
        set({
          notes: exists ? notes.map((item) => (item.id === note.id ? note : item)) : [note, ...notes],
        });
      },
      deleteNote: (id) => set({ notes: get().notes.filter((note) => note.id !== id) }),
      togglePin: (id) =>
        set({
          notes: get().notes.map((note) => (note.id === id ? { ...note, pinned: !note.pinned, updatedAt: Date.now() } : note)),
        }),
      patchSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      setPreset: (minutes) => set({ timer: blankTimer(minutes) }),
      startTimer: () => {
        const timer = get().timer;
        const remaining = timer.remainingMs > 0 ? timer.remainingMs : timer.totalMs;
        set({
          timer: { ...timer, running: true, remainingMs: remaining, endsAt: Date.now() + remaining },
        });
      },
      pauseTimer: () => {
        const timer = get().timer;
        if (!timer.running || !timer.endsAt) return;
        set({
          timer: {
            ...timer,
            running: false,
            endsAt: null,
            remainingMs: Math.max(0, timer.endsAt - Date.now()),
          },
        });
      },
      completeFocus: () => {
        const timer = get().timer;
        if (!timer.running && timer.remainingMs > 0) return;
        const minutes = Math.max(1, Math.round(timer.totalMs / 60_000));
        set({
          timer: blankTimer(Math.round(timer.totalMs / 60_000)),
          sessions: [{ id: uid(), minutes, at: Date.now() }, ...get().sessions].slice(0, 40),
        });
      },
      applySnapshot: (snapshot) => set({ ...snapshot }),
      resetDemo: () => set({ ...createDemo(new Date()) }),
    }),
    {
      name: "vektor-v1",
      skipHydration: true,
      partialize: (state) => ({
        tasks: state.tasks,
        habits: state.habits,
        notes: state.notes,
        sessions: state.sessions,
        settings: state.settings,
        timer: state.timer,
      }),
    },
  ),
);
