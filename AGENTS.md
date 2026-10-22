# Working on the TokyoDev survey

This repo holds TokyoDev's survey definitions, locales and entities. The apps that
use them (API, survey form, results site) live in the shared Devographics monorepo.
Work here is focused on the TokyoDev edition of the survey; the other Devographics
surveys (State of JS/CSS/HTML) can be ignored unless a task says otherwise.

## Folder layout

Check these out side by side in one parent folder (e.g. `~/devographics`):

| Folder                    | Repo                                                                  |
| ------------------------- | --------------------------------------------------------------------- |
| `monorepo/`               | [Devographics/Monorepo](https://github.com/Devographics/Monorepo) — the apps, shared by every survey |
| `entities/`               | [Devographics/entities](https://github.com/Devographics/entities)     |
| `locales/locale-en-US/`, `locales/locale-ja-JP/` | Devographics locale repos                      |
| `tokyodev-devographics/`  | this repo                                                             |

TokyoDev-specific content lives here:

- `surveys/tokyodev/` — survey config and one folder per edition (`td2026/`, …) with `questions.yml` and the results outline
- `locales/`, `entities/` — TokyoDev strings and entities, loaded on top of the shared ones

## Validating changes

Pushing to `main` deploys: the API reloads the surveys from GitHub, and any YAML
file that fails to parse is silently dropped. Before pushing, run:

```sh
npm install   # once
npm run validate:yaml
```

The same check runs in GitHub Actions (`.github/workflows/validate.yml`) on every
pull request and push to `main`.

### Checking the results site

`npm run test:results` clicks through every section and tab of a running results
site and lists missing translations, strings shown in English on Japanese pages,
blocks with errors or no data, leftover `TODO` text, and JS errors:

```sh
npx playwright install chromium   # once
npm run test:results              # checks http://localhost:9001, using the API at localhost:5020
RESULTS_URL=https://… API_URL=https://api.surveys.tokyodev.com/graphql LOCALES=en-US npm run test:results
```

## Changing the monorepo

Anything in `monorepo/` affects every Devographics survey. Prefer changes scoped to
TokyoDev, and say so when a change will reach the other surveys:

- Styles: `.config-tokyodev` in `surveyform/src/stylesheets/_survey_overrides.scss`, `.survey-tokyodev` in `results/src/stylesheets/_overrides.scss`
- Code: `currentSurvey.id === 'tokyodev'`

## Running locally

Requires Node 24 and pnpm (see `monorepo/package.json` for the version). Install once
from the monorepo root:

```sh
cd monorepo
pnpm install
```

Each app reads a gitignored `.env.tokyodev.local` file. Start from the app's
`.env.example`; ask a teammate for the secret values (Mongo, Redis, etc.). The
`*_PATH` variables are absolute paths, so point them at your own checkout.

### 1. API — http://localhost:5020/graphql

Loads the surveys, locales and entities from your local checkouts, so start it first.

```sh
cd monorepo/api
pnpm tokyodev
```

Key settings in `api/.env.tokyodev.local`:

```sh
CONFIG=tokyodev
PORT=5020
SURVEYS_PATH=<parent>/tokyodev-devographics/surveys
LOCALES_PATH=<parent>/locales,<parent>/tokyodev-devographics/locales
ENTITIES_PATH=<parent>/entities,<parent>/tokyodev-devographics/entities
LOCALE_IDS=en-US,ja-JP
```

### 2. Results site — http://localhost:9001

```sh
cd monorepo/results
pnpm tdev        # or `pnpm tdev:clean` to clear Gatsby's cache first
```

Key settings in `results/.env.tokyodev.local`:

```sh
CONFIG=tokyodev
SURVEYID=tokyodev
EDITIONID=td2026                                  # edition to build
GATSBY_API_URL=http://localhost:5020/graphql      # or https://api.surveys.tokyodev.com/graphql to skip running the API
PORT=9001
FAST_BUILD=true
LOCALE_IDS=en-US,ja-JP
```

### 3. Survey form — http://localhost:3000

```sh
cd monorepo/surveyform
pnpm tokyodev
```

This reads `surveyform/.env.tokyodev.local` (start from `surveyform/.env.example`).
Set `API_URL` to `http://localhost:5020/graphql` to use the local API.
