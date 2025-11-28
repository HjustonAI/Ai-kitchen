# AI Kitchen Copilot Instructions

You are an expert React developer working on "AI Kitchen" (Gotuj z AI), a visual node-based editor for AI workflows.

## 🏗 Tech Stack
- **Core**: React 19, Vite, TypeScript
- **State**: Zustand (with `zundo` for undo/redo, `persist` for localStorage)
- **Styling**: Tailwind CSS, Lucide React (icons), clsx, tailwind-merge
- **Animation**: Framer Motion
- **Canvas**: `react-draggable` (blocks), `react-rnd` (resizing), SVG (connections)
- **Graph Utils**: `dagre` (auto-layout)

## 🏛 Architecture & State
The application state is centralized in `src/store/useStore.ts`.
- **Single Source of Truth**: Do not create local state for board data. Use the store.
- **Data Models** (`src/types.ts`):
  - `Block`: Nodes on the canvas (`chef`, `ingredients`, `dish`, `note`, `group`).
  - `Connection`: Links between blocks (`fromId`, `toId`).
  - `Group`: A special block type that can contain other blocks.
- **View State**: The store tracks `view` (`x`, `y`, `scale`) for pan/zoom operations.
- **Persistence**: State is automatically saved to `localStorage` key `ai-kitchen-storage`.

## 🧩 Key Components
- **`Board.tsx`**: The main canvas. Handles pan/zoom, background interactions, and selection box.
- **`Block.tsx`**: Renders individual nodes. Handles drag events, selection, and anchor points.
- **`Group.tsx`**: Renders grouped blocks. Handles collapsing/expanding logic.
- **`ConnectionsLayer.tsx`**: SVG layer rendered *behind* blocks to draw connections. Uses dynamic anchor points.
- **`Sidebar.tsx`**: Tool palette for adding new blocks.
- **`PropertiesPanel.tsx`**: Right-side panel for editing the selected block's data.

## 🎨 Design System & UX
- **Theme**: Dark mode, "Premium" aesthetic.
- **Glassmorphism**: Use `backdrop-blur`, semi-transparent backgrounds, and subtle borders.
- **Motion**: Use `framer-motion` for interactions (pop-in, hover, selection pulse).
- **Typography**: `Inter` for UI, `JetBrains Mono` for data/prompts.
- **Accessibility**: Ensure all interactive elements have `tabIndex`, `aria-label`, and keyboard handlers (`onKeyDown`).

## 🛠 Development Guidelines
1.  **State Logic**: Put all business logic (adding/removing blocks, connecting, grouping) in `useStore.ts` actions. Components should only dispatch actions.
2.  **IDs**: Use `crypto.randomUUID()` for generating unique IDs.
3.  **Coordinates**: When adding blocks, calculate position relative to the current `view` center (see `addBlock` in store).
4.  **Type Safety**: Always update `src/types.ts` when modifying data structures.
5.  **Performance**: Use `manualChunks` in Vite config to split heavy vendors.

## 🚀 Common Commands
- `npm run dev`: Start development server.
- `npm run build`: Type-check and build (uses manual chunks).
- `npm run lint`: Run ESLint.
