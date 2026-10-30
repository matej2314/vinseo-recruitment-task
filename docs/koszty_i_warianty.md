---
wersja: 4
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-30
---

# Koszty i warianty

Orientacyjne koszty **miesięczne** Firmowego asystenta spotkań (PLN). To **model decyzyjny**, nie oferta handlowa. Ceny vendorów i kurs walut należy podmienić po umowie / fakturze.

## Założenia wspólne

| Parametr | Wartość | Skąd |
|----------|---------|------|
| Wolumen spotkań | **300 h / mies.** | skala produktu |
| Średni czas spotkania | **45 min** (0,75 h) | skala produktu |
| Liczba spotkań | \(300 / 0{,}75 = \) **400** / mies. | wyliczenie |
| Osoby regularnie na spotkaniach | **25** | skala produktu |
| Kurs roboczy | **1 USD = 4,00 PLN** | założenie docs (do aktualizacji) |
| VPS (Compose: web+api+worker+Postgres) | **80–150 PLN** / mies. | widełki |
| Model LLM (UC1 summary; ten sam provider pod UC2 ask później) | **GPT-5.2** | decyzja kosztów; patrz `llm_i_asystent.md` |
| Cennik input | **1,75 USD / 1M tokenów** | ustalone |
| Cennik output | **14 USD / 1M tokenów** | ustalone |
| Fireflies | **19 USD / seat / mies.** | ustalone |
| Tokeny na spotkanie 45 min (założenie) | input **10 000**, output **800** | rząd wielkości transcript+prompt / summary+actions |

**Uwaga tokenów:** 10k/800 to założenie inżynierskie (PL + diarization + prompt). Po pierwszym miesiącu prod warto podmienić średnią z telemetryki.

### Koszt LLM na jedno spotkanie

\[
C_{in} = \frac{10\,000}{10^6} \times 1{,}75 = 0{,}0175\ \mathrm{USD}
\]

\[
C_{out} = \frac{800}{10^6} \times 14 = 0{,}0112\ \mathrm{USD}
\]

\[
C_{LLM/spotkanie} = 0{,}0175 + 0{,}0112 = 0{,}0287\ \mathrm{USD} \approx 0{,}115\ \mathrm{PLN}
\]

### Koszt LLM miesięcznie (pełne 400 spotkań)

\[
C_{LLM,400} = 400 \times 0{,}0287 = 11{,}48\ \mathrm{USD} \approx 45{,}9\ \mathrm{PLN}
\]

### Fireflies (seaty)

\[
C_{FF} = 25 \times 19 = 475\ \mathrm{USD} \approx 1\,900\ \mathrm{PLN}
\]

(Seat-based: koszt **nie spada** automatycznie przy mniejszej liczbie godzin - chyba że zmniejszycie liczbę seatów.)

---

## Wariant A - Fireflies (pełny coverage) + GPT-5.2 + VPS

Capture/transkrypcja przez Fireflies dla wolumenu jak w założeniach; własne summary (GPT-5.2); hosting VPS.

| Składnik | Obliczenie | PLN / mies. |
|----------|------------|-------------|
| Fireflies | \(25 \times 19\ \mathrm{USD} \times 4\) | **1 900** |
| LLM GPT-5.2 | \(11{,}48\ \mathrm{USD} \times 4\) | **≈ 46** |
| VPS | widełki | **80–150** |
| **Suma A** | | **≈ 2 026 – 2 096** |

**Wniosek:** dominuje **Fireflies (seaty)**. LLM przy tym cenniku jest rzędem wielkości tańszy niż capture.

---

## Wariant A’ - Fireflies seats + zawężony wolumen (~40% godzin) + GPT-5.2 + VPS

Produktowo typy spotkań mają **równy priorytet**; A’ to **wariant kosztowy** (mniej godzin capture/LLM), nie „najpierw tylko klienci”. Założenie modelowe: **40% godzin** = \(0{,}4 \times 300 = 120\) h →

\[
N = 120 / 0{,}75 = 160\ \mathrm{spotkań}
\]

\[
C_{LLM,160} = 160 \times 0{,}0287 = 4{,}592\ \mathrm{USD} \approx 18{,}4\ \mathrm{PLN}
\]

Seaty Fireflies: nadal **25 × 19 USD**, jeśli licencja jest per użytkownik hostujący (nie per godzina). Oszczędność LLM marginalna; główny zysk A’ to **mniej danych u vendora** i węższy zakres wdrożenia - nie duży spadek rachunku FF.

| Składnik | PLN / mies. |
|----------|-------------|
| Fireflies (25 seatów) | **1 900** |
| LLM (160 spotkań) | **≈ 18** |
| VPS | **80–150** |
| **Suma A’** | **≈ 1 998 – 2 068** |

Jeśli firma ograniczy seata do np. **15** hostów calli klienckich:

\[
15 \times 19 = 285\ \mathrm{USD} \approx 1\,140\ \mathrm{PLN}
\]

| Składnik | PLN / mies. |
|----------|-------------|
| Fireflies (15 seatów) | **1 140** |
| LLM (160) | **≈ 18** |
| VPS | **80–150** |
| **Suma A’ (15 seatów)** | **≈ 1 238 – 1 308** |

---

## Wariant B - Workspace-lean (bez Fireflies) + GPT-5.2 + VPS

Capture: natywne Meet / Notes by Gemini / transcript w Workspace (koszt **przyrostowy 0** w tym modelu - Workspace już opłacony; faktyczna cena Gemini w planie Workspace - do weryfikacji u firmy).

| Składnik | PLN / mies. |
|----------|-------------|
| Fireflies | **0** |
| LLM - pełne 400 spotkań | **≈ 46** |
| LLM - tylko 160 (opcjonalnie jak A’) | **≈ 18** |
| VPS | **80–150** |
| **Suma B (400)** | **≈ 126 – 196** |
| **Suma B (160)** | **≈ 98 – 168** |

**Trade-off:** znacznie niższy opex capture; większy koszt integracji Meet/Docs, scope’y Google, ewentualnie gorszy UX diarization niż FF - patrz architektura i bezpieczeństwo.

---

## Porównanie (orientacyjne)

| Wariant | Capture | LLM | VPS | **Razem PLN/mies.** |
|---------|---------|-----|-----|---------------------|
| **A** (25 seatów, 400) | 1 900 | ≈ 46 | 80–150 | **≈ 2 0xx** |
| **A’** (25 seatów, 160) | 1 900 | ≈ 18 | 80–150 | **≈ 2 0xx** (podobnie) |
| **A’** (15 seatów, 160) | 1 140 | ≈ 18 | 80–150 | **≈ 1 2xx–1 3xx** |
| **B** (400) | 0* | ≈ 46 | 80–150 | **≈ 1xx–2xx** |
| **B** (160) | 0* | ≈ 18 | 80–150 | **≈ 1xx** |

\*przyrostowo względem istniejącego Google Workspace.

## Rekomendacja decyzyjna (skrót)

- Na **oddalenie ryzyka kosztu**: wariant **B** lub **A’ z mniejszą liczbą seatów**.
- Na **szybki capture + znany UX notetakera**: wariant **A**, ze świadomością że rachunek ≈ seatów FF.
- LLM (GPT-5.2 przy podanym cenniku) **nie jest** głównym kosztem przy 300 h/mies. w tym modelu tokenów.

**Uwaga Q&A (UC2):** koszt asystenta = f(N pytań/mies. × tokeny kontekstu). **Nie jest wliczony** w sumy A/A’/B powyżej - doliczyć osobno przy włączeniu etapu 2. Ten sam provider / klucz API co UC1 (bez drugiej integracji).

Praca własna zespołu (dev) i ewentualny DPA/legal - **poza** tą tabelą opex narzędzi.

## Mapowanie na inne dokumenty

- Skala i równy priorytet typów spotkań: `dokumentacja_koncepcyjna.md`
- Brak HubSpot w stacku integracji (tylko wzmianka decyzyjna)
- LLM use case’y: `llm_i_asystent.md`
- Vendorzy / RODO: `bezpieczenstwo_i_rodo.md`
- Hosting: `deployment.md`
- Etapy wdrożenia vs warianty: `plan_wdrozenia_etapy.md`
