import { useMemo, useState } from "react";
import { Pin, Plus } from "lucide-react";
import { IconAction, Screen, SearchField } from "@/components/vektor/ui";
import { useVektor } from "@/vektor/store";
import type { Note } from "@/vektor/types";

export function NotesScreen({ onOpen }: { onOpen: (note?: Note) => void }) {
  const notes = useVektor((state) => state.notes);
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...notes]
      .filter((note) => !needle || `${note.title} ${note.body}`.toLowerCase().includes(needle))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
  }, [notes, query]);

  return (
    <Screen
      title="Заметки"
      action={
        <IconAction label="Новая заметка" onClick={() => onOpen()}>
          <Plus className="h-5 w-5" />
        </IconAction>
      }
    >
      <SearchField value={query} onChange={setQuery} placeholder="Найти заметку" />
      {visible.length === 0 ? (
        <p className="rounded-card bg-surface px-4 py-8 text-center text-sm text-muted">
          {query.trim() ? "Ничего не нашлось." : "Заметок пока нет."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                onClick={() => onOpen(note)}
                className="flex w-full flex-col gap-1 rounded-card bg-surface px-4 py-3 text-left transition-transform duration-150 ease-out active:scale-[0.96]"
              >
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium">{note.title}</span>
                  {note.pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-accent" /> : null}
                </span>
                <span className="clamp-2 text-sm text-pretty text-muted">{note.body || "Пустая заметка"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
