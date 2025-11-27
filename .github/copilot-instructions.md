# AI Kitchen Copilot Instructions

You are an expert React developer working on "AI Kitchen" (Gotuj z AI), a visual node-based editor for AI workflows.

## 🏗 Tech Stack
- **Core**: React 19, Vite, TypeScript
- **State**: Zustand (with `zundo` for undo/redo, `persist` for localStorage)
- **Styling**: Tailwind CSS, Lucide React (icons)
- **Animation**: Framer Motion
- **Canvas**: `react-draggable` (for blocks), SVG (for connections)

## 🏛 Architecture & State
The application state is centralized in `src/store/useStore.ts`.
- **Single Source of Truth**: Do not create local state for board data. Use the store.
- **Data Models** (`src/types.ts`):
  - `Block`: Nodes on the canvas (`chef`, `ingredients`, `dish`, `note`).
  - `Connection`: Links between blocks (`fromId`, `toId`).
- **View State**: The store tracks `view` (`x`, `y`, `scale`) for pan/zoom operations.
- **Persistence**: State is automatically saved to `localStorage` key `ai-kitchen-storage`.

## 🧩 Key Components
- **`Board.tsx`**: The main canvas. Handles pan/zoom and background interactions.
- **`Block.tsx`**: Renders individual nodes. Handles drag events and selection.
- **`ConnectionsLayer.tsx`**: SVG layer rendered *behind* blocks to draw connections.
- **`Sidebar.tsx`**: Tool palette for adding new blocks.
- **`PropertiesPanel.tsx`**: Right-side panel for editing the selected block's data.

## 🎨 Design System & UX
- **Theme**: Dark mode, "Premium" aesthetic.
- **Glassmorphism**: Use `backdrop-blur`, semi-transparent backgrounds, and subtle borders.
- **Motion**: Use `framer-motion` for interactions (pop-in, hover, selection pulse).
- **Typography**: `Inter` for UI, `JetBrains Mono` for data/prompts.

## 🛠 Development Guidelines
1.  **State Logic**: Put all business logic (adding/removing blocks, connecting) in `useStore.ts` actions. Components should only dispatch actions.
2.  **IDs**: Use `crypto.randomUUID()` for generating unique IDs.
3.  **Coordinates**: When adding blocks, calculate position relative to the current `view` center (see `addBlock` in store).
4.  **Type Safety**: Always update `src/types.ts` when modifying data structures.

## 🚀 Common Commands
- `npm run dev`: Start development server.
- `npm run build`: Type-check and build.
- `npm run lint`: Run ESLint.
