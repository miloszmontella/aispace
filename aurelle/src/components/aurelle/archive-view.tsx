import { useEffect, useMemo, useState, type CSSProperties, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, LayoutGrid, List, MoreHorizontal, Search, SlidersHorizontal, X } from "lucide-react";
import { ageLabel, filtersActive, heightLabel, matches, sortProfiles, tap } from "@/aurelle/format";
import { useAurelle } from "@/aurelle/store";
import type { Profile, TierFilter } from "@/aurelle/types";
import { TIERS } from "@/aurelle/types";
import { Thumb } from "@/components/aurelle/thumb";

const COVER_FOCUS: Record<string, string> = {
  "demo-anastasia-p2": "50% 16%",
  "demo-sofia-p2": "50% 18%",
  "demo-maria-p2": "50% 22%",
  "demo-ekaterina-p2": "48% 18%",
  "demo-victoria-p2": "52% 14%",
  "demo-darya-p2": "50% 20%",
  "demo-ksenia-p2": "50% 18%",
  "demo-alina-p2": "50% 18%",
  "demo-polina-p2": "50% 15%",
};

function focusFor(id: string): string {
  return COVER_FOCUS[id] ?? "center 18%";
}

export function ArchiveView({ mode }: { mode: "archive" | "search" }) {
  const profiles = useAurelle((state) => state.profiles);
  const tier = useAurelle((state) => state.tier);
  const query = useAurelle((state) => state.query);
  const filters = useAurelle((state) => state.filters);
  const sort = useAurelle((state) => state.sort);
  const viewMode = useAurelle((state) => state.viewMode);
  const setQuery = useAurelle((state) => state.setQuery);
  const setTier = useAurelle((state) => state.setTier);
  const openArchive = useAurelle((state) => state.openArchive);
  const setViewMode = useAurelle((state) => state.setViewMode);
  const openProfile = useAurelle((state) => state.openProfile);
  const setFilterOpen = useAurelle((state) => state.setFilterOpen);
  const setTierPickFor = useAurelle((state) => state.setTierPickFor);
  const startEdit = useAurelle((state) => state.startEdit);
  const ask = useAurelle((state) => state.ask);
  const removeProfile = useAurelle((state) => state.removeProfile);
  const monoCatalog = useAurelle((state) => state.monoCatalog);
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);

  const base = useMemo(
    () => profiles.filter((profile) => matches(profile, query, filters)),
    [profiles, query, filters],
  );
  const visible = useMemo(
    () => sortProfiles(tier === "ALL" ? base : base.filter((profile) => profile.tier === tier), sort),
    [base, tier, sort],
  );

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("pointerdown", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  function openMenu(event: PointerEvent<HTMLButtonElement>, id: string) {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setMenu({
      id,
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.right - 180, window.innerWidth - 196)),
    });
  }

  const menuProfile = profiles.find((profile) => profile.id === menu?.id);

  return (
    <div>
      {mode === "archive" ? (
        <div className={monoCatalog ? "catalog is-mono" : "catalog"}>
          <header className="cat-bar">
            <button type="button" className="ghost" aria-label="Home" onClick={() => { tap(); openArchive(); }}>
              <ChevronLeft size={22} strokeWidth={1.5} />
            </button>
            <h1>My archive</h1>
            <div className="view-switch">
              <button
                type="button"
                className={viewMode === "grid" ? "ghost on" : "ghost"}
                aria-label="Grid"
                aria-pressed={viewMode === "grid"}
                onClick={() => { tap(); setViewMode("grid"); }}
              >
                <LayoutGrid size={18} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                className={viewMode === "list" ? "ghost on" : "ghost"}
                aria-label="List"
                aria-pressed={viewMode === "list"}
                onClick={() => { tap(); setViewMode("list"); }}
              >
                <List size={18} strokeWidth={1.5} />
              </button>
            </div>
          </header>
          <div className="cat-tiers" role="tablist" aria-label="Categories">
            {(["ALL", ...TIERS] as TierFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tier === item}
                className={tier === item ? "cat-chip on" : "cat-chip"}
                onClick={() => { tap(8); setTier(item); }}
              >
                <span>{item}</span>
              </button>
            ))}
          </div>
          {visible.length === 0 ? (
            <div className="empty">
              <h2>{profiles.length === 0 ? "Archive is empty" : "Nothing found"}</h2>
              <p>
                {profiles.length === 0
                  ? "Add the first profile with the button below."
                  : "Nothing in this category yet."}
              </p>
            </div>
          ) : (
            <div className={viewMode === "grid" ? (visible.length === 1 ? "grid-cards solo" : "grid-cards") : "list-cards"}>
              {visible.map((profile, index) => (
                <Card
                  key={profile.id}
                  profile={profile}
                  index={index}
                  mode={viewMode}
                  editorial
                  onOpen={() => openProfile(profile.id)}
                  onMenu={openMenu}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={monoCatalog ? "search-screen catalog is-mono" : "search-screen catalog"}>
          <header className="cat-bar">
            <span />
            <h1>Search</h1>
            <button type="button" className="ghost" aria-label="Filters" onClick={() => { tap(); setFilterOpen(true); }}>
              <SlidersHorizontal size={18} strokeWidth={1.5} />
              {filtersActive(filters) ? <span className="dot-badge" /> : null}
            </button>
          </header>
          <label className="search-field">
            <Search size={16} strokeWidth={1.5} />
            <input
              value={query}
              placeholder="Name, city, or Telegram"
              onChange={(event) => setQuery(event.target.value)}
              enterKeyHint="search"
            />
            {query ? (
              <button type="button" className="search-clear" aria-label="Clear search" onClick={() => { tap(); setQuery(""); }}>
                <X size={14} strokeWidth={1.5} />
              </button>
            ) : null}
          </label>
          <div className="cat-tiers" role="tablist" aria-label="Categories">
            {(["ALL", ...TIERS] as TierFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tier === item}
                className={tier === item ? "cat-chip on" : "cat-chip"}
                onClick={() => { tap(8); setTier(item); }}
              >
                <span>{item}</span>
              </button>
            ))}
          </div>
          {visible.length === 0 ? (
            <div className="empty">
              <h2>{profiles.length === 0 ? "Archive is empty" : "Nothing found"}</h2>
              <p>Change the search or the filters.</p>
            </div>
          ) : (
            <div className={viewMode === "grid" ? (visible.length === 1 ? "grid-cards solo" : "grid-cards") : "list-cards"}>
              {visible.map((profile, index) => (
                <Card
                  key={profile.id}
                  profile={profile}
                  index={index}
                  mode={viewMode}
                  editorial
                  onOpen={() => openProfile(profile.id)}
                  onMenu={openMenu}
                />
              ))}
            </div>
          )}
        </div>
      )}
      {menu && menuProfile
        ? createPortal(
            <div
              className="menu"
              style={{ top: menu.top, left: menu.left }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button type="button" onClick={() => { setMenu(null); openProfile(menuProfile.id); }}>
                Open
              </button>
              <button type="button" onClick={() => { setMenu(null); startEdit(menuProfile.id); }}>
                Edit
              </button>
              <button type="button" onClick={() => { setMenu(null); setTierPickFor(menuProfile.id); }}>
                Change tier
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  setMenu(null);
                  ask({
                    title: "Delete profile?",
                    body: `“${menuProfile.name}” will leave the archive along with the photos. This cannot be undone.`,
                    confirm: "Delete",
                    danger: true,
                    run: () => removeProfile(menuProfile.id),
                  });
                }}
              >
                Delete
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function Card({
  profile,
  index,
  mode,
  editorial,
  onOpen,
  onMenu,
}: {
  profile: Profile;
  index: number;
  mode: "grid" | "list";
  editorial?: boolean;
  onOpen: () => void;
  onMenu: (event: PointerEvent<HTMLButtonElement>, id: string) => void;
}) {
  const cover = profile.photoIds[0];
  return (
    <article className={mode === "grid" ? "card grid" : "card list"} style={{ "--i": Math.min(index, 8) } as CSSProperties}>
      <button type="button" className="card-open" onClick={onOpen}>
        <div className="card-photo">
          {cover ? <Thumb id={cover} alt="" position={editorial ? focusFor(cover) : undefined} /> : null}
        </div>
        <div className="card-meta">
          <div className="card-name">
            <strong>{profile.name}</strong>
          </div>
          <p>
            {editorial
              ? `${profile.age} · ${heightLabel(profile.height)} · ${profile.city}`
              : `${ageLabel(profile.age)} · ${heightLabel(profile.height)} · ${profile.city}`}
          </p>
          {!editorial && profile.telegram ? <p className="tg">@{profile.telegram}</p> : null}
        </div>
      </button>
      {editorial ? null : (
        <button type="button" className="more" aria-label={`Menu ${profile.name}`} onPointerDown={(event) => onMenu(event, profile.id)}>
          <MoreHorizontal size={16} strokeWidth={1.5} />
        </button>
      )}
    </article>
  );
}
