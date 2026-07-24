# License Decision (open)

**Status:** Deferred — requires a human decision. **Date:** 2026-07-23

## Why the code license is not yet chosen

The appropriate license is entangled with the platform's **commercial vs research**
posture, which is itself constrained by data-source licensing:

1. **MLB Stats API / Baseball Savant** — free and public, but each response carries
   a copyright notice restricting redistribution/commercial use. A commercial product
   may need a separate arrangement (Risk R-01).
2. **Jeff Sackmann / Tennis Abstract historical data** — **CC BY-NC-SA 4.0**:
   _non-commercial_, _attribution_, and _ShareAlike_. If this data (or a derivative)
   is distributed, ShareAlike may impose CC BY-NC-SA on the derivative, and
   commercial use is disallowed outright (Risk R-02).

## Implications

- If the platform stays **research / non-commercial**, the free sources are usable
  with attribution, and a permissive OR a CC BY-NC-SA-compatible posture is workable.
- If the platform goes **commercial**, it must (a) replace Sackmann with a
  commercially-licensed historical feed, and (b) confirm commercial rights to MLB
  data — before any "production/commercial" claim.

## Recommendation

- **Default to non-commercial / research** until a deliberate commercial decision is
  made with legal review.
- Keep historical (non-commercial) data physically and logically separate from any
  live/commercial path so the code can be relicensed without contamination.
- Revisit and add a concrete `LICENSE` file at Phase 1, once the user confirms the
  intended posture.

## Attribution obligations already in effect

- If/when Sackmann data is used: attribute "Tennis databases, files, and algorithms
  by Jeff Sackmann / Tennis Abstract, licensed under CC BY-NC-SA 4.0" in-repo and in-UI.
