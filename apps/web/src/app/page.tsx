import type { ReactNode } from "react";
import { SPORT_KEYS, DATA_STATES, DATA_TRUTH_CLASSES } from "@all-sport/core";
import { getServerEnv, providerConfigStatuses } from "../lib/env";
import { APP_VERSION } from "../lib/version";

// Rendered per-request so environment-derived status is never baked at build time.
export const dynamic = "force-dynamic";

export default function FoundationPage(): ReactNode {
  const providers = providerConfigStatuses(getServerEnv());

  return (
    <main>
      <h1>All-Sport Intelligence — Foundation</h1>
      <p className="subtitle">
        Phase 1 infrastructure. Version {APP_VERSION}. No analytics yet — this
        page proves the app boots, the workspace links, and the server can reach
        its configuration and database.
      </p>

      <div className="grid">
        <section className="card">
          <h2>Sports</h2>
          <div className="badge-row">
            {SPORT_KEYS.map((s) => (
              <span key={s} className="badge">
                {s}
              </span>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Data states</h2>
          <div className="badge-row">
            {DATA_STATES.map((d) => (
              <span key={d} className="badge">
                {d}
              </span>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Data truth classes</h2>
          <div className="badge-row">
            {DATA_TRUTH_CLASSES.map((t) => (
              <span key={t} className="badge">
                {t}
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: "1rem" }}>
        <h2>Provider configuration (no secrets shown)</h2>
        {providers.map((p) => (
          <div key={p.id} className="status">
            <span>{p.label}</span>
            <span className={p.configured ? "dot on" : "dot off"}>
              {p.configured ? "● configured" : "○ not configured"}
            </span>
          </div>
        ))}
      </section>

      <section className="card" style={{ marginTop: "1rem" }}>
        <h2>Health endpoints</h2>
        <div className="status">
          <span>Application</span>
          <a href="/api/health">/api/health</a>
        </div>
        <div className="status">
          <span>Database</span>
          <a href="/api/health/database">/api/health/database</a>
        </div>
      </section>
    </main>
  );
}
