AJT Portfolio

Overview
Single‑page portfolio built with HTML, Tailwind (CDN), and vanilla JS. It features a horizontal section scroller, theme‑aware UI, a custom cursor, subtle 3D/visual effects, and a minimal preloader that displays “AJT”.

Live site
https://ajt4-de.github.io/

Highlights
- Theme‑aware “AJT” preloader overlay with fade‑out and cursor suppression during load.
- Custom cursor (ring + dot) centered on the pointer with dynamic contrast and magnifier on buttons/cards.
- Horizontal scrolling with smooth wheel mapping, keyboard nav, and mouse drag; strict per‑panel snap on mobile.
- Transparent navbar on the hero section; brand text switches to “portfolio” in hero, name elsewhere.
- Timelines for Experience and Education, with animated nodes and flowing line highlight.
- Tasteful 3D/visual touches: card tilt + glare, rotating cube in hero, parallax dots, chip bobbing, button ripple, FAB bob.
- Email dropdown (Outlook/Gmail) with “Copy both emails”; GitHub floating action button from section 2 onward.
- Respects prefers‑reduced‑motion to reduce animations.

Project structure
- index.html — page markup and loader markup (AJT)
- assets/styles.css — theme, layout, cursor, animations, timelines, loader styles
- assets/main.js — scroller logic, observers, cursor/lens, tilt/glare, menus, loader hide
- Favicon/ — icons and manifest

Tech stack
- HTML + Tailwind CSS (via CDN)
- Vanilla JavaScript
- Google Fonts: Josefin Sans, Federant, Montserrat

Run locally
- Open index.html in a browser, or use any static server/preview (e.g., VS Code Live Server).

Customize
- Colors: edit CSS variables in assets/styles.css (–‑ink, –‑teal, –‑paper).
- Loader text: change the “AJT” string in index.html (#appLoader .logo).
- Disable loader: remove the #appLoader block or hide it early in assets/main.js.

Accessibility & mobile
- Pointer‑only effects are gated behind (pointer: fine); touch uses native momentum.
- Mobile panels use strict scroll‑snap with simplified transitions.
