---
wersja: 5
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-30
---

# SPEC - Auth i ACL

Norma implementacji uwierzytelniania pracowników oraz kontroli dostępu do spotkań. Kontekst produktowy: `docs/dokumentacja_koncepcyjna.md`, `docs/architektura.md` (sesja JWT+refresh). Kontrakty HTTP / SSE: `SPEC-KOMUNIKACJA` (refresh, paginacja listy). Warstwy: `SPEC-ARCHITEKTURA`. Persistencja tokenów: `SPEC-DANE`.

## Cel / zakres

- Rejestracja / logowanie / wylogowanie / `me` / odświeżanie tokenów.
- Model sesji przeglądarki: access JWT + refresh w PostgreSQL, cookie HttpOnly.
- Reguły ACL odczytu spotkań i artefaktów; egzekucja wyłącznie w `apps/api`.
- Paginacja listy spotkań po stronie backendu.

**Poza tą wersją:** reset hasła, 2FA, SSO / OAuth Google, konta klientów zewnętrznych, ACL przez `ProjectMembership` (zespół klienta), auth webhooka Fireflies, HTTP erase admin.

## Powiązanie ze stylem z docs

| Ustalenie | Wiązanie |
|-----------|----------|
| Styl „Meetings + access” | Reguły ACL w module / serwisie `access`; controllery cienkie |
| ACL tylko w zaufanym `api` | BFF i React nie są źródłem prawdy uprawnień |
| Cookie HttpOnly | Sekrety sesji nie w `localStorage` / `sessionStorage` |
| `SPEC-ARCHITEKTURA` | Use case / serwis aplikacji; bez Prisma w controllerze |

**Wyjątek względem stylu globalnego:** brak.

## Wymagania - auth

AU-1. Konta wyłącznie dla **pracowników**. Rejestracja v1: **otwarta** (endpoint dostępny bez zaproszenia).

AU-2. Identyfikator logowania: **e-mail** - **unikalny** w bazie (konflikt przy duplikacie → błąd klienta, np. 409).

AU-3. Hasło przy rejestracji / zmianie (gdy dotyczy): minimum **12** znaków, co najmniej **1** wielka litera, **1** cyfra, **1** znak specjalny. Egzekucja w walidacji DTO / Zod aplikacji przed zapisem.

AU-4. Przed zapisem hasła: **bcrypt**. Przy logowaniu: porównanie z hashem - nigdy plaintext w DB ani w logach.

AU-5. Model sesji v1:

| Element | Norma |
|---------|--------|
| Access | JWT (`@nestjs/jwt`), TTL **15 minut**, cookie **HttpOnly** |
| Refresh | Opaque token; w PostgreSQL (Prisma) przechowywany **hash**; cookie **HttpOnly**; rotacja przy odświeżeniu |
| Atrybuty cookie | `Secure` / `SameSite` według środowiska |
| Transport UI | BFF przekazuje cookie do `api`; UI **nie** trzyma access/refresh w storage przeglądarki |
| Guard | Chronione trasy `api` wymagają ważnego access (ekstrakcja z cookie) |

AU-6. Trasy auth (semantyka; BFF z prefiksem `/api` jak w `SPEC-KOMUNIKACJA`):

| Metoda | Ścieżka | Auth | Zachowanie |
|--------|---------|------|------------|
| `POST` | `/auth/register` | nie | tworzy użytkownika; **od razu ustawia cookie** access + refresh (jak login) |
| `POST` | `/auth/login` | nie | weryfikacja hasła; ustawia cookie access + refresh |
| `POST` | `/auth/logout` | tak | czyści cookie; **unieważnia rodzinę** refresh użytkownika (lub bieżącą sesję refresh) |
| `GET` | `/auth/me` | tak | bieżący użytkownik |
| `POST` | `/auth/refresh` | refresh cookie | rotacja refresh; nowy access (+ nowy refresh); nieznany / wygasły / **reuse** zużytego refresh → **401** i revoke rodziny |

AU-7. Tabela refresh (Prisma, szczegóły pól → `SPEC-DANE` w zakresie potrzebnym): m.in. powiązanie z użytkownikiem, hash tokena, rodzina (`familyId`), wygaśnięcie, znacznik użycia / revoke. **Reuse** już zużytego refresh → unieważnienie rodziny + 401.

AU-8. Ciało odpowiedzi auth **nie** musi zwracać sekretów tokenów w JSON, jeśli są wyłącznie w cookie Set-Cookie.

## Wymagania - ACL

AC-1. Odczyt spotkania i artefaktów (lista elementów — w tym projekcja `summary` / `failureReason` na liście; detail; transcript / pełniejsze artefakty w detail) tylko gdy zachodzi **co najmniej jedno** (**ACL v1**):

1. użytkownik jest **organizatorem** spotkania (`Meeting.organizerId`), albo  
2. użytkownik jest **uczestnikiem** wewnętrznym (`MeetingParticipant`), albo  
3. użytkownik ma rolę **admin** - widzi **wszystkie** spotkania (w tym `confidential`).

Zmiana względem wcześniejszej reguły z membership projektu/klienta: **`ProjectMembership` nie przyznaje odczytu w tej wersji** (kolejna faza produktowa - docs). `clientId` / `clientLinkStatus` to metadane, nie ACL.
Doprecyzowanie względem wcześniejszego brzmienia „summary … w detail”: w v1 `summary` / `failureReason` są też w elemencie listy (`SPEC-KOMUNIKACJA` K-2a) — nadal wyłącznie po ACL listy (AC-4), bez transcriptu na liście.

AC-2. Egzekucja ACL: wyłącznie `apps/api` (moduł / serwis `access`). Jedna centralna decyzja „czy user U może odczytać meeting M” używana przez listę, detail, SSE oraz - gdy powstaną - wyszukiwanie i asystent (UC2).

AC-3. `GET /meetings/:id`: spotkanie nie istnieje **lub** brak ACL → odpowiedź **404** (identyczny kształt na zewnątrz - bez wycieku istnienia).

AC-4. `GET /meetings`: zwraca **wyłącznie** spotkania dozwolone regułą AC-1 (nigdy pełny zbiór z filtrowaniem tylko na froncie).

AC-5. Paginacja listy - **backend**:

| Parametr | Norma |
|----------|--------|
| `limit` | Dozwolone wartości: **10, 25, 50, 100** (select na froncie; inne wartości → **400**) |
| `page` | Numer strony **1-based** (query); **zakaz** paginacji cursor w v1 |

Odpowiedź listy zawiera metadane paginacji (np. `page`, `limit`, `total` / `hasMore` - spójnie w contracts).

## Norma: wzorce

### Wymagane

- Moduł Nest `auth` (register / login / logout / me / refresh) oraz osobny moduł `access` (policy ACL).
- Guard na chronionych trasach (access JWT z cookie).
- bcrypt przy zapisie i weryfikacji hasła.
- Cookie HttpOnly jako kanał access + refresh dla przeglądarki.
- Centralny serwis / funkcja ACL współdzielona przez use case’y odczytu spotkań.
- Persistencja refresh w PostgreSQL przez Prisma (hash, rotacja, revoke).

### Nie wolno

- OAuth / SSO Google w tej wersji.
- Kont klientów zewnętrznych.
- Egzekwowania ACL w BFF lub React.
- Przechowywania access / refresh w `localStorage` lub `sessionStorage`.
- Domyślnego polegania na `Authorization: Bearer` z kodu UI (cookie + BFF).
- Zwracania plaintext hasła lub refresh tokena w logach / `audit_log` / pino.
- Filtrowania ACL wyłącznie po stronie klienta.
- Przyznawania ACL na podstawie `ProjectMembership`, grup Google Workspace lub samego `clientId` w tej wersji.

## Zatwierdzony stack (obszar)

| Element | Wybór |
|---------|--------|
| Hash haseł | bcrypt |
| Access token | `@nestjs/jwt` (JWT) |
| Refresh store | PostgreSQL + Prisma |
| HTTP guards | Nest guard / opcjonalnie Passport JWT z extractorem cookie |
| Walidacja wejścia auth | class-validator (DTO) - spójnie z `SPEC-KOMUNIKACJA` |

## Kryteria akceptacji

- [ ] Rejestracja z nieunikalnym e-mailem kończy się błędem konfliktu / walidacji; słabe hasło (względem AU-3) → 400.
- [ ] Hasła w DB wyłącznie jako bcrypt hash.
- [ ] Po loginie UI działa na cookie HttpOnly; brak sekretów sesji w Web Storage.
- [ ] Access wygasa po ~15 min; `POST /auth/refresh` wydaje nową parę; reuse zużytego refresh → 401 + revoke rodziny.
- [ ] Logout czyści cookie i unieważnia refresh.
- [ ] Admin widzi wszystkie spotkania; zwykły user tylko organizatorstwo / uczestnictwo (nie membership).
- [ ] Detail bez ACL → 404; lista nigdy nie zawiera niedozwolonych id.
- [ ] `limit` spoza {10,25,50,100} → 400; lista paginuje po `page` + `limit` po stronie API.
- [ ] `POST /auth/register` ustawia cookie sesji; UI może przejść na dashboard bez osobnego loginu.
- [ ] Testy jednostkowe / integracyjne pokrywają tablicę przypadków ACL v1 (wymóg jakości → `SPEC-TESTY`).

## Poza tą wersją

- Reset / forgot password, weryfikacja e-mail, 2FA.
- SSO, OAuth Google Workspace.
- Role poza pracownikiem + admin (np. zewnętrzny guest).
- ACL przez membership zespołu klienta / ekspansję grup Calendar.
- Implementacja retrieval UC2 (reguła ACL ta sama, gdy powstanie).
- Produkcyjny auth webhooków vendora.
- Endpoint / UI erase treści (norma produktowa w docs).
