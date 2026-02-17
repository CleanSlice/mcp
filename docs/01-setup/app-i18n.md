---
id: setup-app-i18n
title: i18n Setup (App)
version: 1.0.0
last_updated: 2025-12-20

pattern: setup
complexity: fundamental
framework: nuxt
category: setup
applies_to: [frontend, app]

tags:
  - i18n
  - internationalization
  - localization
  - nuxt-i18n
  - translations
  - multilingual

keywords:
  - i18n setup
  - nuxt i18n
  - translations
  - locale files
  - language switching
  - date formatting
  - slice locales

deprecated: false
experimental: false
production_ready: true
---

# i18n Setup (App)

> **Each slice manages its own translations** via a `locales/` folder with JSON files. The `setup/i18n` slice configures the base i18n module, and individual slices extend it with their own translations that get merged automatically by Nuxt layers.

---

## Overview

i18n in CleanSlice uses **distributed locale files** per slice:

```
┌──────────────────────────────────────────────────────────────┐
│  setup/i18n SLICE                                             │
│                                                               │
│  - Configures @nuxtjs/i18n module                             │
│  - Sets default locale, strategy, browser detection           │
│  - Defines datetime formats                                   │
│  - Does NOT contain translations                              │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                               │
                               │  Nuxt layers merge
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  FEATURE SLICES                                               │
│                                                               │
│  user/auth/locales/en.json    ← Auth translations             │
│  user/team/locales/en.json    ← Team translations             │
│  dashboard/locales/en.json    ← Dashboard translations        │
│  common/locales/en.json       ← Shared translations           │
│                                                               │
│  Each slice has its own nuxt.config.ts with i18n config       │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                               │
                               │  Auto-merged at build
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  RUNTIME                                                      │
│                                                               │
│  $t('welcome')                 ← Access any translation       │
│  $d(date, 'short')             ← Format dates                 │
│  useI18n()                     ← Composable API               │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Critical Rules

### 1. Each Slice Has Its Own Locales Folder

```
slices/
├── user/
│   ├── auth/
│   │   ├── locales/
│   │   │   ├── en.json       ← Auth-specific translations
│   │   │   └── fr.json
│   │   └── nuxt.config.ts    ← i18n config pointing to locales
│   └── team/
│       ├── locales/
│       │   └── en.json       ← Team-specific translations
│       └── nuxt.config.ts
└── common/
    ├── locales/
    │   └── en.json           ← Shared translations
    └── nuxt.config.ts
```

### 2. Slice nuxt.config.ts Must Configure langDir

Every slice with translations needs this config:

```typescript
// slices/user/team/nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    langDir: '../locales',  // Relative path to locales folder
    locales: [{ code: 'en', file: 'en.json' }],
  },
});
```

### 3. Translations Are Merged Automatically

Nuxt layers merge all locale files. Keys must be unique across slices or use namespacing:

```json
// user/auth/locales/en.json - Use prefixes for uniqueness
{
  "auth.welcome": "Welcome back",
  "auth.login": "Login"
}

// user/team/locales/en.json
{
  "team.welcome": "Welcome to team",
  "team.create": "Create team"
}
```

---

## File Location & Naming

```
app/
└── slices/
    ├── setup/
    │   └── i18n/                    # Base i18n configuration
    │       ├── nuxt.config.ts       # Module + default settings
    │       ├── i18n.config.ts       # Vue I18n config (datetime formats)
    │       └── index.ts
    ├── common/
    │   ├── locales/
    │   │   ├── en.json              # Shared translations
    │   │   └── fr.json
    │   └── nuxt.config.ts
    └── user/
        ├── auth/
        │   ├── locales/
        │   │   ├── en.json          # Auth translations
        │   │   └── fr.json
        │   └── nuxt.config.ts
        └── team/
            ├── locales/
            │   └── en.json          # Team translations
            └── nuxt.config.ts
```

---

## Installation

### 1. Install Dependencies

```bash
npm install -D @nuxtjs/i18n@next
```

### 2. Update tsconfig.json

```json
{
  "compilerOptions": {
    "allowJs": false
  }
}
```

---

## Complete Configuration Examples

### Base i18n Slice: `setup/i18n/nuxt.config.ts`

```typescript
// slices/setup/i18n/nuxt.config.ts
// @scope:app
// @slice:setup/i18n
// @layer:config
// @type:nuxt-config

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  alias: {
    '#i18n': currentDir,
  },
  i18n: {
    // Path to Vue I18n config file
    vueI18n: 'i18n.config.ts',

    // URL strategy - no locale prefix in URL
    strategy: 'no_prefix',

    // Default language
    defaultLocale: 'en',

    // Disable strict message compilation for flexibility
    compilation: {
      strictMessage: false,
    },

    // Browser language detection
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
    },
  },
});
```

### Vue I18n Config: `setup/i18n/i18n.config.ts`

```typescript
// slices/setup/i18n/i18n.config.ts
// @scope:app
// @slice:setup/i18n
// @layer:config
// @type:i18n-config

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {},  // Messages come from slice locale files

  // Date/time formatting per locale
  datetimeFormats: {
    en: {
      short: {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      },
      long: {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
      },
      time: {
        hour: '2-digit',
        minute: 'numeric',
        hour12: true,
      },
    },
    fr: {
      short: {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      },
      long: {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
      },
      time: {
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      },
    },
  },
}));
```

---

## Feature Slice i18n Configuration

### Slice nuxt.config.ts Pattern

Each slice that needs translations must configure i18n:

```typescript
// slices/user/team/nuxt.config.ts
// @scope:app
// @slice:user/team
// @layer:config
// @type:nuxt-config

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  alias: {
    '#team': currentDir,
  },
  i18n: {
    langDir: '../locales',  // Relative path from nuxt.config.ts
    locales: [{ code: 'en', file: 'en.json' }],
  },
});
```

### Multiple Languages

```typescript
// slices/user/auth/nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    langDir: '../locales',
    locales: [
      { code: 'en', file: 'en.json' },
      { code: 'fr', file: 'fr.json' },
      { code: 'es', file: 'es.json' },
    ],
  },
});
```

---

## Locale File Examples

### Common Translations

```json
// slices/common/locales/en.json
{
  "locale.en": "English",
  "locale.fr": "French",
  "locale.es": "Spanish",
  "Home": "Home",
  "Save": "Save",
  "Cancel": "Cancel",
  "Delete": "Delete",
  "UNEXPECTED_ERROR_title": "Oops! Something Went Wrong",
  "UNEXPECTED_ERROR_description": "We encountered an unexpected error. Please try again."
}
```

### Feature-Specific Translations

```json
// slices/user/auth/locales/en.json
{
  "welcome": "Welcome to the application",

  "USER_EXISTS_title": "User Already Registered",
  "USER_EXISTS_description": "It looks like you already have an account. Please log in.",

  "USER_NOT_AUTHORIZED_title": "Incorrect Email or Password",
  "USER_NOT_AUTHORIZED_description": "Please verify your credentials and try again, or contact {supportLink}.",

  "USER_BANNED_title": "Account Banned",
  "USER_BANNED_description": "Your account has been banned. Please contact {supportLink}."
}
```

### Team Translations

```json
// slices/user/team/locales/en.json
{
  "locale.en": "English",
  "locale.fr": "French",
  "locale.es": "Spanish",
  "Home": "Home"
}
```

---

## Using Translations

### In Templates

```vue
<template>
  <div>
    <!-- Simple translation -->
    <h1>{{ $t('welcome') }}</h1>

    <!-- With interpolation -->
    <p>{{ $t('USER_BANNED_description', { supportLink: 'support@example.com' }) }}</p>

    <!-- Date formatting -->
    <span>{{ $d(new Date(item.createdAt), 'short') }}</span>

    <!-- Alternative date syntax -->
    <i18n-d tag="span" :value="new Date(item.createdAt)" format="long" />
  </div>
</template>
```

### In Composables/Scripts

```typescript
// Using useI18n composable
const { t, d, locale } = useI18n();

// Translate
const message = t('welcome');

// Format date
const formattedDate = d(new Date(), 'short');

// Switch locale
locale.value = 'fr';
```

### Utility Function for Dates

```typescript
// slices/common/utils/formatDate.ts
export const formatDate = (date: string) => {
  const { d } = useI18n();
  return d(new Date(date), 'short');
};
```

---

## Error Code Translation Pattern

Use a consistent pattern for error messages:

```json
// locales/en.json
{
  "ERROR_CODE_title": "Human-readable title",
  "ERROR_CODE_description": "Detailed description with {placeholder}"
}
```

```vue
<template>
  <div v-if="error">
    <h2>{{ $t(`${error.code}_title`) }}</h2>
    <p>{{ $t(`${error.code}_description`, { supportLink }) }}</p>
  </div>
</template>
```

---

## Language Switcher Component

```vue
<!-- slices/common/components/LanguageSwitcher.vue -->
<script setup lang="ts">
const { locale, locales, setLocale } = useI18n();

const availableLocales = computed(() =>
  locales.value.filter(i => i.code !== locale.value)
);
</script>

<template>
  <div class="flex gap-2">
    <button
      v-for="loc in availableLocales"
      :key="loc.code"
      @click="setLocale(loc.code)"
    >
      {{ $t(`locale.${loc.code}`) }}
    </button>
  </div>
</template>
```

---

## i18n Strategy Options

| Strategy | URL Pattern | Use Case |
|----------|-------------|----------|
| `no_prefix` | `/about` | Single-language or language in cookie |
| `prefix` | `/en/about` | All URLs have locale prefix |
| `prefix_except_default` | `/about`, `/fr/about` | Default language without prefix |
| `prefix_and_default` | `/en/about`, `/fr/about` | All languages with prefix |

---

## Checklist

### Initial Setup (setup/i18n slice)

- [ ] Install `@nuxtjs/i18n@next`
- [ ] Create `slices/setup/i18n/nuxt.config.ts`
- [ ] Create `slices/setup/i18n/i18n.config.ts` with datetime formats
- [ ] Set `allowJs: false` in `tsconfig.json`
- [ ] Configure strategy (recommend `no_prefix`)
- [ ] Configure browser language detection

### Adding Translations to a Slice

- [ ] Create `locales/` folder in the slice
- [ ] Create `en.json` (and other locale files)
- [ ] Add i18n config to slice's `nuxt.config.ts`:
  ```typescript
  i18n: {
    langDir: '../locales',
    locales: [{ code: 'en', file: 'en.json' }],
  }
  ```
- [ ] Use unique keys or namespace prefixes

### Using Translations

- [ ] Use `$t('key')` in templates
- [ ] Use `$d(date, 'format')` for dates
- [ ] Use `useI18n()` in composables
- [ ] Handle interpolation with `{ placeholder }` syntax

### Never Do

- [ ] NO hardcoded strings in components
- [ ] NO translations in the setup/i18n slice (only config)
- [ ] NO duplicate keys across slices without namespacing
- [ ] NO importing locale files directly (let Nuxt merge them)

---

## Related Documentation

- [Theme Setup](./app-theme.md) - UI components
- [Error Setup](./app-error.md) - Error handling with i18n
- [Store Setup](./app-store.md) - State management
