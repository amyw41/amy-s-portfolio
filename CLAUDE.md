@AGENTS.md

## Rebrand (in progress)
- The spec is docs/rebrand/brief.md; sketches are in docs/rebrand/sketches/. Read the parts the task names before planning.
- Visual values (type, colour, spacing, motion) come from docs/rebrand/design-system.md, which Amy maintains. Follow it exactly; if it disagrees with the code or the brief, it wins. When Amy asks for a visual change, update that file too.
- Work only on the step you're given. Don't start later steps.
- The home layout fills the whole window (sidebar flush left, no max width). Spacing scales with the window (clamp() with vw/dvh), landing exactly on the design values at 1536x696; see design-system.md.
- Keep the existing jar physics (useJarPhysics.ts). Extend it with small options; don't rewrite it.
- Put every animation timing in lib/motion.ts.
- Respect prefers-reduced-motion in everything you add.
- Verify in the browser at 1536x696 and 390x844 before saying you're done. Commit on the current branch when the step works. Never push.
