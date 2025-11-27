# Plan Optymalizacji Płynności Działania (Performance Optimization Plan)

## Diagnoza
Po wprowadzeniu efektów wizualnych (Glassmorphism, cienie, animacje) oraz nowej warstwy połączeń, aplikacja może obciążać przeglądarkę w dwóch obszarach:
1.  **GPU (Karta Graficzna)**: Efekty `backdrop-filter: blur`, złożone cienie (`box-shadow`) i gradienty są kosztowne w renderowaniu, zwłaszcza gdy elementów jest dużo.
2.  **CPU (Procesor)**: Biblioteka `framer-motion` animująca każdą ścieżkę połączenia oraz re-renderowanie całej warstwy połączeń przy każdej zmianie mogą powodować spadki klatek (FPS).

## Faza 1: Optymalizacja Renderowania (CSS & GPU)
Najszybsze zyski wydajnościowe poprzez odciążenie karty graficznej.

- [ ] **Promocja Warstw (Layer Promotion)**: Dodanie `will-change: transform` do bloków, aby przeglądarka trzymała je w osobnych warstwach kompozycji.
- [ ] **Redukcja Blur**: Zmniejszenie wartości `backdrop-blur` lub wyłączenie go podczas przesuwania (drag).
- [ ] **Uproszczenie Cieni**: Zastąpienie złożonych cieni prostszymi odpowiednikami lub użycie grafik zamiast cieni CSS.

## Faza 2: Optymalizacja React & State (CPU)
Zmniejszenie liczby niepotrzebnych przeliczeń.

- [ ] **Memoizacja Połączeń**: Wydzielenie pojedynczego połączenia do osobnego komponentu `<Connection />` owiniętego w `React.memo`. Dzięki temu zmiana pozycji jednego bloku nie wymusi przerysowania wszystkich innych linii (jeśli wdrożymy aktualizację live).
- [ ] **Selektywny State**: Użycie `useShallow` z Zustand, aby komponenty nie renderowały się ponownie, gdy zmieniają się nieistotne dla nich dane.
- [ ] **Statyczne Ścieżki**: Usunięcie animacji `framer-motion` (`initial`, `animate`) dla *istniejących* połączeń. Animowanie ich przy każdym renderze jest zbędne. Powinny się animować tylko przy powstaniu.

## Faza 3: Optymalizacja Interakcji (Drag & Drop)
Płynność przesuwania.

- [ ] **Transient Updates**: Obecnie linie nie podążają za blokiem w trakcie przesuwania (tylko po upuszczeniu). Jeśli chcemy to zmienić bez "lagów", musimy aktualizować pozycje bezpośrednio w DOM (refs) lub użyć niezarządzanego stanu dla pozycji tymczasowych, zamiast aktualizować główny Store Reacta w każdej klatce.

## Rekomendacja Natychmiastowa
Wdrożę teraz **Fazę 1** i część **Fazy 2**, co powinno dać odczuwalną poprawę:
1.  Dodam `will-change-transform` do bloków.
2.  Zoptymalizuję `ConnectionsLayer`, usuwając zbędne animacje ciągłe i memoizując linie.
