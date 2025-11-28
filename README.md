# Gotuj z AI – AI Kitchen Board

A visual "kitchen board" for planning AI systems, built with React, TypeScript, Vite, and Tailwind CSS.

## 🌟 Features

- **Interactive Board**: Drag and drop blocks representing Chefs (Agents), Ingredients (Data), Dishes (Outputs), and Notes.
- **Fractal Groups**: Group related blocks together. Collapse groups to simplify the view (Fractal Design). Connections to internal blocks are automatically rerouted to the group when collapsed.
- **Smart Connections**: Connect blocks by dragging from handles. Connections automatically update their anchor points based on relative positions to avoid overlapping.
- **Accessibility**: Full keyboard navigation support (Tab, Enter, Space) and ARIA labels for screen readers.
- **Elegant UI**: Dark theme with neon accents, glassmorphism effects, and smooth animations powered by Framer Motion.
- **State Management**: Robust undo/redo system and local storage persistence.

## 🏗 Tech Stack

- **Core**: React 19, TypeScript, Vite
- **State**: Zustand, Zundo (Undo/Redo)
- **Styling**: Tailwind CSS, clsx, tailwind-merge
- **Icons**: Lucide React
- **Animation**: Framer Motion
- **Canvas**: react-draggable, react-rnd (for resizing)
- **Graph Utils**: dagre (auto-layout)

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open the app:**
   Navigate to [http://localhost:5173](http://localhost:5173) in your browser.

## 📖 Usage Guide

### Basic Operations
- **Add Blocks**: Use the sidebar to add Chefs, Ingredients, Dishes, or Notes.
- **Move**: Drag blocks to arrange them on the canvas.
- **Connect**: Drag from the right handle of a block to the left handle of another to create a connection.
- **Edit**: Click a block to select it and edit its properties in the right panel. Double-click text to edit inline.

### Grouping
- **Create Group**: Select multiple blocks (Shift+Click or Drag Select) and click the "Group" button (or press `Ctrl+G`).
- **Collapse/Expand**: Double-click a group header or use the toggle button to collapse/expand it.
- **Nested Groups**: Groups can contain other groups, allowing for hierarchical organization.

### Keyboard Shortcuts
- `Delete` / `Backspace`: Remove selected block/connection.
- `Ctrl+Z` / `Ctrl+Y`: Undo / Redo.
- `Ctrl+G`: Group selected blocks.
- `Ctrl+Shift+G`: Ungroup.
- `Space`: Pan the canvas (hold and drag).

## 🤖 Generowanie Schematu z LLM

Możesz wygenerować schemat systemu AI za pomocą LLM i zaimportować go do aplikacji.

**Prompt dla LLM:**

> Jesteś architektem systemów AI. Przeanalizuj naszą dyskusję o architekturze/procesie i wygeneruj plik JSON reprezentujący ten system jako graf bloków i połączeń, gotowy do importu do narzędzia "AI Kitchen".
>
> Format wyjściowy musi być zgodny z następującym schematem JSON:
>
> ```json
> {
>   "groups": [
>     {
>       "id": "string",
>       "title": "string",
>       "x": number,
>       "y": number,
>       "width": number,
>       "height": number,
>       "color": "string (e.g. 'blue', 'red', 'green', 'purple', 'orange')",
>       "collapsed": boolean
>     }
>   ],
>   "blocks": [
>     {
>       "id": "string",
>       "type": "chef" | "ingredients" | "dish" | "note" | "context_file" | "input_file",
>       "title": "string",
>       "description": "string",
>       "x": number,
>       "y": number
>     }
>   ],
>   "connections": [
>     {
>       "id": "string",
>       "fromId": "string",
>       "toId": "string",
>       "type": "default" | "flow" | "sync",
>       "label": "string (optional)"
>     }
>   ]
> }
> ```
>
> **Instrukcje dotyczące typów bloków:**
> - `chef`: Agent AI, LLM, lub proces przetwarzający. (Główny wykonawca).
> - `ingredients`: Surowe dane, bazy wiedzy, API, lub zasoby ogólne.
> - `context_file`: Pliki kontekstowe, dokumentacja, instrukcje, szablony (dane statyczne/referencyjne).
> - `input_file`: Dane wejściowe użytkownika, zmienne startowe, pliki do przetworzenia (dane dynamiczne).
> - `dish`: Wynik działania, wygenerowany plik, raport lub odpowiedź.
> - `note`: Notatka, komentarz lub nagłówek sekcji.
>
> **Instrukcje dotyczące grup:**
> - Grupy są definiowane przez prostokąt (x, y, width, height).
> - Bloki znajdujące się wewnątrz tego prostokąta wizualnie należą do grupy.
> - Używaj grup do logicznego podziału na etapy procesu (np. "Etap 1: Analiza", "Etap 2: Generowanie").

## 🛠 Development

### Architecture
- **Store**: `src/store/useStore.ts` is the single source of truth. It handles all state mutations including block movements, connections, and grouping logic.
- **Components**:
  - `Board.tsx`: Main canvas area.
  - `Block.tsx`: Individual node component.
  - `Group.tsx`: Container for grouped blocks.
  - `ConnectionsLayer.tsx`: SVG layer for drawing lines.
  - `ExecutionLayer.tsx`: Handles visual execution flows (optional).

### Build Optimization
The project uses Vite with manual chunking configured to split vendor libraries (`react`, `framer-motion`, etc.) for optimal load performance.

```bash
npm run build
```
