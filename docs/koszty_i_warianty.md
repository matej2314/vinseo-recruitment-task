---
wersja: 7
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-11-01
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
| Model LLM - opcjonalny (po testach jakości) | **Claude Sonnet 5.5** (`claude-sonnet-5-5`) | ten sam port `LlmClient`; podmiana konfiguracją |
| Cennik Sonnet 5.5 - input | **2,00 USD / 1M tokenów** | [Models overview](https://platform.claude.com/docs/en/models/overview) |
| Cennik Sonnet 5.5 - output | **10,00 USD / 1M tokenów** | j.w. |
| Fireflies | **19 USD / seat / mies.** | ustalone |
| Tokeny na spotkanie 45 min (założenie) | input **10 000**, output **800** | rząd wielkości transcript+prompt / summary+actions |

**Uwaga tokenów:** 10k/800 to założenie inżynierskie (PL + diarization + prompt). Po pierwszym miesiącu prod warto podmienić średnią z telemetryki.

**Uwaga Sonnet (long context / cache):** w sumach poniżej liczymy **cenę bazową** z overview (2 / 10 USD za 1M in/out). Cache, batch i ewentualny long-context mogą zmienić rachunek - weryfikacja przy UC2.

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

### Koszt LLM na jedno spotkanie - Claude Sonnet 5.5

\[
C_{in} = \frac{10\,000}{10^6} \times 2{,}00 = 0{,}02\ \mathrm{USD}
\]

\[
C_{out} = \frac{800}{10^6} \times 10{,}00 = 0{,}008\ \mathrm{USD}
\]

\[
C_{S/spotkanie} = 0{,}02 + 0{,}008 = 0{,}028\ \mathrm{USD} \approx 0{,}11\ \mathrm{PLN}
\]

### Koszt LLM miesięcznie

| Model | 400 spotkań | 160 spotkań (~40% h) |
|-------|-------------|----------------------|
| Gemini 3.5 Flash-Lite | \(400 \times 0{,}005 = 2{,}00\) USD ≈ **8 PLN** | \(160 \times 0{,}005 = 0{,}80\) USD ≈ **3 PLN** |
| Claude Sonnet 5.5 | \(400 \times 0{,}028 = 11{,}20\) USD ≈ **45 PLN** | \(160 \times 0{,}028 = 4{,}48\) USD ≈ **18 PLN** |

Przy tym wolumenie Sonnet 5.5 jest **droższy** na samym LLM niż Gemini Flash-Lite (delta ok. **+37 PLN**/mies. przy 400 spotkaniach). Opcja po testach to decyzja **jakości** (PL, structured JSON / Zod), nie oszczędność tokenów.

### Fireflies (seaty)

\[
C_{FF} = 25 \times 19 = 475\ \mathrm{USD} \approx 1\,900\ \mathrm{PLN}
\]

(Seat-based: koszt **nie spada** automatycznie przy mniejszej liczbie godzin - chyba że zmniejszycie liczbę seatów.)

---

## Wariant 1 - start / koszt: Gemini 3.5 Flash-Lite

Domyślny model pod UC1 (i później UC2). **Metadane:** Google Calendar (zawsze; przyrostowo w ramach Workspace). **Treść:** hybryda per zgoda — Fireflies przy zgodzie na nagrywanie; **Notes by Gemini** jako fallback przy odmowie (nie wyłącznie „FF XOR Workspace-lean” jako globalny wybór XOR).

### 1A - Fireflies (pełny coverage seatów) + Gemini + VPS

Model kosztowy gdy większość calli ma zgodę / FF jest głównym capture. Calendar nadal pod metadane.

| Składnik | Obliczenie | PLN / mies. |
|----------|------------|-------------|
| Fireflies | \(25 \times 19\ \mathrm{USD} \times 4\) | **1 900** |
| LLM Gemini (400) | \(2{,}00\ \mathrm{USD} \times 4\) | **≈ 8** |
| VPS | widełki | **80–150** |
| **Suma 1A** | | **≈ 1 988 – 2 058** |

### 1B - Workspace-lean (Calendar + Notes by Gemini; bez FF) + Gemini + VPS

Capture treści: Notes by Gemini / Meet w Workspace (koszt **przyrostowy 0** w tym modelu - Workspace już opłacony; faktyczna cena Gemini w planie Workspace - do weryfikacji u firmy). Metadane: Calendar. Typowy scenariusz: brak zgód na nagrywanie / świadomy lean.

| Składnik | PLN / mies. |
|----------|-------------|
| Fireflies | **0** |
| LLM Gemini (400) | **≈ 8** |
| VPS | **80–150** |
| **Suma 1B** | **≈ 88 – 158** |

**Hybryda per zgoda (operacyjnie):** część spotkań na FF (1A-like opex seatów), część na Gemini Notes (przyrostowo jak 1B) — ten sam stack portów; rachunek FF zależy od liczby seatów, nie od „XOR architektury”.

**Wniosek W1:** dominuje **Fireflies (seaty)** albo jego brak. LLM Gemini przy tym cenniku jest rzędem wielkości tańszy niż capture i VPS.

---

## Wariant 2 - opcjonalnie po testach: Claude Sonnet 5.5

Ten sam port `LlmClient` / jedna integracja; model ustawiany konfiguracją po A/B jakości (PL + walidacja Zod). Nie wprowadzamy drugiej ścieżki „tylko do asystenta”.

### 2A - Fireflies + Sonnet 5.5 + VPS

| Składnik | PLN / mies. |
|----------|-------------|
| Fireflies (25 seatów) | **1 900** |
| LLM Sonnet (400) | **≈ 45** |
| VPS | **80–150** |
| **Suma 2A** | **≈ 2 025 – 2 095** |

### 2B - Workspace-lean + Sonnet 5.5 + VPS

| Składnik | PLN / mies. |
|----------|-------------|
| Fireflies | **0** |
| LLM Sonnet (400) | **≈ 45** |
| VPS | **80–150** |
| **Suma 2B** | **≈ 125 – 195** |

Delta LLM Gemini → Sonnet przy 400 spotkaniach: **≈ +37 PLN/mies.** Decyzja o przejściu = jakość / DPA / preferencja vendora; uplift tokenów jest mały względem seatów FF.

---

## Zawężenie zakresu (A’) - opcjonalny skrót kosztów

Produktowo typy spotkań mają **równy priorytet**; A’ to **wariant kosztowy** (mniej godzin capture/LLM), nie „najpierw tylko klienci”. Założenie: **40% godzin** = \(0{,}4 \times 300 = 120\) h → **160** spotkań.

| Składnik | Gemini (160) | Sonnet (160) |
|----------|--------------|--------------|
| Fireflies 25 seatów | 1 900 | 1 900 |
| LLM | ≈ 3 | ≈ 18 |
| VPS | 80–150 | 80–150 |
| **Suma (25 seatów)** | **≈ 1 983 – 2 053** | **≈ 1 998 – 2 068** |

Jeśli firma ograniczy seata do np. **15** hostów:

\[
15 \times 19 = 285\ \mathrm{USD} \approx 1\,140\ \mathrm{PLN}
\]

| Składnik | PLN / mies. (Gemini 160) | PLN / mies. (Sonnet 160) |
|----------|--------------------------|--------------------------|
| Fireflies (15 seatów) | **1 140** | **1 140** |
| LLM | **≈ 3** | **≈ 18** |
| VPS | **80–150** | **80–150** |
| **Suma** | **≈ 1 223 – 1 293** | **≈ 1 238 – 1 308** |

Oszczędność LLM przy A’ jest marginalna względem FF; główny zysk to **mniej danych u vendora** i ewentualnie **mniej seatów FF**.

---

## Porównanie (orientacyjne, 400 spotkań)

| Wariant | Capture | LLM | VPS | **Razem PLN/mies.** |
|---------|---------|-----|-----|---------------------|
| **1A** Gemini + FF 25 | 1 900 | ≈ 8 | 80–150 | **≈ 1 988 – 2 058** |
| **1B** Gemini + Workspace | 0* | ≈ 8 | 80–150 | **≈ 88 – 158** |
| **2A** Sonnet + FF 25 | 1 900 | ≈ 45 | 80–150 | **≈ 2 025 – 2 095** |
| **2B** Sonnet + Workspace | 0* | ≈ 45 | 80–150 | **≈ 125 – 195** |
| A’ 15 seatów, 160, Gemini | 1 140 | ≈ 3 | 80–150 | **≈ 1 2xx** |

\*przyrostowo względem istniejącego Google Workspace.

## Rekomendacja decyzyjna (skrót)

- **Start:** wariant **1** (Gemini 3.5 Flash-Lite) + capture **1B**, **1A / A’ z mniejszą liczbą seatów**, albo **hybryda per zgoda** (FF gdy zgoda; Gemini Notes gdy odmowa) — zależnie od UX diarization vs opex i procesu zgód.
- **Po pierwszych testach jakości UC1:** ewentualnie przełączyć na **Sonnet 5.5** (wariant 2) bez zmiany architektury - ten sam adapter LLM.
- LLM przy obu cennikach **nie jest** głównym kosztem przy 300 h/mies. w tym modelu tokenów (nawet Sonnet ≈ 45 PLN); rachunek przesuwa **Fireflies (seaty)** lub jego brak.
- **Obecna wersja kodu:** normy w docs; opex vendor ≈ 0 (mock + zaślepka portów, major 3.7). **Etap 1+:** pierwsze wejście działającej logiki Calendar + FF / Gemini Notes.

**Uwaga Q&A (UC2):** koszt asystenta = f(N pytań/mies. × tokeny kontekstu; u Sonnet także cache / ewentualny long-context). **Nie jest wliczony** w sumy powyżej - doliczyć osobno przy włączeniu etapu 2. Ten sam provider / klucz API co UC1 (bez drugiej integracji).

Praca własna zespołu (dev) i ewentualny DPA/legal - **poza** tą tabelą opex narzędzi.

## Mapowanie na inne dokumenty

- Skala i równy priorytet typów spotkań: `dokumentacja_koncepcyjna.md`
- Brak HubSpot w stacku integracji (tylko wzmianka decyzyjna)
- LLM use case’y: `llm_i_asystent.md`
- Vendorzy / RODO: `bezpieczenstwo_i_rodo.md`
- Hosting: `deployment.md`
- Etapy wdrożenia vs warianty: `plan_wdrozenia_etapy.md`
