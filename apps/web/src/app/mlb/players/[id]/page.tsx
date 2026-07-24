import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getPlayerById, getRecentGameLogs } from "@all-sport/db";
import { getDb } from "../../../../lib/db";
import { TopNav } from "../../../../components/TopNav";
import { GameLogTable } from "../../../../components/GameLogTable";

export const dynamic = "force-dynamic";

function groupsForRole(role: string): Array<"hitting" | "pitching"> {
  if (role === "pitcher") return ["pitching"];
  if (role === "two_way") return ["hitting", "pitching"];
  return ["hitting"];
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<ReactNode> {
  const { id } = await params;
  const db = getDb();
  const player = await getPlayerById(db, id);
  if (!player) notFound();

  const groups = groupsForRole(player.role);
  const logsByGroup = await Promise.all(
    groups.map(async (g) => ({
      group: g,
      logs: await getRecentGameLogs(db, player.id, g, 15),
    })),
  );

  return (
    <>
      <TopNav active="mlb" />
      <main>
        <a className="back" href="/mlb">
          ← MLB
        </a>
        <div className="player-head" style={{ marginTop: "0.75rem" }}>
          <h1 style={{ margin: 0 }}>{player.fullName}</h1>
          <span className="role-pill">{player.role.replace("_", "-")}</span>
        </div>
        <div className="player-meta">
          <span>
            Team <b>{player.teamName ?? "—"}</b>
          </span>
          <span>
            Position <b>{player.primaryPosition ?? "—"}</b>
          </span>
          <span>
            Bats/Throws <b>{player.bats ?? "—"}</b> /{" "}
            <b>{player.throws ?? "—"}</b>
          </span>
          <span>
            Born <b>{player.birthDate ?? "—"}</b>
          </span>
          <span>
            Status <b>{player.active === false ? "Inactive" : "Active"}</b>
          </span>
          <span>
            MLB ID <b>{player.mlbPlayerId}</b>
          </span>
        </div>

        {logsByGroup.map(({ group, logs }) => (
          <div className="section" key={group}>
            <h2>Recent {group === "pitching" ? "Pitching" : "Batting"}</h2>
            <GameLogTable logs={logs} group={group} />
          </div>
        ))}
      </main>
    </>
  );
}
