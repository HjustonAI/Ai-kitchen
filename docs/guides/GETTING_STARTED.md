# Getting Started

Developer onboarding guide for AI Kitchen.

---

## Prerequisites

- **Node.js** 20.19+ or 22.12+
- **npm** 9+
- **Git**
- **VS Code** (recommended)

---

## Quick Setup

```bash
# Clone the repository
git clone <repository-url>
cd ai-kitchen-copilot

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser
open http://localhost:5173
```

---

## Project Structure

```
ai-kitchen-copilot/
├── src/
│   ├── components/      # React components
│   │   ├── Board.tsx    # Main canvas
│   │   ├── Block.tsx    # Node component
│   │   └── ...
│   ├── store/           # Zustand stores
│   │   ├── useStore.ts  # Main state
│   │   └── useExecutionStore.ts
│   ├── lib/             # Utilities
│   │   └── executionEngineV2.ts
│   ├── types.ts         # TypeScript definitions
│   ├── App.tsx          # Root component
│   └── main.tsx         # Entry point
├── docs/                # Documentation
├── public/              # Static assets
└── package.json
```

---

## Development Workflow

### 1. Start Dev Server

```bash
npm run dev
```

The app runs on `http://localhost:5173` with hot module replacement.

### 2. Type Check

```bash
npx tsc --noEmit
```

Run before committing to catch type errors.

### 3. Lint

```bash
npm run lint
```

### 4. Build

```bash
npm run build
```

Creates production build in `dist/`.

### 5. Preview Build

```bash
npm run preview
```

---

## Key Concepts

### State Management

All application state lives in Zustand stores:

```typescript
// Get state
const blocks = useStore(state => state.blocks);

// Update state (via actions)
useStore.getState().addBlock('chef');
```

**Never** modify state directly. Always use store actions.

### Component Patterns

Components follow this pattern:

```tsx
// 1. Import store hooks
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/shallow';

// 2. Subscribe to needed state
const MyComponent = () => {
  const blocks = useStore(useShallow(state => state.blocks));
  const addBlock = useStore(state => state.addBlock);
  
  // 3. Render with state
  return <div>...</div>;
};
```

### Coordinate System

Canvas uses transformed coordinates:

```
World Space (blocks)     Screen Space (viewport)
       ↓                        ↓
   (x, y)          →       (x + view.x, y + view.y) * scale
```

When adding blocks, calculate world position from screen center:

```typescript
const worldX = -view.x + window.innerWidth / 2 - blockWidth / 2;
const worldY = -view.y + window.innerHeight / 2 - blockHeight / 2;
```

---

## Common Tasks

### Add a New Block Type

1. **Update types** (`src/types.ts`):
```typescript
export type BlockType = 'chef' | 'ingredients' | ... | 'my_new_type';
```

2. **Add block variant** (`src/components/blocks/`):
```tsx
// MyNewTypeBlock.tsx
export function MyNewTypeBlock({ block }: BlockProps) {
  return <div>...</div>;
}
```

3. **Register in Block.tsx**:
```tsx
const blockVariants = {
  // ...existing
  my_new_type: MyNewTypeBlock,
};
```

4. **Add to Sidebar palette**:
```tsx
{ type: 'my_new_type', icon: MyIcon, label: 'My Block' }
```

### Add a Store Action

1. **Define action in store**:
```typescript
// useStore.ts
interface AppState {
  // ...existing state
  myNewAction: (params: MyParams) => void;
}

// In create()
myNewAction: (params) => {
  set(state => ({
    // compute new state
  }));
}
```

2. **Use in component**:
```tsx
const myAction = useStore(state => state.myNewAction);
myAction({ param: 'value' });
```

### Add Keyboard Shortcut

In `Board.tsx` or relevant component:

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'x' && e.ctrlKey) {
      e.preventDefault();
      myAction();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [myAction]);
```

---

## Debugging

### React DevTools

Install browser extension to inspect component tree and state.

### Zustand DevTools

```typescript
// Already configured in stores
import { devtools } from 'zustand/middleware';
```

Open Redux DevTools extension to see state changes.

### Console Logging

```typescript
// In executionEngineV2.ts
console.log('[Engine] Packet arrived:', packetId);
```

### Execution Log

```typescript
import { ExecutionLogManager } from './components/ExecutionLog';

ExecutionLogManager.addEvent('debug', { message: 'test' });
```

---

## Performance Tips

### Use `useShallow`

```typescript
// ❌ Re-renders on ANY state change
const state = useStore();

// ✅ Re-renders only on blocks change
const blocks = useStore(useShallow(s => s.blocks));
```

### Memoize Components

```tsx
const Block = React.memo(function Block({ block }) {
  // ...
});
```

### Avoid Inline Objects

```tsx
// ❌ Creates new object every render
<Block style={{ color: 'red' }} />

// ✅ Stable reference
const style = useMemo(() => ({ color: 'red' }), []);
<Block style={style} />
```

---

## Testing

### Run Tests

```bash
npm test
```

### Write Tests

```typescript
// src/__tests__/myFeature.test.tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

---

## Resources

### Documentation
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Technical architecture
- [FEATURES.md](../FEATURES.md) - Feature list
- [technical/](../technical/) - Technical specs

### External
- [React Docs](https://react.dev)
- [Zustand Docs](https://zustand-demo.pmnd.rs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)

---

## Getting Help

1. Check existing documentation
2. Search codebase for similar patterns
3. Ask in team chat
4. Create an issue

---

## Next Steps

1. ✅ Run the dev server
2. 📖 Read [ARCHITECTURE.md](../ARCHITECTURE.md)
3. 🎮 Explore the app UI
4. 💻 Make your first change
5. 🧪 Run tests
