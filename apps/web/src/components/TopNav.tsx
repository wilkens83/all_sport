import type { ReactNode } from "react";

export function TopNav({ active }: { active?: "mlb" | "tennis" }): ReactNode {
  return (
    <nav className="topnav">
      <a className="brand" href="/">
        Diamond<span className="spark"> Edge</span>
      </a>
      <div className="navlinks">
        <a
          className={`navlink${active === "mlb" ? " active" : ""}`}
          href="/mlb"
        >
          MLB
        </a>
        <span
          className="navlink disabled"
          title="Tennis arrives in a later slice"
        >
          Tennis
        </span>
      </div>
    </nav>
  );
}
