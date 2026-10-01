# KAIRO visual system

KAIRO uses two persistent, device-level palettes. Switch between them on the sign-in screen, project dashboard, or in project settings.

## Palettes

- **Midnight** is a low-light set: deep blue-charcoal surfaces, warm ivory text, tungsten amber for primary actions, and desaturated teal for supporting information. It keeps visual glare low while reserving the warmest highlight for attention and decisions.
- **Golden Hour** is a warm paper set: pale sand surfaces, ink text, terracotta actions, and restrained teal support. It offers a brighter working surface without defaulting to stark white.

Both palettes use the same semantic roles, so the selected palette changes the interface without changing what colors mean. Success, warning, danger, and informational states remain distinguishable. Production-phase and shoot-day statuses continue to use those semantic cues rather than becoming decorative accents.

## Type and layout

Display and page titles use a platform serif to bring an editorial, cinematic voice to the interface. Navigation, controls, forms, and dense production information keep a neutral system sans-serif for legibility. The type scale is 36/28/20/16/13/11 px-equivalent for display, title, heading, body, label, and caption roles. Comfortable line heights and consistent spacing/radius tokens keep call sheets and operational screens scannable.

## Interaction principles

- Use one warm accent for the primary action; keep destructive, warning, and success colors semantically stable.
- Keep surface contrast and hierarchy clear in both palettes. Primary text/accent contrast was checked against WCAG contrast ratios.
- Make palette selection explicit, accessible as a radio choice, and persistent on the device.
- Keep controls and status labels understandable without relying on color alone.

The product reference pass used Frame.io's public positioning around organizing review work by assignee, due date, and status. KAIRO applies that production-first emphasis to crew workflows without copying its interface.
