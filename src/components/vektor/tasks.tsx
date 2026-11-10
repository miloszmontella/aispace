import { useMemo, useState } from "react";
import { Flag, Plus } from "lucide-react";
import { CheckDot, cn, IconAction, Screen, SearchField, Segment } from "@/components/vektor/ui";
import { LIST_LABEL, LISTS } from "@/vektor/labels";
import { formatDue, isOverdue, sortTasks, ymd } from "@/vektor/logic";
import { useVektor } from "@/vektor/store";
import type { ListId, Task } from "@/vektor/types";

type Scope = "open" | "today" | "done";

export function TasksScreen({
  now,
  onOpenTask,
  onAddTask,
}: {
  now: Date;
  onOpenTask: (task: Task) => void;
  onAddTask: () => void;
}) {
  const tasks = useVektor((state) => state.tasks);
  const toggleTask = useVektor((state) => state.toggleTask);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("open");
  const [list, setList] = useState<ListId | "all">("all");
  const today = ymd(now);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortTasks(tasks).filter((task) => {
      if (list !== "all" && task.list !== list) return false;
      if (scope === "open" && task.done) return false;
      if (scope === "done" && !task.done) return false;
      if (scope === "today" && !(task.due === today || (task.due !== null && task.due < today && !task.done) || task.doneAt === today)) {
        return false;
      }
      if (needle && !`${task.title} ${task.notes}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [tasks, query, scope, list, today]);

  return (
    <Screen
      title="Дела"
      action={
        <IconAction label="Новое дело" onClick={onAddTask}>
          <Plus className="h-5 w-5" />
        </IconAction>
      }
    >
      <SearchField value={query} onChange={setQuery} placeholder="Найти дело" />
      <Segment
        label="Какие дела показать"
        value={scope}
        onChange={setScope}
        options={[
          { id: "open", label: "Открытые" },
          { id: "today", label: "Сегодня" },
          { id: "done", label: "Готово" },
        ]}
      />
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 no-scrollbar">
        <Chip on={list === "all"} onClick={() => setList("all")}>
          Все
        </Chip>
        {LISTS.map((id) => (
          <Chip key={id} on={list === id} onClick={() => setList(id)}>
            {LIST_LABEL[id]}
          </Chip>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-card bg-surface px-4 py-8 text-center text-sm text-muted">
          {query.trim() ? "Ничего не нашлось." : "В этом срезе пусто."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((task) => (
            <li key={task.id}>
              <div className="flex w-full items-center rounded-card bg-surface pr-3 text-left">
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
                      ) : (
                        <span>без срока</span>
                      )}
                    </span>
                  </span>
                  {task.priority === "high" && !task.done ? <Flag className="h-4 w-4 shrink-0 text-accent" /> : null}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "h-11 shrink-0 rounded-full px-4 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.96]",
        on ? "bg-accent text-on-accent" : "bg-surface text-muted",
      )}
    >
      {children}
    </button>
  );
}
