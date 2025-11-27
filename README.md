# Gotuj z AI – AI Kitchen Board

A visual "kitchen board" for planning AI systems, built with React, TypeScript, Vite, and Tailwind CSS.

## Features

- **Interactive Board**: Drag and drop blocks representing Chefs (Agents), Ingredients (Data), Dishes (Outputs), and Notes.
- **Elegant UI**: Dark theme with neon accents ("Elegant AI Kitchen").
- **Simple Workflow**: Add blocks, edit titles/descriptions, and organize your thoughts.
- **Prompt Bar**: A dedicated space for your main prompt or recipe line.

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- react-draggable
- lucide-react

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

- Click buttons in the sidebar to add blocks.
- Drag blocks to arrange them.
- Click a block to select it.
- Click text fields to edit content.
- Use "Wyczyść blat" to clear everything.

## Generowanie Schematu z LLM

Jeśli masz już opisany proces lub architekturę AI w innym czacie, możesz poprosić LLM o wygenerowanie pliku JSON, który zaimportujesz do AI Kitchen.

Skopiuj i wklej poniższy prompt do swojego czatu z LLM (ChatGPT, Claude, etc.):

> Jesteś architektem systemów AI. Przeanalizuj naszą dyskusję o architekturze/procesie i wygeneruj plik JSON reprezentujący ten system jako graf bloków i połączeń, gotowy do importu do narzędzia "AI Kitchen".
>
> Format wyjściowy musi być zgodny z następującym schematem JSON:
>
> ```json
> {
>   "blocks": [
>     {
>       "id": "string",
>       "type": "chef" | "ingredients" | "dish" | "note",
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
> **Instrukcje dotyczące typów:**
> - `chef`: Agent AI, Model, Proces przetwarzania.
> - `ingredients`: Dane wejściowe, Kontekst, Baza wiedzy, Prompt użytkownika.
> - `dish`: Wynik końcowy, Odpowiedź, Wygenerowany plik.
> - `note`: Dodatkowe uwagi, komentarze.
>
> **Instrukcje wizualne:**
> - Rozmieść bloki w logicznym porządku (np. przepływ od lewej do prawej).
> - Zachowaj odstępy (np. co 300-400 pikseli w osi X), aby graf był czytelny.
> - Wygeneruj sam czysty JSON.
