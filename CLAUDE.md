@AGENTS.md

## Rebrand (in progress)
- The spec is docs/rebrand/brief.md; sketches are in docs/rebrand/sketches/. Read the parts the task names before planning.
- Work only on the step you're given. Don't start later steps.
- Max layout size is ~1536x696 CSS px, centered on bigger screens, no side padding.
- Keep the existing jar physics (useJarPhysics.ts). Extend it with small options; don't rewrite it.
- Put every animation timing in lib/motion.ts.
- Respect prefers-reduced-motion in everything you add.
- Verify in the browser at 1536x696 and 390x844 before saying you're done. Commit on the current branch when the step works. Never push.
