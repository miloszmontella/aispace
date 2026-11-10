import { Flag, Plus } from "lucide-react";
import { HABIT_ICON } from "@/components/vektor/icons";
import { CheckDot, cn, IconAction, Screen } from "@/components/vektor/ui";
import { LIST_LABEL } from "@/vektor/labels";
import { focusMinutesOn, formatDue, greeting, isOverdue, longDate, todayQueue, ymd } from "@/vektor/logic";
import { useVektor } from "@/vektor/store";
import type { Task } from "@/vektor/types";

export function TodayScreen({
  now,
  onOpenTask,
  onAddTask,
}: {
  now: Date;
  onOpenTask: (task: Task) => void;
  onAddTask: () => void;
}) {
  const tasks = useVektor((state) => state.tasks);
  const habits = useVektor((state) => state.habits);
  const sessions = useVektor((state) => state.sessions);
  const name = useVektor((state) => state.settings.name);
  const toggleTask = useVektor((state) => state.toggleTask);
  const toggleHabit = useVektor((state) => state.toggleHabit);
  const today = ymd(now);
  const queue = todayQueue(tasks, today);
  const closed = queue.filter((task) => task.done).length;
  const total = queue.length;
  const ratio = total === 0 ? 0 : Math.round((closed / total) * 100);
  const focus = focusMinutesOn(sessions, today);
  const hello = name.trim() ? `${greeting(now)}, ${name.trim()}` : greeting(now);

  return (
    <Screen
      title={hello}
      action={
        <IconAction label="Новое дело" onClick={onAddTask}>
          <Plus className="h-5 w-5" />
        </IconAction>
      }
    >
      <p className="-mt-2 text-sm capitalize text-muted">{longDate(now)}</p>

      <article className="rise rounded-card bg-surface p-4">
        <div className="flex items-end justify-between gap-3">
          <p className="text-4xl font-semibold tabular-nums leading-none">
            {closed}
            <span className="text-xl text-muted">/{total || 0}</span>
          </p>
          <p className="pb-1 text-sm text-muted">{focus} мин фокуса</p>
        </div>
        <p className="mt-2 text-sm text-muted">{total === 0 ? "На сегодня пусто — можно выдохнуть" : "Закрыто из дел на сегодня"}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-raised">
          <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${ratio}%` }} />
        </div>
      </article>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted">Дела дня</h2>
        {queue.length === 0 ? (
          <p className="rounded-card bg-surface px-4 py-6 text-sm text-muted">Нет просроченных и дел со сроком на сегодня.</p>
        ) : (
          queue.map((task) => (
            <div
              key={task.id}
              className="flex w-full items-center rounded-card bg-surface pr-3 text-left"
            >
              <CheckDot
                on={task.done}
                onClick={() => toggleTask(task.id)}
                label={task.done ? `Вернуть «${task.title}»` : `Готово: ${task.title}`}
              />
              <button
                type="button"
                onClick={() => onOpenTask(task)}
                className="flex min-w-0 flex-1 items-center py-3 text-left transition-transform duration-150 ease-out active:scale-[0.96]"
              >
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate font-medium", task.done && "text-muted line-through")}>{task.title}</span>
                  <span className="mt-0.5 flex gap-2 text-xs text-muted">
                    <span>{LIST_LABEL[task.list]}</span>
                    {task.due ? (
                      <span className={cn(isOverdue(task.due, today, task.done) && "font-medium text-accent")}>
                        {formatDue(task.due, today)}
                      </span>
                    ) : null}
                  </span>
                </span>
                {task.priority === "high" && !task.done ? <Flag className="h-4 w-4 shrink-0 text-accent" /> : null}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted">Привычки</h2>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 no-scrollbar">
          {habits.map((habit) => {
            const Icon = HABIT_ICON[habit.icon];
            const on = habit.checks.includes(today);
            return (
              <button
                key={habit.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleHabit(habit.id, today)}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.96]",
                  on ? "bg-accent text-on-accent" : "bg-surface text-ink",
                )}
              >
                <Icon className="h-4 w-4" />
                {habit.title}
              </button>
            );
          })}
        </div>
      </div>
    </Screen>
  );
}
