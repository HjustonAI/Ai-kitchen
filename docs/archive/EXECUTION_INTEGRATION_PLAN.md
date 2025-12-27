# 🚀 ExecutionEngine v2.0 - Plan Integracji

> **Data utworzenia:** 2024-12-27  
> **Status:** W trakcie realizacji  
> **Cel:** Pełna wizualna reprezentacja przepływu danych w systemie agentic

---

## 📊 Aktualny Stan

### ✅ Zaimplementowane (Core Engine)

| Komponent | Plik | Opis |
|-----------|------|------|
| ExecutionEngine v2.0 | `src/lib/executionEngineV2.ts` | Event-driven state machine z fazami agenta |
| ExecutionStore | `src/store/useExecutionStore.ts` | Synchronizacja stanu via callbacks |
| ExecutionLayerOptimized | `src/components/ExecutionLayerOptimized.tsx` | Canvas rendering pakietów |
| BottomBar | `src/components/BottomBar.tsx` | Play/Stop/Speed controls |
| ChefBlock phases | `src/components/Block.tsx` | Wizualne fazy: idle/collecting/processing/outputting |

### 🔄 Przepływ Danych (Zaimplementowany)

```
┌─────────────┐     input      ┌─────────────┐     output     ┌─────────────┐
│ Input File  │ ─────────────► │   Chef      │ ─────────────► │    Dish     │
└─────────────┘    (blue)      │  (Agent)    │    (purple)    └─────────────┘
                               └──────┬──────┘
                                      │
                          query       │       response
                        (orange)      │       (green)
                        ◄─────────────┼──────────────►
                               ┌──────┴──────┐
                               │Context File │
                               └─────────────┘
```

### 📦 Typy Pakietów

| Typ | Kolor | Kierunek | Opis |
|-----|-------|----------|------|
| `input` | 🔵 Blue | Input → Agent | Trigger rozpoczynający cykl agenta |
| `query` | 🟠 Orange | Agent → Context (reverse) | Zapytanie o kontekst |
| `response` | 🟢 Green | Context → Agent | Odpowiedź z kontekstem |
| `output` | 🟣 Purple | Agent → Dish | Wynik przetwarzania |
| `handoff` | 🔷 Cyan | Agent → Agent | Przekazanie do następnego agenta |

### 🎭 Fazy Agenta (Chef)

```
┌────────┐     input arrives     ┌────────────┐     all responses     ┌────────────┐     timer     ┌────────────┐
│  IDLE  │ ──────────────────► │ COLLECTING │ ──────────────────► │ PROCESSING │ ──────────► │ OUTPUTTING │
└────────┘                       └────────────┘                       └────────────┘              └─────┬──────┘
     ▲                                                                                                  │
     └──────────────────────────────────────────────────────────────────────────────────────────────────┘
                                              outputs sent → reset
```

---

## 📋 FAZA 2: Wizualny Feedback (Priorytet: Wysoki)

### 2.1 Podświetlanie Połączeń Podczas Przepływu

**Cel:** Gdy pakiet podróżuje przez connection, połączenie powinno świecić/pulsować w kolorze pakietu.

**Plik:** `src/components/ConnectionsLayer.tsx`

**Implementacja:**

```typescript
// 1. Subskrybuj dataPackets z ExecutionStore
const dataPackets = useExecutionStore((s) => s.dataPackets);

// 2. Dla każdego połączenia sprawdź czy ma aktywny pakiet
const activeConnections = useMemo(() => {
  const map = new Map<string, { type: string; progress: number }>();
  dataPackets.forEach(packet => {
    if (!map.has(packet.connectionId) || packet.progress > map.get(packet.connectionId)!.progress) {
      map.set(packet.connectionId, { type: packet.type, progress: packet.progress });
    }
  });
  return map;
}, [dataPackets]);

// 3. Dla aktywnych połączeń dodaj:
//    - Glow effect (filter: drop-shadow)
//    - Kolor odpowiadający typowi pakietu
//    - Animacja pulse na całej linii
```

**Kolory dla połączeń:**
```typescript
const connectionColors = {
  input: '#3B82F6',     // blue-500
  query: '#F97316',     // orange-500
  response: '#22C55E',  // green-500
  output: '#A855F7',    // purple-500
  handoff: '#06B6D4',   // cyan-500
};
```

**Wizualizacja:**
- Gradient glow wzdłuż ścieżki
- Pulsowanie opacity (0.6 → 1.0 → 0.6)
- Opcjonalnie: "particle trail" effect

**Szczegóły techniczne:**
1. W ConnectionsLayer dodać subskrypcję do `useExecutionStore`
2. Dla każdej connection sprawdzić czy `activeConnections.has(conn.id)`
3. Jeśli tak - renderować dodatkową ścieżkę SVG z:
   - `stroke` w kolorze pakietu
   - `strokeWidth` większy niż normalna linia
   - `filter: url(#glow-filter)` z SVG filter dla blur
   - `opacity` animowana przez CSS keyframes lub inline style

**Przykład SVG glow filter:**
```svg
<defs>
  <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="4" result="blur"/>
    <feMerge>
      <feMergeNode in="blur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
</defs>
```

---

### 2.2 Context File Feedback

**Cel:** Wizualne wskazanie gdy context file otrzymuje query i wysyła response.

**Plik:** `src/components/Block.tsx` (ContextFileBlock)

**Wymagane stany:**
1. **Idle** - domyślny wygląd
2. **Receiving Query** - pomarańczowy puls (query przychodzi)
3. **Processing** - krótka animacja "reading"
4. **Sending Response** - zielony puls (response wychodzi)

**Implementacja:**

```typescript
// 1. Dodaj nowe callbacki do ExecutionEngine
onQueryArrived?: (contextBlockId: string, fromAgentId: string) => void;
onResponseSent?: (contextBlockId: string, toAgentId: string) => void;

// 2. W useExecutionStore - track context states
contextStates: Map<string, 'idle' | 'receiving' | 'processing' | 'sending'>;

// 3. W ContextFileBlock - subskrybuj i pokaż animacje
const contextState = useExecutionStore((s) => s.contextStates.get(block.id));
```

**Wizualizacja:**
```
┌─────────────────────────────────────┐
│ 📁 Context File                     │
│ ────────────────────────────────    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ query →  [🟠 pulsing border]│    │  ← Receiving
│  │          [reading anim]     │    │  ← Processing
│  │ response → [🟢 glow out]    │    │  ← Sending
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

**Szczegóły techniczne:**

1. **Rozszerzyć ExecutionStore:**
```typescript
interface ExecutionState {
  // ... existing
  contextStates: Map<string, ContextBlockState>;
  setContextState: (blockId: string, state: ContextBlockState) => void;
}

type ContextBlockState = 'idle' | 'receiving' | 'processing' | 'sending';
```

2. **Dodać callbacki w engine:**
```typescript
// W handlePacketArrival dla type === 'query':
this.onQueryArrived?.(contextBlockId, requestingAgentId);

// W sendContextResponse:
this.onResponseSent?.(contextBlockId, requestingAgentId);
```

3. **W ContextFileBlock:**
```typescript
const contextState = useExecutionStore((s) => s.contextStates.get(block.id) || 'idle');

// CSS classes based on state
const stateClasses = {
  idle: '',
  receiving: 'ring-2 ring-orange-400 animate-pulse',
  processing: 'ring-2 ring-yellow-400',
  sending: 'ring-2 ring-green-400 shadow-[0_0_20px_rgba(34,197,94,0.5)]',
};
```

---

### 2.3 Input/Output File Feedback

**Cel:** Animacja na input file gdy wysyła dane, dish gdy odbiera.

**Pliki:** `src/components/Block.tsx` (InputFileBlock, DishBlock)

#### Input File States:
1. **Idle** - domyślny
2. **Sending** - niebieski puls/glow podczas wysyłania input packet

#### Dish States:
1. **Idle** - domyślny
2. **Receiving** - fioletowy puls gdy output przybywa
3. **Complete** - krótka celebracja (check mark, sparkle)

**Implementacja:**

```typescript
// 1. Track w ExecutionStore
inputStates: Map<string, 'idle' | 'sending'>;
dishStates: Map<string, 'idle' | 'receiving' | 'complete'>;

// 2. Engine callbacks
onPacketCreated: (packet) => {
  if (packet.type === 'input') {
    const conn = connections.find(c => c.id === packet.connectionId);
    if (conn) setInputState(conn.fromId, 'sending');
  }
};

onPacketArrived: (packet) => {
  if (packet.type === 'output') {
    const conn = connections.find(c => c.id === packet.connectionId);
    if (conn) {
      setDishState(conn.toId, 'receiving');
      setTimeout(() => setDishState(conn.toId, 'complete'), 500);
      setTimeout(() => setDishState(conn.toId, 'idle'), 2000);
    }
  }
};
```

**Wizualizacja:**

Input File (sending):
```css
.input-sending {
  box-shadow: 0 0 30px rgba(59, 130, 246, 0.6);
  animation: pulse-blue 0.5s ease-in-out;
}
```

Dish (receiving → complete):
```css
.dish-receiving {
  box-shadow: 0 0 30px rgba(168, 85, 247, 0.6);
  animation: pulse-purple 0.3s ease-in-out;
}

.dish-complete {
  /* Checkmark icon appears */
  /* Sparkle particles animation */
}
```

---

## 📋 FAZA 3: ContextPanel Integration (Priorytet: Średni)

### 3.1 Live Execution Stats

**Cel:** Panel pokazujący aktywne pakiety, fazy agentów w czasie rzeczywistym.

**Plik:** `src/components/ContextPanel.tsx` (nowa sekcja)

**Zawartość:**
```
┌─────────────────────────────────────┐
│ 📊 Execution Monitor                │
│ ─────────────────────────────────── │
│                                     │
│ Active Packets: 3                   │
│ ├─ 🔵 input → Agent-1               │
│ ├─ 🟠 query → Context-A             │
│ └─ 🟢 response → Agent-1            │
│                                     │
│ Agent States:                       │
│ ├─ Agent-1: 🔍 Collecting (2/3)     │
│ └─ Agent-2: 💤 Idle                 │
│                                     │
│ Context Files:                      │
│ ├─ Context-A: 📤 Sending            │
│ └─ Context-B: 💤 Idle               │
│                                     │
└─────────────────────────────────────┘
```

**Implementacja:**

1. **Nowy komponent `ExecutionMonitor`:**
```typescript
const ExecutionMonitor: React.FC = () => {
  const dataPackets = useExecutionStore((s) => s.dataPackets);
  const agentPhases = useExecutionStore((s) => s.agentPhases);
  const contextStates = useExecutionStore((s) => s.contextStates);
  const simulationMode = useExecutionStore((s) => s.simulationMode);
  
  if (!simulationMode) return null;
  
  return (
    <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg p-3 space-y-3">
      <h3 className="text-xs font-bold text-white/60 uppercase">Execution Monitor</h3>
      
      {/* Active Packets */}
      <PacketList packets={dataPackets} />
      
      {/* Agent States */}
      <AgentStateList phases={agentPhases} />
      
      {/* Context States */}
      <ContextStateList states={contextStates} />
    </div>
  );
};
```

2. **Integracja w ContextPanel:**
```typescript
// W ContextPanel.tsx dodać sekcję
<ExecutionMonitor />
```

---

### 3.2 Speed Control w Panelu

**Cel:** Slider do kontroli prędkości symulacji.

**Plik:** `src/components/BottomBar.tsx` (rozszerzenie)

**UI:**
```
Speed: [─────●──────] 1.5x
       0.25x        3x

Presets: [🐌 Slow] [▶️ Normal] [⚡ Fast]
```

**Implementacja:**
```typescript
const SpeedControl: React.FC = () => {
  const executionSpeed = useExecutionStore((s) => s.executionSpeed);
  const setExecutionSpeed = useExecutionStore((s) => s.setExecutionSpeed);
  
  const presets = [
    { label: '🐌', value: 0.25, title: 'Slow' },
    { label: '▶️', value: 1, title: 'Normal' },
    { label: '⚡', value: 2, title: 'Fast' },
  ];
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/60">Speed:</span>
      <input 
        type="range" 
        min="0.25" 
        max="3" 
        step="0.25"
        value={executionSpeed}
        onChange={(e) => setExecutionSpeed(parseFloat(e.target.value))}
        className="w-24 accent-cyan-500"
      />
      <span className="text-xs text-white/80 w-8">{executionSpeed}x</span>
      
      <div className="flex gap-1 ml-2">
        {presets.map(p => (
          <button
            key={p.value}
            onClick={() => setExecutionSpeed(p.value)}
            title={p.title}
            className={cn(
              "px-2 py-1 rounded text-xs",
              executionSpeed === p.value 
                ? "bg-cyan-500/30 text-cyan-300" 
                : "bg-white/5 text-white/60 hover:bg-white/10"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};
```

---

### 3.3 Execution Log

**Cel:** Historia zdarzeń (packet sent, arrived, phase change).

**Plik:** Nowy `src/components/ExecutionLog.tsx`

**Zawartość:**
```
┌─────────────────────────────────────────────┐
│ 📜 Execution Log                      [Clear]│
│ ─────────────────────────────────────────── │
│                                             │
│ 19:45:32.123  Agent-1: idle → collecting    │
│ 19:45:32.456  📤 Query sent to Context-A    │
│ 19:45:32.789  📤 Query sent to Context-B    │
│ 19:45:33.234  📥 Response from Context-A    │
│ 19:45:33.567  📥 Response from Context-B    │
│ 19:45:33.890  Agent-1: collecting → process │
│ 19:45:35.123  Agent-1: processing → output  │
│ 19:45:35.456  📤 Output sent to Dish-1      │
│ 19:45:36.789  ✅ Output received at Dish-1  │
│                                             │
└─────────────────────────────────────────────┘
```

**Implementacja:**

1. **Rozszerzyć ExecutionStore:**
```typescript
interface LogEntry {
  id: string;
  timestamp: number;
  type: 'packet_created' | 'packet_arrived' | 'phase_change' | 'context_state';
  message: string;
  data?: any;
}

interface ExecutionState {
  // ... existing
  executionLogs: LogEntry[];
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
}
```

2. **Dodać logi w callbackach:**
```typescript
onPacketCreated: (packet) => {
  // ... existing logic
  addLog({
    type: 'packet_created',
    message: `📤 ${packet.type} packet created`,
    data: { packetId: packet.id, type: packet.type }
  });
};

onAgentPhaseChanged: (agentId, phase) => {
  // ... existing logic
  addLog({
    type: 'phase_change',
    message: `Agent ${agentId.slice(0,8)}: → ${phase}`,
    data: { agentId, phase }
  });
};
```

3. **Komponent ExecutionLog:**
```typescript
const ExecutionLog: React.FC = () => {
  const logs = useExecutionStore((s) => s.executionLogs);
  const clearLogs = useExecutionStore((s) => s.clearLogs);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs.length]);
  
  return (
    <div className="bg-slate-900/80 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b border-white/10">
        <h3 className="text-xs font-bold text-white/60 uppercase">Execution Log</h3>
        <button onClick={clearLogs} className="text-xs text-white/40 hover:text-white/80">
          Clear
        </button>
      </div>
      <div ref={containerRef} className="h-48 overflow-y-auto p-2 font-mono text-xs">
        {logs.map(log => (
          <div key={log.id} className="text-white/70 py-0.5">
            <span className="text-white/40">
              {new Date(log.timestamp).toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                fractionalSecondDigits: 3 
              })}
            </span>
            {' '}{log.message}
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 📋 FAZA 4: Zaawansowane Scenariusze (Priorytet: Niski)

### 4.1 Multi-Agent Handoff

**Cel:** Chef → Chef chaining z wizualnym handoff.

**Obecny stan:** Częściowo zaimplementowane (handoff packet type istnieje).

**Do zrobienia:**
1. Wizualizacja handoff packet (cyan, większy/wyróżniony)
2. Animacja "przekazania pałeczki" między agentami
3. Sekwencyjne uruchamianie agentów w łańcuchu

```
Agent-1 (processing) ──handoff──► Agent-2 (idle → collecting)
```

**Implementacja:**
- W `executeOutputs` sprawdzić czy target to `chef`
- Jeśli tak, użyć typu `handoff` zamiast `output`
- Handoff packet triggeruje `handlePacketArrival` który startuje nowy cykl agenta

---

### 4.2 Parallel Context Queries

**Cel:** Wizualizacja wielu równoległych query do context files.

**Obecny stan:** Engine wysyła wszystkie query naraz.

**Do zrobienia:**
1. Fan-out animacja (pakiety rozchodzą się)
2. Gathering animacja (responses zbierają się)
3. Progress indicator "2/3 contexts received"

```
                   ┌─► Context-A ─┐
                   │              │
Agent ─── query ───┼─► Context-B ─┼─── responses ──► Agent
                   │              │
                   └─► Context-C ─┘
```

**Implementacja:**
- Dodać do `AgentState`: `pendingContextCount`, `receivedContextCount`
- Wyświetlać progress w ChefBlock: "Collecting 2/3..."
- Wizualizacja w ExecutionMonitor

---

### 4.3 Error States

**Cel:** Wizualizacja błędów w przepływie.

**Nowe typy:**
- `error` packet (czerwony, X icon)
- Timeout visualization
- Missing connection warning

**Implementacja:**
```typescript
// Nowy typ pakietu
type: 'input' | 'query' | 'response' | 'output' | 'handoff' | 'error'

// Error scenarios:
// - No input connection → Agent shows warning icon
// - No context connection → Skip collecting phase (already works)
// - Timeout waiting for response → Error packet sent back
// - No output connection → Warning on agent
```

---

### 4.4 Step-by-Step Mode

**Cel:** Krokowe wykonywanie dla debugowania.

**UI:**
```
[⏮️ Prev] [⏸️ Pause] [▶️ Step] [⏭️ Next] [⏩ Continue]
```

**Implementacja:**
```typescript
// Engine modes
executionMode: 'continuous' | 'step';

// W step mode engine zatrzymuje się po:
// - Packet arrival
// - Phase transition

// Użytkownik klika "Step" → engine wykonuje jeden krok
step(): void {
  // Process one event and pause
}
```

---

## 📋 FAZA 5: Persistence & Export (Priorytet: Niski)

### 5.1 Execution Presets

**Cel:** Zapisywanie ustawień symulacji.

**Presets:**
- Speed setting
- Visual options (particles on/off, glow intensity)
- Log verbosity

**Storage:** localStorage jako część persist middleware

---

### 5.2 Execution Recording

**Cel:** Nagrywanie i odtwarzanie wykonania.

**Features:**
- Record all events with timestamps
- Playback with timeline scrubber
- Export as JSON/video

---

## 🎯 Priorytetyzacja Implementacji

### Sprint 1 (Aktualny)
- [ ] 2.1 Podświetlanie połączeń podczas przepływu
- [ ] 2.2 Context File feedback (receiving/sending states)
- [ ] 2.3 Input/Dish feedback (sending/receiving/complete)

### Sprint 2
- [ ] 3.1 Live execution stats (ExecutionMonitor)
- [ ] 3.2 Speed slider control
- [ ] 3.3 Execution log panel

### Sprint 3
- [ ] 4.1 Multi-agent handoff visualization
- [ ] 4.2 Parallel queries progress indicator

### Backlog
- [ ] 4.3 Error states visualization
- [ ] 4.4 Step-by-step debug mode
- [ ] 5.1 Execution presets
- [ ] 5.2 Execution recording

---

## 📁 Struktura Plików (Docelowa)

```
src/
├── components/
│   ├── Block.tsx                    # Bloki z execution feedback
│   ├── ConnectionsLayer.tsx         # Podświetlane połączenia
│   ├── ExecutionLayerOptimized.tsx  # Canvas rendering pakietów
│   ├── ExecutionLog.tsx             # [NOWY] Log zdarzeń
│   ├── ExecutionMonitor.tsx         # [NOWY] Stats panel
│   └── BottomBar.tsx                # Controls + speed slider
├── store/
│   ├── useStore.ts                  # Main app state
│   └── useExecutionStore.ts         # Execution state + logs + block states
└── lib/
    └── executionEngineV2.ts         # Core engine
```

---

## 🔗 Zależności Między Zadaniami

```
2.1 Podświetlanie połączeń ─────────────────────────────────┐
    │                                                       │
    └─► Wymaga: dataPackets w store (✅ gotowe)             │
                                                            │
2.2 Context File feedback ──────────────────────────────────┤
    │                                                       │
    └─► Wymaga: nowe callbacki w engine                     │
        └─► contextStates w store                           │
                                                            │
2.3 Input/Dish feedback ────────────────────────────────────┤
    │                                                       │
    └─► Wymaga: inputStates, dishStates w store             │
                                                            │
                                                            ▼
3.1 Live execution stats ◄──────────────────────────────────┘
    │
    └─► Wymaga: wszystkie stany z Fazy 2
         └─► Nowy komponent ExecutionMonitor
              │
              ├─► 3.2 Speed slider (niezależne)
              │
              └─► 3.3 Execution log
                   │
                   └─► 4.x Zaawansowane scenariusze
```

---

## ✅ Checklist Przed Merge

### Performance
- [ ] 60fps przy 10+ aktywnych pakietach
- [ ] Brak memory leaks (cleanup w useEffect)
- [ ] Throttling dla częstych updates (useMemo, useCallback)

### Compatibility
- [ ] Działa z grupami (collapsed/expanded)
- [ ] Undo/Redo nie psuje stanu execution
- [ ] Resize okna nie psuje animacji

### Code Quality
- [ ] TypeScript: brak `any`, poprawne typy
- [ ] Console czysta (bez warnings/errors)
- [ ] Komentarze dla skomplikowanej logiki

### UX
- [ ] Animacje smooth przy różnych prędkościach
- [ ] Czytelne kolory na ciemnym tle
- [ ] Feedback nie przeszkadza w edycji

---

## 📝 Notatki Implementacyjne

### Rendering Performance Tips

1. **Unikać re-renderów całego ConnectionsLayer:**
   - Użyć `React.memo` dla poszczególnych połączeń
   - Lub przenieść glow do osobnego canvas layer

2. **Throttle state updates:**
   ```typescript
   // Zamiast aktualizować przy każdym frame
   const throttledSetState = useMemo(
     () => throttle((state) => setState(state), 16),
     []
   );
   ```

3. **Batch state updates:**
   ```typescript
   // Grupować wiele zmian w jeden setState
   useExecutionStore.setState((s) => ({
     contextStates: new Map(s.contextStates).set(id, state),
     // ... inne zmiany
   }));
   ```

### SVG vs Canvas Considerations

- **SVG (ConnectionsLayer):** Lepsze dla glow effects, łatwiejsze stylowanie
- **Canvas (ExecutionLayerOptimized):** Lepsze dla wielu animowanych elementów

Rozważyć hybrid approach:
- SVG dla statycznych połączeń + glow
- Canvas dla ruchomych pakietów
