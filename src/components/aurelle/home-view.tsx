import { Lock } from "lucide-react";
import cover from "@/aurelle/photos/home.jpg";
import { countTiers, matches, tap } from "@/aurelle/format";
import { useAurelle } from "@/aurelle/store";
import type { TierFilter } from "@/aurelle/types";

const ROWS: TierFilter[][] = [
  ["ALL", "S", "A", "B"],
  ["C", "D", "E", "F"],
];

export function HomeView() {
  const profiles = useAurelle((state) => state.profiles);
  const filters = useAurelle((state) => state.filters);
  const openCatalog = useAurelle((state) => state.openCatalog);
  const lock = useAurelle((state) => state.lock);
  const homeCover = useAurelle((state) => state.homeCover);
  const coverX = useAurelle((state) => state.coverX);
  const coverY = useAurelle((state) => state.coverY);
  const counts = countTiers(profiles.filter((profile) => matches(profile, "", filters)));

  return (
    <section className="home">
      <img
        className="home-bg"
        src={homeCover ?? cover}
        alt=""
        style={{ objectPosition: `${coverX}% ${coverY}%` }}
      />
      <div className="home-shade" />
      <header className="home-top">
        <div className="home-brand">
          <p className="home-logo">AURELLE</p>
          <p className="home-kicker">Private Archive</p>
        </div>
        <button type="button" className="home-lock" aria-label="Lock" onClick={() => { tap(); lock(); }}>
          <Lock size={16} strokeWidth={1.5} />
        </button>
      </header>
      <div className="home-copy">
        <h1>
          My
          <br />
          archive
        </h1>
        <p>
          Your personal collection
          <br />
          of profiles
        </p>
      </div>
      <div className="tier-board" role="tablist" aria-label="Categories">
        {ROWS.flat().map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={item === "ALL"}
            className={item === "ALL" ? "tier-cell on" : "tier-cell"}
            onClick={() => {
              tap(8);
              openCatalog(item);
            }}
          >
            <strong>{item}</strong>
            <small>{counts[item]}</small>
          </button>
        ))}
      </div>
      <div className="home-note">
        <span />
        <p>
          A premium archive
          <br />
          at your disposal
        </p>
      </div>
    </section>
  );
}
