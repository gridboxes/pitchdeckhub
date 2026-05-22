# Mtel Pitch Design System

## Direction

The app now follows a Browserbase-inspired product aesthetic:

- dark-first, high-contrast UI
- cool blue/cyan accents instead of warm gold as the primary action color
- glassy elevated panels over a subtle atmospheric page background
- rounded, dense controls that feel like a modern infra/product dashboard
- concise typography with clear hierarchy and generous breathing room

This file describes the design system actually implemented in the app. It is meant to stay practical and code-adjacent.

## Source Of Truth

- Theme tokens and shared utility classes live in [src/index.css](/Users/baby/Desktop/mtel-pitchdeck/src/index.css)
- Reusable primitives live in [src/components/ui](/Users/baby/Desktop/mtel-pitchdeck/src/components/ui)

## Tokens

### Core colors

Dark theme:

- `--bg`: main page background
- `--bg-elevated`: darker input/background layer
- `--surface`: primary panel surface
- `--surface-soft`: softer internal surface
- `--surface-strong`: stronger elevated surface
- `--border`: default border
- `--border-strong`: emphasized border
- `--text`: primary text
- `--text-muted`: secondary text
- `--text-faint`: tertiary text
- `--accent`: primary interactive color
- `--accent-strong`: brighter accent for gradients/highlights
- `--accent-ink`: text on accent surfaces
- `--danger`: destructive color
- `--success`: positive feedback color

Light theme:

- uses the same token names with lighter surface values and darker text values
- should feel like the same product, not a separate brand

### Effects

- `--page-glow`: atmospheric page gradient
- `--shadow-md`: default card shadow
- `--shadow-lg`: modal / elevated shadow

## Foundations

### Typography

- Font stack: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Hero/page titles: `text-3xl`, semibold, tight tracking
- Section labels: small uppercase with expanded tracking
- Body copy: muted `text-sm`
- Metadata: `text-xs` with faint/muted token colors

### Shape

- Buttons and pills: full radius
- Inputs: `rounded-2xl`
- Cards: `rounded-[24px]`
- Modals: `rounded-[28px]`

### Motion

- Use short transitions only
- Hover motion should be subtle: small lift, color change, stronger border
- Avoid flashy animation unless it communicates state

## Shared Primitives

### Button

File: [src/components/ui/Button.jsx](/Users/baby/Desktop/mtel-pitchdeck/src/components/ui/Button.jsx)

Variants:

- `primary`: accent gradient, primary CTA
- `secondary`: low-emphasis neutral action
- `danger`: destructive action

### IconButton

File: [src/components/ui/IconButton.jsx](/Users/baby/Desktop/mtel-pitchdeck/src/components/ui/IconButton.jsx)

Use for header actions, card actions, close controls, and compact utilities.

### Input

File: [src/components/ui/Input.jsx](/Users/baby/Desktop/mtel-pitchdeck/src/components/ui/Input.jsx)

Rules:

- always use token-backed borders/backgrounds
- focus ring comes from the accent token
- placeholders should use faint text color

### SurfaceCard

File: [src/components/ui/SurfaceCard.jsx](/Users/baby/Desktop/mtel-pitchdeck/src/components/ui/SurfaceCard.jsx)

Use for:

- dashboard cards
- login panels
- empty states

### ModalShell

File: [src/components/ui/ModalShell.jsx](/Users/baby/Desktop/mtel-pitchdeck/src/components/ui/ModalShell.jsx)

Use for all dialog surfaces so headers, spacing, blur, and shadows stay consistent.

## Page Patterns

### Login

- centered single-panel layout
- atmospheric glow behind the form
- short product promise above the form

### Dashboard

- slim control-bar header
- large page title with short supporting copy
- grid of deck cards on a wide container

### Cards

- show one clear object per card
- metadata should not compete with the title
- hover should reveal secondary actions rather than cluttering the default state

### Modals

- use the shared modal shell
- keep form labels short and neutral
- destructive confirmations should stay visually distinct but not loud

## Implementation Rules

- Prefer Tailwind for layout, spacing, and structure
- Prefer design tokens and shared CSS classes for color, surfaces, and repeated interaction styling
- Avoid inline per-component color systems
- Avoid `onMouseEnter` / `onMouseLeave` style mutation for standard hover behavior
- If a style repeats twice, consider moving it into a primitive or token-backed class

## Current Scope

The current system is implemented across:

- [src/pages/Login.jsx](/Users/baby/Desktop/mtel-pitchdeck/src/pages/Login.jsx)
- [src/pages/Dashboard.jsx](/Users/baby/Desktop/mtel-pitchdeck/src/pages/Dashboard.jsx)
- [src/pages/ViewSlug.jsx](/Users/baby/Desktop/mtel-pitchdeck/src/pages/ViewSlug.jsx)
- [src/components/DeckCard.jsx](/Users/baby/Desktop/mtel-pitchdeck/src/components/DeckCard.jsx)
- [src/components/DeckModal.jsx](/Users/baby/Desktop/mtel-pitchdeck/src/components/DeckModal.jsx)
- [src/components/DeleteDialog.jsx](/Users/baby/Desktop/mtel-pitchdeck/src/components/DeleteDialog.jsx)
- [src/components/EditMemberModal.jsx](/Users/baby/Desktop/mtel-pitchdeck/src/components/EditMemberModal.jsx)
- [src/components/MemberForm.jsx](/Users/baby/Desktop/mtel-pitchdeck/src/components/MemberForm.jsx)
- [src/components/MemberSelector.jsx](/Users/baby/Desktop/mtel-pitchdeck/src/components/MemberSelector.jsx)

## Next Steps

- Continue migrating remaining one-off styles to tokens where needed
- Add more primitives only when repetition is real
- If the visual direction changes again, update tokens first and components second
