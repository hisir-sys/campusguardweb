# Anatomy skill integration — CampusGuard website

The project-level Anatomy skill is pinned as a Git submodule at `.agents/skills/anatomy`.

## Initialize after cloning

```powershell
git submodule update --init --recursive
```

The pinned upstream revision is `wheresryan22/anatomy@1482e8469b0a9e0d8cc18ea2740a01423d29ae80` (MIT). It requires Node.js 20.10+ and Chrome/Chromium for browser checks. The website's runtime does not depend on Anatomy; it is an authoring skill only.

## CampusGuard visual direction

Use Anatomy to craft interactive, explanatory visuals that feel native to the existing CampusGuard design:
- Keep the established Manrope / DM Sans / Instrument Serif / DM Mono typography and restrained lime accent.
- Keep the cinematic dark hero, light explanatory sections, responsive layouts, and reduced-motion support.
- Prioritize a detailed interactive isometric explanation of the local camera → person detection/tracking → pose + temporal fight classification → incident review flow.
- Keep every displayed number or state clearly labelled as illustrative unless it is sourced from real product data.
- Prefer self-contained SVG/HTML or a React component that fits the existing stack. Do not add a runtime dependency just to use the skill.
- Do not replace or restructure existing sections, forms, account flows, or deployment configuration as part of visual work. Build new visuals as isolated components and validate the production build, mobile layout, keyboard interaction, and reduced-motion behavior.
- Never depict a browser live-camera feed or imply that the website streams footage; CampusGuard's inference is local to the desktop application.
