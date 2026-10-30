---
wersja: 5
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-30
---

# Koszty i warianty

Orientacyjne koszty **miesięczne** Firmowego asystenta spotkań (PLN). To **model decyzyjny**, nie oferta handlowa. Ceny vendorów i kurs walut należy podmienić po umowie / fakturze. Spełnia pkt 5 briefu: co najmniej **dwa warianty** z obliczeniami.

## Założenia wspólne

| Parametr | Wartość | Skąd |
|----------|---------|------|
| Wolumen spotkań | **300 h / mies.** | skala produktu / brief |
| Średni czas spotkania | **45 min** (0,75 h) | skala produktu / brief |
| Liczba spotkań | \(300 / 0{,}75 = \) **400** / mies. | wyliczenie |
| Osoby regularnie na spotkaniach | **25** (z ~40 w firmie) | brief |
| Kurs roboczy | **1 USD = 4,00 PLN** | założenie docs (do aktualizacji) |
| VPS (Compose: web+api+worker+Postgres) | **80–150 PLN** / mies. | widełki |
| Model LLM - podstawowy | **Gemini 3.5 Flash-Lite** (`gemini-3.5-flash-lite`) | decyzja kosztów; UC1 + później UC2 |
| Cennik Gemini - input | **0,30 USD / 1M tokenów** | [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) (Standard) |
| Cennik Gemini - output | **2,50 USD / 1M tokenów** | j.w. (output inkl. thinking) |
| Model LLM - opcjonalny (po testach jakości) | **Claude Haiku 5.5** (`claude-haiku-5-5`) | ten sam port `LlmClient`; podmiana konfiguracją |
| Cennik Haiku 5.5 - input (prompt ≤100k) | **0,10 USD / 1M tokenów** | [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| Cennik Haiku 5.5 - output (prompt ≤100k) | **0,50 USD / 1M tokenów** | j.w. |
| Fireflies | **19 USD / seat / mies.** | ustalone |
| Tokeny na spotkanie 45 min (założenie) | input **10 000**, output **800** | rząd wielkości transcript+prompt / summary+actions |

**Uwaga tokenów:** 10k/800 to założenie inżynierskie (PL + diarization + prompt). Po pierwszym miesiącu prod warto podmienić średnią z telemetryki.

**Uwaga Haiku >100k:** przy UC2 z długim kontekstem cennik Haiku 5.5 skacze do **0,50 / 2,50 USD** za 1M (in/out). W sumach poniżej liczymy tier ≤100k (UC1).

### Koszt LLM na jedno spotkanie - Gemini 3.5 Flash-Lite

\[
C_{in} = \frac{10\,000}{10^6} \times 0{,}30 = 0{,}003\ \mathrm{USD}
\]

\[
C_{out} = \frac{800}{10^6} \times 2{,}50 = 0{,}002\ \mathrm{USD}
\]

\[
C_{G/spotkanie} = 0{,}003 + 0{,}002 = 0{,}005\ \mathrm{USD} \approx 0{,}02\ \mathrm{PLN}
\]

### Koszt LLM na jedno spotkanie - Claude Haiku 5.5 (≤100k)

\[
C_{in} = \frac{10\,000}{10^6} \times 0{,}10 = 0{,}001\ \mathrm{USD}
\]

\[
C_{out} = \frac{800}{10^6} \times 0{,}50 = 0{,}0004\ \mathrm{USD}
\]

\[
C_{H/spotkanie} = 0{,}001 + 0{,}0004 = 0{,}0014\ \mathrm{USD} \approx 0{,}006\ \mathrm{PLN}
\]

### Koszt LLM miesięcznie

| Model | 400 spotkań | 160 spotkań (~40% h) |
|-------|-------------|----------------------|
| Gemini 3.5 Flash-Lite | \(400 \times 0{,}005 = 2{,}00\) USD ≈ **8 PLN** | \(160 \times 0{,}005 = 0{,}80\) USD ≈ **3 PLN** |
| Claude Haiku 5.5 | \(400 \times 0{,}0014 = 0{,}56\) USD ≈ **2 PLN** | \(160 \times 0{,}0014 = 0{,}224\) USD ≈ **1 PLN** |

Przy tym wolumenie Haiku 5.5 jest **tańszy** na samym LLM niż Gemini Flash-Lite. Opcja po testach to decyzja **jakości** (PL, structured JSON / Zod), nie droższy uplift.

### Fireflies (seaty)

\[
C_{FF} = 25 \times 19 = 475\ \mathrm{USD} \approx 1\,900\ \mathrm{PLN}
\]

(Seat-based: koszt **nie spada** automatycznie przy mniejszej liczbie godzin - chyba że zmniejszycie liczbę seatów.)

---

## Wariant 1 - start / koszt: Gemini 3.5 Flash-Lite

Domyślny model pod UC1 (i później UC2). Capture: Fireflies **albo** Workspace-lean.

### 1A - Fireflies (pełny coverage) + Gemini + VPS

| Składnik | Obliczenie | PLN / mies. |
|----------|------------|-------------|
| Fireflies | \(25 \times 19\ \mathrm{USD} \times 4\) | **1 900** |
| LLM Gemini (400) | \(2{,}00\ \mathrm{USD} \times 4\) | **≈ 8** |
| VPS | widełki | **80–150** |
| **Suma 1A** | | **≈ 1 988 – 2 058** |

### 1B - Workspace-lean (bez Fireflies) + Gemini + VPS

Capture: natywne Meet / Notes by Gemini / transcript w Workspace (koszt **przyrostowy 0** w tym modelu - Workspace już opłacony; faktyczna cena Gemini w planie Workspace - do weryfikacji u firmy).

| Składnik | PLN / mies. |
|----------|-------------|
| Fireflies | **0** |
| LLM Gemini (400) | **≈ 8** |
| VPS | **80–150** |
| **Suma 1B** | **≈ 88 – 158** |

**Wniosek W1:** dominuje **Fireflies (seaty)** albo jego brak. LLM Gemini przy tym cenniku jest rzędem wielkości tańszy niż capture i VPS.

---

## Wariant 2 - opcjonalnie po testach: Claude Haiku 5.5

Ten sam port `LlmClient` / jedna integracja; model ustawiany konfiguracją po A/B jakości (PL + walidacja Zod). Nie wprowadzamy drugiej ścieżki „tylko do asystenta”.

### 2A - Fireflies + Haiku 5.5 + VPS

| Składnik | PLN / mies. |
|----------|-------------|
| Fireflies (25 seatów) | **1 900** |
| LLM Haiku (400) | **≈ 2** |
| VPS | **80–150** |
| **Suma 2A** | **≈ 1 982 – 2 052** |

### 2B - Workspace-lean + Haiku 5.5 + VPS

| Składnik | PLN / mies. |
|----------|-------------|
| Fireflies | **0** |
| LLM Haiku (400) | **≈ 2** |
| VPS | **80–150** |
| **Suma 2B** | **≈ 82 – 152** |

Delta LLM Gemini → Haiku przy 400 spotkaniach: **≈ −6 PLN/mies.** (Haiku tańszy). Decyzja o przejściu = jakość / DPA / preferencja vendora, nie rachunek tokenów.

---

## Zawężenie zakresu (A’) - opcjonalny skrót kosztów

Produktowo typy spotkań mają **równy priorytet**; A’ to **wariant kosztowy** (mniej godzin capture/LLM), nie „najpierw tylko klienci”. Założenie: **40% godzin** = \(0{,}4 \times 300 = 120\) h → **160** spotkań.

| Składnik | Gemini (160) | Haiku (160) |
|----------|--------------|-------------|
| Fireflies 25 seatów | 1 900 | 1 900 |
| LLM | ≈ 3 | ≈ 1 |
| VPS | 80–150 | 80–150 |
| **Suma (25 seatów)** | **≈ 1 983 – 2 053** | **≈ 1 981 – 2 051** |

Jeśli firma ograniczy seata do np. **15** hostów:

\[
15 \times 19 = 285\ \mathrm{USD} \approx 1\,140\ \mathrm{PLN}
\]

| Składnik | PLN / mies. (Gemini 160) | PLN / mies. (Haiku 160) |
|----------|--------------------------|-------------------------|
| Fireflies (15 seatów) | **1 140** | **1 140** |
| LLM | **≈ 3** | **≈ 1** |
| VPS | **80–150** | **80–150** |
| **Suma** | **≈ 1 223 – 1 293** | **≈ 1 221 – 1 291** |

Oszczędność LLM przy A’ jest marginalna; główny zysk to **mniej danych u vendora** i ewentualnie **mniej seatów FF**.

---

## Porównanie (orientacyjne, 400 spotkań)

| Wariant | Capture | LLM | VPS | **Razem PLN/mies.** |
|---------|---------|-----|-----|---------------------|
| **1A** Gemini + FF 25 | 1 900 | ≈ 8 | 80–150 | **≈ 1 988 – 2 058** |
| **1B** Gemini + Workspace | 0* | ≈ 8 | 80–150 | **≈ 88 – 158** |
| **2A** Haiku + FF 25 | 1 900 | ≈ 2 | 80–150 | **≈ 1 982 – 2 052** |
| **2B** Haiku + Workspace | 0* | ≈ 2 | 80–150 | **≈ 82 – 152** |
| A’ 15 seatów, 160, Gemini | 1 140 | ≈ 3 | 80–150 | **≈ 1 2xx** |

\*przyrostowo względem istniejącego Google Workspace.

## Rekomendacja decyzyjna (skrót)

- **Start:** wariant **1** (Gemini 3.5 Flash-Lite) + capture **1B** albo **1A / A’ z mniejszą liczbą seatów**, zależnie od UX diarization vs opex.
- **Po pierwszych testach jakości UC1:** ewentualnie przełączyć na **Haiku 5.5** (wariant 2) bez zmiany architektury - ten sam adapter.
- LLM przy obu cennikach **nie jest** głównym kosztem przy 300 h/mies. w tym modelu tokenów; rachunek przesuwa **Fireflies (seaty)** lub jego brak.

**Uwaga Q&A (UC2):** koszt asystenta = f(N pytań/mies. × tokeny kontekstu; u Haiku także próg 100k). **Nie jest wliczony** w sumy powyżej - doliczyć osobno przy włączeniu etapu 2. Ten sam provider / klucz API co UC1 (bez drugiej integracji).

Praca własna zespołu (dev) i ewentualny DPA/legal - **poza** tą tabelą opex narzędzi.

## Mapowanie na inne dokumenty

- Skala i równy priorytet typów spotkań: `dokumentacja_koncepcyjna.md`
- Brak HubSpot w stacku integracji (tylko wzmianka decyzyjna)
- LLM use case’y: `llm_i_asystent.md`
- Vendorzy / RODO: `bezpieczenstwo_i_rodo.md`
- Hosting: `deployment.md`
- Etapy wdrożenia vs warianty: `plan_wdrozenia_etapy.md`
