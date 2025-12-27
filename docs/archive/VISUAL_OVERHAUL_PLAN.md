# Plan Przebudowy Wizualnej Systemu "Zaspani"

## Cel
Przekształcenie obecnego, "zabałaganionego" widoku grafu w czytelny, profesjonalny i zorganizowany diagram, który ułatwia zrozumienie przepływu danych i procesów.

## Diagnoza Problemu
1.  **Ręczne pozycjonowanie**: Obecny plik `zaspani.json` ma sztywne koordynaty, które są trudne do utrzymania.
2.  **Brak hierarchii**: Wszystkie bloki wyglądają podobnie, trudno odróżnić "Scenariusz" od "Agenta" na pierwszy rzut oka.
3.  **Splątane połączenia**: Linie przecinają się w nieczytelny sposób.
4.  **Brak grupowania**: Logiczne grupy (np. "SCENARIO: Nowa Kampania") nie są wizualnie wyodrębnione.

## Plan Działania

### Faza 1: Automatyzacja Układu (Auto-Layout)
Najszybszy sposób na "posprzątanie".
- [ ] **Instalacja `dagre`**: Biblioteka do obliczania pozycji węzłów w grafach skierowanych (DAG).
- [ ] **Implementacja algorytmu**: Stworzenie funkcji `autoLayout()`, która przeliczy pozycje `x, y` dla wszystkich bloków na podstawie połączeń.
- [ ] **Przycisk "Uporządkuj"**: Dodanie przycisku w interfejsie (np. w Sidebarze lub na dole), który wyzwala auto-layout.

### Faza 2: Ulepszenie Bloków (Visual Distinction)
Lepsze rozróżnienie typów bloków.
- [ ] **Chef (Agent)**: Wygląd "Karty ID" ze zdjęciem/awatarem, wyraźniejszy nagłówek.
- [ ] **Ingredients (Dane)**: Wygląd "Dokumentu" lub "Listy", węższy, bardziej kompaktowy.
- [ ] **Dish (Wynik)**: Wygląd "Raportu" z wyraźnym akcentem sukcesu (zielony/fioletowy glow).
- [ ] **Note (Notatka)**: Żółty/papierowy styl, bez nagłówka "NOTE", po prostu treść.

### Faza 3: Zarządzanie Połączeniami
- [ ] **Inteligentne Krzywe**: Dostosowanie krzywizny linii w zależności od odległości (np. bardziej proste linie dla bliskich bloków).
- [ ] **Kolorowanie Ścieżek**: Wyróżnienie głównego przepływu (Flow) vs przepływu danych (Context).

### Faza 4: Grupowanie Wizualne (Scenariusze)
- [ ] **Obszary (Zones)**: Dodanie nowego typu elementu "Group" lub automatyczne rysowanie tła pod grupami bloków należących do jednego scenariusza (na podstawie prefiksów ID lub analizy grafu).

## Rekomendacja Techniczna
Zalecam rozpoczęcie od **Fazy 1 (Auto-Layout)**, ponieważ da to natychmiastowy efekt "posprzątania". Następnie przejście do **Fazy 2**, aby poprawić czytelność poszczególnych elementów.
