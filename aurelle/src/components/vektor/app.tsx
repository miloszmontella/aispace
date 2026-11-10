import { useEffect, useState } from "react";
import { Ellipsis, LayoutDashboard, ListChecks, NotebookPen, Repeat } from "lucide-react";
import "@fontsource-variable/manrope";
import { NoteEditor, TaskEditor } from "@/components/vektor/editors";
import { HabitsScreen } from "@/components/vektor/habits";
import { MoreScreen } from "@/components/vektor/more";
import { NotesScreen } from "@/components/vektor/notes";
import { TasksScreen } from "@/components/vektor/tasks";
import { TodayScreen } from "@/components/vektor/today";
import { cn } from "@/components/vektor/ui";
import { useVektor } from "@/vektor/store";
import type { Note, TabId, Task } from "@/vektor/types";

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "today", label: "Сегодня", icon: LayoutDashboard },
  { id: "tasks", label: "Дела", icon: ListChecks },
  { id: "habits", label: "Привычки", icon: Repeat },
  { id: "notes", label: "Заметки", icon: NotebookPen },
  { id: "more", label: "Ещё", icon: Ellipsis },
];

export function VektorApp() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void Promise.resolve(useVektor.persist.rehydrate())
      .catch(() => {
        useVektor.persist.clearStorage();
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!ready) {
    return (
      <div className="vektor-root flex min-h-dvh items-center justify-center">
        <div className="text-center">
          <p className="text-xs font-medium tracking-widest text-muted">СИСТЕМА ДНЯ</p>
          <p className="mt-2 text-4xl font-semibold">ВЕКТОР</p>
        </div>
      </div>
    );
  }

  return <Shell />;
}

function Shell() {
  const settings = useVektor((state) => state.settings);
  const [tab, setTab] = useState<TabId>("today");
  const [now, setNow] = useState(() => new Date());
  const [task, setTask] = useState<Task | null | "new">(null);
  const [note, setNote] = useState<Note | null | "new">(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div data-mode={settings.mode} data-accent={settings.accent} className="vektor-root min-h-dvh">
      <div className="vektor-shell">
        <main className="min-h-0 flex-1 overflow-y-auto">
          {tab === "today" ? (
            <TodayScreen now={now} onOpenTask={(item) => setTask(item)} onAddTask={() => setTask("new")} />
          ) : null}
          {tab === "tasks" ? (
            <TasksScreen now={now} onOpenTask={(item) => setTask(item)} onAddTask={() => setTask("new")} />
          ) : null}
          {tab === "habits" ? <HabitsScreen now={now} /> : null}
          {tab === "notes" ? <NotesScreen onOpen={(item) => setNote(item ?? "new")} /> : null}
          {tab === "more" ? <MoreScreen now={now} /> : null}
        </main>
        <nav className="nav-pad grid grid-cols-5 border-t border-line bg-surface" aria-label="Разделы">
          {TABS.map((item) => {
            const Icon = item.icon;
            const on = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium transition-transform duration-150 ease-out active:scale-[0.96]",
                  on ? "text-accent" : "text-muted",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={on ? 2.4 : 2} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <TimerEngine />
        {task !== null ? <TaskEditor task={task === "new" ? null : task} onClose={() => setTask(null)} /> : null}
        {note !== null ? <NoteEditor note={note === "new" ? null : note} onClose={() => setNote(null)} /> : null}
      </div>
    </div>
  );
}

function TimerEngine() {
  const running = useVektor((state) => state.timer.running);
  const endsAt = useVektor((state) => state.timer.endsAt);
  const completeFocus = useVektor((state) => state.completeFocus);

  useEffect(() => {
    if (!running || !endsAt) return;
    let closed = false;
    const tick = () => {
      if (closed) return;
      if (Date.now() >= endsAt) {
        closed = true;
        completeFocus();
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => {
      closed = true;
      clearInterval(id);
    };
  }, [running, endsAt, completeFocus]);

  return null;
}
