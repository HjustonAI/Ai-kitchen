# Mapa Drogowa Architektury Technicznej: Ku "AI Kitchen 2.0"

Ten dokument opisuje kroki techniczne niezbędne do przekształcenia obecnego prototypu w skalowalny, wydajny system wizualizacji agentów, zgodny z wizją "Idealnego Systemu".

## Faza 1: Fundamenty Wydajności (Rendering & LOD)
Zanim dodamy "życie" (animacje) i złożoność (fraktale), musimy upewnić się, że silnik renderujący udźwignie setki elementów.

### 1.1. Level of Detail (LOD)
*   **Cel**: Drastyczne zmniejszenie liczby elementów DOM renderowanych przy oddalonym widoku.
*   **Implementacja**:
    *   Komponent `Block` powinien obserwować `view.scale`.
    *   `scale > 0.6`: Pełny render (inputy, cienie, detale).
    *   `scale < 0.6`: Tryb uproszczony (tylko kontener, ikona, tytuł).
    *   `scale < 0.3`: Tryb minimalny (tylko kolorowy prostokąt).
*   **Korzyść**: Płynne 60 FPS nawet przy dużych diagramach.

### 1.2. Optymalizacja Warstwy Połączeń
*   **Cel**: Uniknięcie przeliczania wszystkich krzywych SVG przy ruchu jednego bloku.
*   **Implementacja**:
    *   Upewnienie się, że `ConnectionsLayer` renderuje tylko widoczne połączenia (culling) lub jest bardzo dobrze zoptymalizowany przez `memo`.

## Faza 2: Architektura Symulacji ("Żyjący Diagram")
Aby system "żył", musimy oddzielić stan edycji (statyczny) od stanu wykonania (dynamiczny).

### 2.1. Separacja Stanu (Transient Store)
*   **Cel**: Animacje nie mogą wpływać na historię Undo/Redo ani wyzwalać zapisu do LocalStorage.
*   **Implementacja**:
    *   Stworzenie `useExecutionStore` (Zustand) dla danych ulotnych:
        *   `activeNodeIds`: Lista aktualnie "pracujących" agentów.
        *   `dataPackets`: Lista pakietów danych przemieszczających się po połączeniach `{ id, connectionId, progress }`.
        *   `errors`: Lista błędów wykonania.

### 2.2. Silnik Animacji Przepływu
*   **Cel**: Wizualizacja przepływu danych bez "zarzynania" Reacta.
*   **Implementacja**:
    *   Wykorzystanie CSS Animations dla prostych stanów (pulsowanie).
    *   Dla pakietów danych: Warstwa SVG/Canvas nad połączeniami, renderowana niezależnie od React render cycle (np. używając `requestAnimationFrame` bezpośrednio w refach).

## Faza 3: Struktura Hierarchiczna (Fraktale)
Obsługa złożoności poprzez grupowanie i zagnieżdżanie.

### 3.1. Model Danych "Super-Bloku"
*   **Cel**: Możliwość zwijania grupy do jednego węzła.
*   **Implementacja**:
    *   Rozszerzenie typu `Group` o stan `collapsed: boolean`.
    *   Logika "Proxy Ports": Gdy grupa jest zwinięta, połączenia idące do jej wnętrza muszą wizualnie "przyczepić się" do krawędzi grupy.

### 3.2. Semantic Zoom
*   **Cel**: Płynne przechodzenie między widokiem ogólnym a szczegółowym.
*   **Implementacja**:
    *   Połączenie LOD z hierarchią. Gdy oddalamy widok, grupy automatycznie się "zamykają" wizualnie, pokazując tylko podsumowanie działu.

## Faza 4: Inteligentny Asystent (Meta-Agent)
Analiza struktury grafu w tle.

### 4.1. Silnik Reguł (Linter Grafu)
*   **Cel**: Wykrywanie błędów logicznych.
*   **Implementacja**:
    *   Hook `useGraphAnalysis`, który w tle (np. w Web Workerze) sprawdza:
        *   Czy każdy Agent ma wejście i wyjście?
        *   Czy nie ma pętli bez wyjścia?
        *   Czy typy danych są zgodne (np. tekst -> obraz).

---

## Rekomendowana Kolejność Działań
1.  **LOD (Faza 1.1)** - Najszybszy zysk wydajnościowy i UX.
2.  **Transient Store (Faza 2.1)** - Przygotowanie pod przyszłe funkcje "Live".
3.  **Collapsible Groups (Faza 3.1)** - Kluczowe dla zarządzania dużymi projektami.
