import { useEffect, useState } from "react";
import { ChevronLeft, Pin, Trash2 } from "lucide-react";
import { Field, fieldClass, PrimaryButton, Sheet, cn } from "@/components/vektor/ui";
import { LIST_LABEL, LISTS, PRIORITIES, PRIORITY_LABEL } from "@/vektor/labels";
import { uid } from "@/vektor/logic";
import { useVektor } from "@/vektor/store";
import type { ListId, Note, Priority, Task } from "@/vektor/types";

export function TaskEditor({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const saveTask = useVektor((state) => state.saveTask);
  const deleteTask = useVektor((state) => state.deleteTask);
  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [list, setList] = useState<ListId>(task?.list ?? "inbox");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "none");
  const [due, setDue] = useState(task?.due ?? "");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <Sheet title={task ? "Дело" : "Новое дело"} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const clean = title.trim();
          if (!clean) return;
          saveTask({
            id: task?.id ?? uid(),
            title: clean,
            notes: notes.trim(),
            list,
            priority,
            due: due || null,
            done: task?.done ?? false,
            doneAt: task?.doneAt ?? null,
            createdAt: task?.createdAt ?? Date.now(),
          });
          onClose();
        }}
      >
        <Field label="Название">
          <input value={title} maxLength={140} onChange={(event) => setTitle(event.target.value)} className={fieldClass} placeholder="Что сделать" autoFocus />
        </Field>
        <Field label="Список">
          <select value={list} onChange={(event) => setList(event.target.value as ListId)} className={fieldClass}>
            {LISTS.map((id) => (
              <option key={id} value={id}>
                {LIST_LABEL[id]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Приоритет">
          <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)} className={fieldClass}>
            {PRIORITIES.map((id) => (
              <option key={id} value={id}>
                {PRIORITY_LABEL[id]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Срок">
          <input type="date" value={due} onChange={(event) => setDue(event.target.value)} className={fieldClass} />
        </Field>
        <Field label="Заметка">
          <textarea
            value={notes}
            maxLength={2000}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl bg-raised px-3 py-3 text-base text-ink outline-none placeholder:text-faint"
            placeholder="Необязательно"
          />
        </Field>
        <PrimaryButton type="submit" disabled={!title.trim()}>
          Сохранить
        </PrimaryButton>
        {task ? (
          <button
            type="button"
            onClick={() => {
              deleteTask(task.id);
              onClose();
            }}
            className="h-11 text-sm font-medium text-muted"
          >
            Удалить дело
          </button>
        ) : null}
      </form>
    </Sheet>
  );
}

export function NoteEditor({ note, onClose }: { note: Note | null; onClose: () => void }) {
  const saveNote = useVektor((state) => state.saveNote);
  const deleteNote = useVektor((state) => state.deleteNote);
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [pinned, setPinned] = useState(note?.pinned ?? false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save() {
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (!cleanTitle && !cleanBody) {
      onClose();
      return;
    }
    saveNote({
      id: note?.id ?? uid(),
      title: cleanTitle || "Без названия",
      body,
      pinned,
      updatedAt: Date.now(),
    });
    onClose();
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-canvas">
      <header className="flex items-center justify-between px-2 pt-3">
        <button
          type="button"
          onClick={save}
          className="flex h-11 items-center gap-1 rounded-full px-2 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          <ChevronLeft className="h-5 w-5" />
          Назад
        </button>
        <button
          type="button"
          aria-pressed={pinned}
          onClick={() => setPinned((value) => !value)}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-150 ease-out active:scale-[0.96]",
            pinned ? "text-accent" : "text-muted",
          )}
          aria-label={pinned ? "Открепить" : "Закрепить"}
        >
          <Pin className="h-5 w-5" />
        </button>
      </header>
      <input
        value={title}
        maxLength={120}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Заголовок"
        className="bg-transparent px-5 text-2xl font-semibold outline-none placeholder:text-faint"
      />
      <textarea
        value={body}
        maxLength={8000}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Текст заметки"
        className="min-h-0 flex-1 resize-none bg-transparent px-5 py-4 text-base leading-relaxed outline-none placeholder:text-faint"
      />
      <div className="flex items-center justify-between gap-3 px-5 pb-5">
        {note ? (
          <button
            type="button"
            onClick={() => {
              deleteNote(note.id);
              onClose();
            }}
            className="flex h-11 items-center gap-2 text-sm text-muted"
          >
            <Trash2 className="h-4 w-4" />
            Удалить
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={save}
          className="h-11 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          Сохранить
        </button>
      </div>
    </div>
  );
}
