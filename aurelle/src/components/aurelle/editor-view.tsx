import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ImagePlus, X } from "lucide-react";
import { peekThumb } from "@/aurelle/db";
import { citiesFrom, tap, telegramHandle } from "@/aurelle/format";
import { useAurelle } from "@/aurelle/store";
import type { PhotoDraft, Tier } from "@/aurelle/types";
import { TIERS } from "@/aurelle/types";
import { Thumb } from "@/components/aurelle/thumb";

function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export function EditorView() {
  const editId = useAurelle((state) => state.editId);
  const profile = useAurelle((state) => state.profiles.find((item) => item.id === editId));
  const profiles = useAurelle((state) => state.profiles);
  const back = useAurelle((state) => state.back);
  const saveEditor = useAurelle((state) => state.saveEditor);
  const busy = useAurelle((state) => state.busy);
  const cities = useMemo(() => citiesFrom(profiles), [profiles]);

  const [name, setName] = useState(profile?.name ?? "");
  const [age, setAge] = useState(profile ? String(profile.age) : "");
  const [height, setHeight] = useState(profile?.height ? String(profile.height) : "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [telegram, setTelegram] = useState(profile?.telegram ?? "");
  const [tier, setTier] = useState<Tier | null>(profile?.tier ?? null);
  const [notes, setNotes] = useState(profile?.notes ?? "");
  const [photos, setPhotos] = useState<PhotoDraft[]>(() =>
    (profile?.photoIds ?? []).map((id) => ({ key: id, existingId: id, url: peekThumb(id) ?? undefined })),
  );
  const [error, setError] = useState<string | null>(null);
  const originalIds = profile?.photoIds ?? [];

  useEffect(() => {
    return () => {
      for (const photo of photos) {
        if (photo.file && photo.url) URL.revokeObjectURL(photo.url);
      }
    };
    // revoke only on leave
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list).filter((file) => !file.type || file.type.startsWith("image/"));
    if (files.length === 0) return;
    const room = 10 - photos.length;
    if (room <= 0) {
      setError("No more than 10 photos");
      return;
    }
    const accepted = files.slice(0, room);
    tap();
    setPhotos((current) => [
      ...current,
      ...accepted.map((file) => ({
        key: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
    setError(accepted.length < files.length ? "No more than 10 photos" : null);
  }

  function removeAt(index: number) {
    setPhotos((current) => {
      const photo = current[index];
      if (photo?.file && photo.url) URL.revokeObjectURL(photo.url);
      return current.filter((_, item) => item !== index);
    });
  }

  async function save() {
    const parsedAge = Number(age);
    const parsedHeight = Number(height);
    const handle = telegramHandle(telegram);
    if (!name.trim()) return setError("Enter a name or alias");
    if (!Number.isInteger(parsedAge) || parsedAge < 18 || parsedAge > 99) {
      return setError("Age must be 18 or older");
    }
    if (!Number.isInteger(parsedHeight) || parsedHeight < 140 || parsedHeight > 220) {
      return setError("Enter a height from 140 to 220 cm");
    }
    if (!city.trim()) return setError("Enter a city");
    if (handle && !/^[a-zA-Z0-9_]{5,32}$/.test(handle)) return setError("Invalid Telegram");
    if (!tier) return setError("Choose a tier");
    if (photos.length === 0) return setError("Add at least one photo");
    setError(null);
    tap();
    await saveEditor({
      id: profile?.id ?? null,
      name,
      age: parsedAge,
      height: parsedHeight,
      city,
      telegram: handle,
      tier,
      notes,
      photos,
      originalIds,
    });
  }

  return (
    <>
      <div className="scroll">
        <header className="topbar">
          <button type="button" className="ghost" aria-label="Back" onClick={back}>
            <ChevronLeft size={22} strokeWidth={1.5} />
          </button>
          <h1 className="page-title">{profile ? "Edit profile" : "Add profile"}</h1>
          <span className="ghost" />
        </header>
        <form
          className="editor"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label className="drop">
            <ImagePlus size={22} strokeWidth={1.5} />
            <span>Add photos</span>
            <small>up to 10 photos</small>
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          {photos.length > 0 ? (
            <div className="thumbs">
              {photos.map((photo, index) => (
                <div
                  key={photo.key}
                  className="thumb"
                  onPointerDown={(event) => {
                    if ((event.target as HTMLElement).closest("button")) return;
                    const startX = event.clientX;
                    const node = event.currentTarget;
                    const up = (ev: PointerEvent) => {
                      const shift = Math.round((ev.clientX - startX) / 84);
                      const dest = Math.max(0, Math.min(photos.length - 1, index + shift));
                      if (dest !== index) setPhotos((current) => moveItem(current, index, dest));
                      node.removeEventListener("pointerup", up);
                    };
                    node.addEventListener("pointerup", up);
                  }}
                >
                  {photo.existingId ? (
                    <Thumb id={photo.existingId} alt="" />
                  ) : photo.url ? (
                    <img src={photo.url} alt="" className="ready" />
                  ) : null}
                  <button type="button" className="x" aria-label="Remove photo" onClick={() => removeAt(index)}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {photos.length > 1 ? <p className="hint">Drag a photo sideways to change the order.</p> : null}
          <label className="field">
            <span>Name or alias</span>
            <input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field">
            <span>Age</span>
            <input
              inputMode="numeric"
              value={age}
              placeholder="18+"
              onChange={(event) => setAge(event.target.value.replace(/\D/g, "").slice(0, 2))}
            />
          </label>
          <label className="field">
            <span>Height, cm</span>
            <input
              inputMode="numeric"
              value={height}
              placeholder="170"
              onChange={(event) => setHeight(event.target.value.replace(/\D/g, "").slice(0, 3))}
            />
          </label>
          <label className="field">
            <span>City</span>
            <input value={city} maxLength={60} list="aurelle-cities" onChange={(event) => setCity(event.target.value)} />
            <datalist id="aurelle-cities">
              {cities.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>
          <label className="field">
            <span>Telegram — optional</span>
            <input
              value={telegram}
              placeholder="@username"
              autoCapitalize="off"
              autoCorrect="off"
              onChange={(event) => setTelegram(event.target.value)}
            />
          </label>
          <div className="field">
            <span className="field-label">Tier</span>
            <div className="tier-pick">
              {TIERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={tier === item ? "on" : undefined}
                  onClick={() => {
                    tap(6);
                    setTier(item);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Notes</span>
            <textarea value={notes} maxLength={4000} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <p className="err">{error}</p>
        </form>
      </div>
      <div className="savebar">
        <button type="button" className="btn-block primary" disabled={Boolean(busy)} onClick={() => void save()}>
          Save
        </button>
      </div>
    </>
  );
}
