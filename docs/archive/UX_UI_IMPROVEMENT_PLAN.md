# UX/UI Improvement Plan: "Gotuj z AI"

## Goal
Transform the MVP into a visually stunning, smooth, and professional tool for video content creation.

## Phase 1: Visual Polish (The "Look")
- [ ] **Typography**: Integrate `Inter` (UI) and `JetBrains Mono` (Data/Prompts) via Google Fonts.
- [ ] **Theme Refinement**:
    - Deepen background colors for better contrast.
    - Refine neon glows to be less harsh, more "premium".
    - Add subtle pattern/grid animation to the Board background.
- [ ] **Glassmorphism**: Apply high-quality glass effects (backdrop-blur, white borders with low opacity) to Sidebar and Blocks.

## Phase 2: Fluid Motion (The "Feel")
- [ ] **Library**: Install `framer-motion`.
- [ ] **Interactions**:
    - Animate block appearance (pop-in effect).
    - Animate block removal (fade-out).
    - Smooth hover states for all interactive elements.
    - "Pulse" animation for the selected block.

## Phase 3: Component UX Deep Dive
- [ ] **Smart Blocks**:
    - Auto-resizing text areas (no scrollbars inside blocks).
    - Distinct visual layouts per block type:
        - *Chef*: ID Card style with avatar placeholder.
        - *Ingredients*: List style with bullet points.
        - *Dish*: Result card with "success" glow.
        - *Note*: Sticky note texture.
- [ ] **Sidebar**:
    - Improved button styling with hover effects.
    - Clearer iconography.
- [ ] **Bottom Bar**:
    - Make it float slightly above the bottom edge.
    - Add a "Copy" button for the prompt.

## Phase 4: Quality of Life
- [ ] **Keyboard Shortcuts**: `Delete` / `Backspace` to remove selected block.
- [ ] **Selection**: Click background to deselect.
