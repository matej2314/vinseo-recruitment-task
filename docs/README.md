---
wersja: 8
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-11-01
---

# Dokumentacja - Firmowy asystent spotkań

Spis dokumentacji startowej w katalogu `docs/`. Język: polski.  
Uruchomienie kodu i sekcja AI przy oddaniu: **root** `README.md` projektu (nie ten plik).

## Jak czytać

1. Zacznij od **`dokumentacja_koncepcyjna.md`** (po co system, zakres v1).
2. Potem **`architektura.md`** + **`architektura_katalogi_pliki.md`**.
3. Kontrakty I/O: **`dokumentacja_komunikacji.md`**; UI: **`frontend.md`**; LLM: **`llm_i_asystent.md`**.
4. Przepływy: **`data_flow.md`**; słownik: **`dictionary.md`**.
5. Jakość i ops: **`anty_patterny.md`**, **`testy.md`**, **`observability.md`**, **`deployment.md`**.
6. Decyzje produktowe / oddanie Części A: **`bezpieczenstwo_i_rodo.md`**, **`koszty_i_warianty.md`**, **`plan_wdrozenia_etapy.md`**.

Świadomie pominięte: `brand_types.md`.

## Spis plików

| Plik | Temat |
|------|--------|
| [dokumentacja_koncepcyjna.md](./dokumentacja_koncepcyjna.md) | Cel, odbiorcy, zakres / poza zakresem, sukces v1 |
| [architektura.md](./architektura.md) | Styl, procesy api/worker/web, auth (etap 0 hasło / etap 1+ Google IdP), ACL, pipeline, Prisma, audit |
| [architektura_katalogi_pliki.md](./architektura_katalogi_pliki.md) | Drzewo monorepo |
| [dokumentacja_komunikacji.md](./dokumentacja_komunikacji.md) | HTTP, BFF, pg-boss, port źródła, on-demand nagranie, reprocess (etap 1+), mapowanie Fireflies, demo |
| [frontend.md](./frontend.md) | Next.js, Tailwind, shadcn, auth UI, `/meetings` (Wynik)+Test+SSE+nagranie demo; Aktualizuj (etap 1+), mock `/search` |
| [llm_i_asystent.md](./llm_i_asystent.md) | LlmClient, UC1 summarize, UC2 ask; FF summary ignorowane |
| [dictionary.md](./dictionary.md) | Słownik pojęć |
| [data_flow.md](./data_flow.md) | Diagramy przepływów (w tym §5a Aktualizuj źródło) |
| [anty_patterny.md](./anty_patterny.md) | Pułapki stacku i projektu |
| [testy.md](./testy.md) | Piramida testów, Jest, CI |
| [observability.md](./observability.md) | pino, health, `audit_log` |
| [deployment.md](./deployment.md) | Środowiska, VPS, Nginx, CI, checklista deploy |
| [bezpieczenstwo_i_rodo.md](./bezpieczenstwo_i_rodo.md) | Zgody, retencja 90/12, erase faktu callu, ACL v1, IdP Google vs OAuth Calendar, vendorzy |
| [koszty_i_warianty.md](./koszty_i_warianty.md) | Warianty A / A’ / B z obliczeniami |
| [plan_wdrozenia_etapy.md](./plan_wdrozenia_etapy.md) | Etapy 0–3 (w tym Google login od etapu 1), kryteria sukcesu, root README oddania |

## Mapowanie temat → plik (skrót)

| Szukasz | Plik |
|---------|------|
| Co budujemy / poza MVP | `dokumentacja_koncepcyjna.md` |
| Nest, worker, pg-boss, porty | `architektura.md` |
| Gdzie leży kod w repo | `architektura_katalogi_pliki.md` |
| Endpointy, job, mock FF, on-demand nagranie | `dokumentacja_komunikacji.md` |
| Login (etap 0 hasło / etap 1+ Google), sidebar, `/meetings` (Wynik)+Test+nagranie, shadcn | `frontend.md` |
| LLM / asystent Q&A | `llm_i_asystent.md` |
| Znaczenie pojęć | `dictionary.md` |
| Sequence / flowchart | `data_flow.md` |
| Czego nie robić | `anty_patterny.md` |
| Co testować | `testy.md` |
| Logi i audyt DB | `observability.md` |
| VPS / Actions | `deployment.md` |
| RODO / zgody | `bezpieczenstwo_i_rodo.md` |
| Rachunek PLN | `koszty_i_warianty.md` |
| Roadmapa wdrożenia | `plan_wdrozenia_etapy.md` |
