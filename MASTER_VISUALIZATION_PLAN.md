# Master Plan: Intuicyjna Wizualizacja Systemu Agentowego

## 🎯 Cel Główny
Stworzenie wizualizacji, która pozwala osobie patrzącej na graf po raz pierwszy instynktownie zrozumieć działanie systemu agentowego. Graf ma opowiadać historię przepływu danych i decyzji.

## 🧠 Filozofia Designu
1.  **Forma podąża za funkcją**: Kształt bloku musi natychmiast sugerować jego rolę (Agent = Osoba/Procesor, Dane = Dokument/Zasób, Wynik = Cel).
2.  **Kontekst przez Grupowanie**: Bloki nie wiszą w próżni. Są częścią większych procesów (Scenariuszy), co musi być widoczne wizualnie (strefy, tła).
3.  **Przepływ jako Narracja**: Połączenia to nie tylko kreski. To rurociągi, którymi płyną informacje.

## 🗺️ Mapa Drogowa (Roadmap)

### Faza 1: Tożsamość Bloków (Block Identity)
*Cel: Uczynienie każdego typu bloku unikalnym i rozpoznawalnym.*
- [x] **Refaktoryzacja Block.tsx**: Przygotowanie komponentu na obsługę drastycznie różnych wariantów wizualnych.
- [x] **Chef (Agent)**: Transformacja w "Kartę Agenta". Musi wyglądać jak aktywny wykonawca.
    - Ikona/Awatar.
    - Wyraźny nagłówek z rolą.
    - Stylistyka "Tech/ID Card".
- [x] **Ingredients (Dane/Input)**: Transformacja w "Zasób".
    - Wygląd pliku, dokumentu lub stosu danych.
    - Mniejszy, bardziej kompaktowy niż Agent.
    - Stylistyka "Flat/Paper".
- [x] **Dish (Wynik/Output)**: Transformacja w "Nagrodę/Cel".
    - Wyróżniający się kształt (np. zaokrąglony, lub z poświatą).
    - Kolorystyka sugerująca sukces/finalizację.
- [x] **Note (Kontekst)**: Transformacja w "Adnotację".
    - Wygląd "Sticky Note" lub komentarza w kodzie.
    - Brak ciężkich ramek, tło transparentne lub papierowe.

### Faza 2: Architektura i Grupowanie (Structure & Grouping)
*Cel: Wprowadzenie porządku i hierarchii.*
- [x] **System Stref (Zones)**: Możliwość wizualnego grupowania bloków (np. "Scenariusz: Onboarding").
    - Tła pod grupami bloków.
    - Etykiety grup.
- [x] **Auto-Layout**: Implementacja algorytmu (np. `dagre` lub `elkjs`) do automatycznego układania "spaghetti" w czytelny przepływ.

### Faza 3: Inteligentne Połączenia (Smart Connections)
*Cel: Pokazanie kierunku i typu przepływu.*
- [x] **Style Linii**: Różne style dla przepływu sterowania vs przepływu danych.
- [x] **Animacja Przepływu**: Subtelne animacje na liniach pokazujące kierunek działania.
- [x] **Unikanie Kolizji**: Lepsze trasowanie linii, aby nie przecinały bloków (częściowo rozwiązane przez Auto-Layout i lepsze centrowanie).

### Faza 4: Kreatywność i Detal (Polish & Delight)
*Cel: Efekt "Wow" i dopracowanie UX.*
- [ ] **Mikro-interakcje**: Reakcje na hover, selekcję, edycję.
- [ ] **Typografia i Ikony**: Spójny zestaw ikon (Lucide) i czytelne fonty.
- [ ] **Szklany Interfejs (Glassmorphism)**: Nowoczesny, lekki styl UI.
