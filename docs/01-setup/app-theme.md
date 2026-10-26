---
id: setup-app-theme
title: Theme Setup (App)
version: 2.0.0
last_updated: 2026-10-08

pattern: setup
complexity: fundamental
framework: nuxt
category: setup
applies_to: [frontend, app]

tags:
  - theme
  - shadcn-vue
  - tailwind
  - tailwind-v4
  - css
  - dark-mode
  - ui-components

keywords:
  - theme setup
  - shadcn-vue
  - tailwind css v4
  - css variables
  - oklch
  - dark mode
  - ui components
  - design system

deprecated: false
experimental: false
production_ready: true
---

# Theme Setup (App)

> **The Theme slice provides the design system foundation** for your Nuxt application. It registers Tailwind CSS v4 and shadcn-vue, wires semantic tokens to CSS variables, holds every shared UI component, and ships the `cn()` utility.

---

## Critical Rules

### 1. Theme Slice is a Setup Slice

```
slices/
├── setup/
│   └── theme/          # Theme configuration lives here
├── user/               # Feature slices use theme components
├── product/
└── ...
```

### 2. Components are Auto-Imported

The `shadcn-nuxt` module auto-imports all UI components. No import statements needed:

```vue
<!-- CORRECT - Auto-imported, just use in template -->
<template>
  <Button>Click me</Button>
  <Card><CardContent>Hello</CardContent></Card>
</template>
```

### 3. Use `#theme` Alias for Manual Imports

When you need to import in `<script>` (utilities, variants, programmatic use):

```typescript
// CORRECT - Use alias
import { buttonVariants } from '#theme/components/ui/button';
import { cn } from '#theme/utils';

// WRONG - Relative paths
import { cn } from '../../../setup/theme/utils';
```

### 4. All UI Components Live in Theme

```typescript
// CORRECT - Components in theme slice
slices/setup/theme/components/ui/button/Button.vue

// WRONG - Components scattered in feature slices
slices/user/components/ui/button/Button.vue  // NEVER
```

### 5. Tailwind v4: Configuration is CSS

There is no `tailwind.config.js` and no `@nuxtjs/tailwindcss` module. Tokens are declared in `tailwind.css` with `@theme inline`; values live in a theme file under `assets/themes/`. `components.json` sits at the **app root** and names the active theme.

---

## File Location & Naming

```
app/
├── components.json               # shadcn CLI config + active theme name (APP ROOT)
└── slices/setup/theme/
    ├── nuxt.config.ts            # shadcn-nuxt, Tailwind Vite plugin, #theme alias
    ├── assets/
    │   ├── css/
    │   │   └── tailwind.css      # @import tailwindcss, @theme inline, base layer
    │   └── themes/
    │       ├── default.css       # one theme = one file (:root + .dark)
    │       └── cleanslice.css
    ├── components/
    │   └── ui/                   # shadcn-vue components
    │       ├── button/
    │       │   ├── Button.vue
    │       │   └── index.ts      # exports component + cva variants
    │       ├── card/
    │       └── ...
    ├── utils/
    │   ├── index.ts
    │   └── cn.ts                 # Class name utility
    └── index.ts                  # Public exports
```

---

## Installation

```bash
# Tailwind v4 + shadcn
bun add -d tailwindcss @tailwindcss/vite tw-animate-css shadcn-nuxt @nuxtjs/color-mode

# Runtime
bun add reka-ui class-variance-authority clsx tailwind-merge lucide-vue-next
```

---

## Complete Configuration Example

### `slices/setup/theme/nuxt.config.ts`

```typescript
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import tailwindcss from '@tailwindcss/vite';

const currentDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(currentDir, '../../..');

// Read the active theme name from components.json
const componentsJson = JSON.parse(
  readFileSync(resolve(appRoot, 'components.json'), 'utf-8'),
);
const themeName = componentsJson.tailwind?.theme || 'default';
const themeCss = `#theme/assets/themes/${themeName}.css`;

export default defineNuxtConfig({
  modules: ['shadcn-nuxt'],
  css: [themeCss, '#theme/assets/css/tailwind.css'],
  alias: {
    '#theme': currentDir,
  },
  vite: {
    plugins: [tailwindcss()],
  },
  shadcn: {
    prefix: '',
    componentDir: './slices/setup/theme/components/ui',
  },
  components: {
    dirs: [],
  },
});
```

> **Order matters**: the theme file is listed before `tailwind.css` so its variables exist when `@theme inline` reads them.

### `slices/setup/theme/assets/css/tailwind.css`

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

Every `--color-*` entry becomes a utility family (`bg-primary`, `text-muted-foreground`, `border-border`). Adding a token = one variable in each theme file + one line here.

### `slices/setup/theme/assets/themes/default.css`

```css
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  /* chart-* and sidebar-* get their dark values the same way */
}
```

Switch themes by changing `tailwind.theme` in `components.json`. Add one by dropping a file into `assets/themes/`. Generate a palette at https://www.shadcn-vue.com/themes or https://tweakcn.com and paste the variables.

### `slices/setup/theme/utils/cn.ts`

```typescript
import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### `components.json` (app root)

```json
{
  "$schema": "https://shadcn-vue.com/schema.json",
  "style": "new-york",
  "typescript": true,
  "tailwind": {
    "config": "",
    "css": "slices/setup/theme/assets/css/tailwind.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": "",
    "theme": "cleanslice"
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "#theme/components",
    "utils": "#theme/utils",
    "ui": "#theme/components/ui",
    "lib": "#theme/utils",
    "composables": "#theme/composables"
  }
}
```

`tailwind.config` is empty on purpose (v4 has no config file). `tailwind.theme` is CleanSlice's addition, read by the theme slice's `nuxt.config.ts`.

### Root `nuxt.config.ts` (color mode)

```typescript
export default defineNuxtConfig({
  modules: ['@nuxtjs/color-mode'],
  colorMode: {
    classSuffix: '',       // class is exactly "dark", matching @custom-variant
    preference: 'system',
    fallback: 'system',
  },
});
```

---

## Adding shadcn-vue Components

With `components.json` at the app root, the CLI installs straight into `slices/setup/theme/components/ui/`:

```bash
cd app

# Install a single component
bunx shadcn-vue@latest add button

# Install multiple components at once
bunx shadcn-vue@latest add card input textarea dialog sonner
```

**Check the catalog first.** A component that exists in shadcn-vue is installed, never hand-written. A custom component goes into `components/ui/` only when the catalog has no equivalent, and it is built from the same primitives (`reka-ui`, `cva`, `cn`).

### Common Components

```bash
bunx shadcn-vue@latest add card separator scroll-area input textarea select checkbox switch form dropdown-menu navigation-menu tabs breadcrumb alert alert-dialog sonner dialog sheet drawer popover tooltip table avatar badge
```

Full list: https://www.shadcn-vue.com/docs/components

---

## Usage Examples

### Using UI Components (Auto-Imported)

```vue
<template>
  <Card>
    <CardHeader>
      <CardTitle>User Profile</CardTitle>
    </CardHeader>
    <CardContent>
      <Input placeholder="Enter your name" />
      <Button class="mt-4">Save</Button>
    </CardContent>
  </Card>
</template>
```

`class="mt-4"` is layout relative to the parent and belongs to the caller. What the button looks like is a `variant`/`size` and belongs to the theme.

### Variants with cva

```typescript
// slices/setup/theme/components/ui/button/index.ts
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';

export { default as Button } from './Button.vue';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
```

### Using Icons

```vue
<script setup lang="ts">
import { User, Settings, LogOut } from 'lucide-vue-next';
</script>

<template>
  <div class="flex gap-4">
    <User class="h-5 w-5" />
    <Settings class="h-5 w-5" />
    <LogOut class="h-5 w-5" />
  </div>
</template>
```

---

## Color Token Reference

| Token | Usage |
| --- | --- |
| `background` / `foreground` | Page background, default text |
| `card` / `card-foreground` | Card surfaces |
| `popover` / `popover-foreground` | Popovers, dropdowns |
| `primary` / `primary-foreground` | Primary actions, links |
| `secondary` / `secondary-foreground` | Secondary actions |
| `muted` / `muted-foreground` | Muted surfaces and text |
| `accent` / `accent-foreground` | Hover and highlight surfaces |
| `destructive` / `destructive-foreground` | Errors, delete actions |
| `border`, `input`, `ring` | Borders, input borders, focus rings |
| `chart-1` … `chart-5` | Data visualization series |
| `sidebar-*` | Sidebar surfaces (`sidebar`, `-foreground`, `-primary`, `-accent`, `-border`, `-ring`) |

Need `success` / `warning`? Add `--success` to each theme file and `--color-success: var(--success)` to `@theme inline`. Never write a raw color in a component.

---

## Dark Mode

Dark mode is the `.dark` class on `<html>`. `tailwind.css` declares `@custom-variant dark (&:is(.dark *))`, so every `dark:` utility and every `.dark { ... }` token block follows that class. The class is owned by `@nuxtjs/color-mode` (root module, `classSuffix: ''`); there is no hand-written dark-mode composable.

```vue
<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next';

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');

function toggle() {
  colorMode.preference = isDark.value ? 'light' : 'dark';
}
</script>

<template>
  <Button variant="ghost" size="icon" @click="toggle">
    <Sun v-if="isDark" class="h-5 w-5" />
    <Moon v-else class="h-5 w-5" />
  </Button>
</template>
```

---

## Checklist

### Initial Setup

- [ ] Install dependencies (Tailwind v4, `@tailwindcss/vite`, `tw-animate-css`, `shadcn-nuxt`, `reka-ui`, `cva`, `clsx`, `tailwind-merge`, `lucide-vue-next`, `@nuxtjs/color-mode`)
- [ ] Create slice folder structure
- [ ] `components.json` at the app root with `tailwind.theme` set
- [ ] Configure `nuxt.config.ts` with `#theme` alias, `tailwindcss()` Vite plugin, theme CSS before `tailwind.css`
- [ ] Create `tailwind.css` with `@theme inline` token wiring
- [ ] Create at least one theme file under `assets/themes/`
- [ ] Create `cn.ts` utility
- [ ] Register `@nuxtjs/color-mode` in the root config with `classSuffix: ''`

### For Each Component Added

- [ ] Check the shadcn-vue catalog first
- [ ] Run `bunx shadcn-vue@latest add [component]`
- [ ] Component placed in `slices/setup/theme/components/ui/`
- [ ] Variants exported from the folder's `index.ts`

### Never Do

- [ ] NO UI components outside theme slice
- [ ] NO hardcoded colors (use tokens; add a token if one is missing)
- [ ] NO `tailwind.config.js` or `@nuxtjs/tailwindcss` (v4 is configured in CSS)
- [ ] NO relative imports (use `#theme` alias)
- [ ] NO inline styles for theming
- [ ] NO restyling a theme component with `class=`; add a variant instead

---

## Related Documentation

- [App Setup](./setup-app.md) - Nuxt application setup
- [Error Setup](./app-error.md) - Error handling
- [i18n Setup](./app-i18n.md) - Internationalization
