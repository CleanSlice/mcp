# App Menu Setup

This guide explains how to set up a dynamic menu system in Nuxt using the CleanSlice architecture. The menu is managed through a central Pinia store, and each slice can register its own menu items via plugins.

## Architecture Overview

The menu system consists of three main parts:

1. **Menu Store** (`common/stores/menu.ts`) - Central state management for menu items
2. **Menu Components** (`common/components/menu/`) - UI components that render the menu
3. **Slice Plugins** (`[slice]/plugins/menu.ts`) - Each slice registers its menu items

```
slices/
├── common/
│   ├── stores/
│   │   └── menu.ts          # Central menu store
│   ├── components/
│   │   └── menu/
│   │       ├── Top.vue      # Top navigation menu
│   │       └── Sidebar.vue  # Sidebar navigation menu
│   └── index.ts             # Exports for #common alias
├── user/
│   └── plugins/
│       └── menu.ts          # Registers user menu items
├── chat/
│   └── plugins/
│       └── menu.ts          # Registers chat menu items
└── files/
    └── plugins/
        └── menu.ts          # Registers files menu items
```

## Step 1: Create the Menu Store

Create the central menu store in the `common` slice that will hold all menu items.

**File:** `slices/common/stores/menu.ts`

```typescript
import { defineStore } from 'pinia';

// Define menu groups for organizing sidebar items
export enum MenuGroupTypes {
  Project = 'project',
  Playground = 'playground',
  Account = 'account',
  Resources = 'resources',
}

// Menu item interface
export type IMenuData = {
  id: string;
  group?: MenuGroupTypes;
  title: string;
  link: string;
  active: boolean;
  icon: string;
  sortOrder: number;
  isPolling: boolean;
};

export const useMenuStore = defineStore('menu', {
  state: () => ({
    sidebar: [] as IMenuData[],
    items: [] as IMenuData[],
  }),

  getters: {
    // Get sorted sidebar items with active state based on current route
    getSidebar: (state) => {
      return state.sidebar
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => {
          const route = useRoute();
          if (route?.name) {
            item.active = route.name.toString() === item.link;
          }
          return item;
        });
    },

    // Get sorted top menu items with active state based on current route
    getItems: (state) => {
      return state.items
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => {
          const route = useRoute();
          if (route?.name) {
            item.active = route.name.toString() === item.link;
          }
          return item;
        });
    },
  },

  actions: {
    // Add item to sidebar menu (with duplicate prevention for SSR)
    addSidebar(item: IMenuData) {
      const itemExists = this.sidebar.some(
        (existingItem) => existingItem.id === item.id && existingItem.group === item.group,
      );

      if (!itemExists) {
        this.sidebar.push(item);
      }
    },

    // Add item to top menu (with duplicate prevention for SSR)
    addItem(item: IMenuData) {
      const itemExists = this.items.some((existingItem) => existingItem.id === item.id);

      if (!itemExists) {
        this.items.push(item);
      }
    },
  },
});
```

## Step 2: Export the Store

Export the menu store and types from the common slice index file.

**File:** `slices/common/index.ts`

```typescript
export * from './stores/menu';
```

## Step 3: Create Menu Components

### Top Navigation Menu

A simple horizontal menu for top navigation.

**File:** `slices/common/components/menu/Top.vue`

```vue
<template>
  <div class="common-menu">
    <div class="common-menu__wrapper">
      <nuxt-link
        v-for="item in menu.getItems"
        :key="item.id"
        :to="{ name: item.link }"
        class="common-menu__item"
        :class="{ '--active': item.active }"
        aria-current="page"
      >
        {{ $t(item.title) }}
      </nuxt-link>
    </div>
  </div>
</template>

<script setup lang="ts">
const menu = useMenuStore();
</script>

<style lang="scss">
.common-menu {
  &__wrapper {
    @apply flex space-x-4;
  }
  &__item {
    @apply text-gray-700 rounded-md px-3 py-2 text-sm cursor-pointer;
    &.--active {
      @apply text-gray-700 font-bold;
    }
  }
}
</style>
```

### Sidebar Menu

A grouped sidebar menu with icons and sections.

**File:** `slices/common/components/menu/Sidebar.vue`

```vue
<script setup lang="ts">
import { MenuGroupTypes } from '#common/stores/menu';

const menu = useMenuStore();
const route = useRoute();

const getSidebarByGroup = (group: MenuGroupTypes) => {
  const items = menu.getSidebar;
  return items.filter((item) => item.group == group);
};
</script>

<template>
  <div
    v-for="group in [
      MenuGroupTypes.Project,
      MenuGroupTypes.Playground,
      MenuGroupTypes.Account,
      MenuGroupTypes.Resources,
    ]"
    :key="group"
    class="mb-4"
  >
    <h4 class="mb-1 rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
      {{ group }}
    </h4>

    <div class="grid grid-flow-row auto-rows-max text-sm">
      <nuxt-link
        v-for="item in getSidebarByGroup(group)"
        :key="item.id"
        :to="{ name: item.link, params: { teamId: route.params.teamId } }"
        class="group flex w-full items-center rounded-md border border-transparent px-2 py-1 text-muted-foreground"
        :class="{ '!font-semibold !text-foreground': item.active }"
        aria-current="page"
      >
        <Icon :name="item.icon" class="mr-2" :class="{ 'animate-pulse text-orange-400': item.isPolling }" />
        {{ $t(item.title) }}
      </nuxt-link>
    </div>
  </div>
</template>
```

## Step 4: Register Menu Items via Slice Plugins

Each slice can register its own menu items using a Nuxt plugin. This keeps the menu configuration co-located with the feature it represents.

### Basic Plugin Example

**File:** `slices/chat/plugins/menu.ts`

```typescript
// Add an item to the common Menu
import { MenuGroupTypes } from '#common';

export default defineNuxtPlugin(async () => {
  const menu = useMenuStore();

  menu.addSidebar({
    id: 'chat',
    group: MenuGroupTypes.Project,
    title: 'Chat',
    link: 'teams-teamId-chats',
    active: false,
    icon: 'MessageCircle',
    isPolling: false,
    sortOrder: 3,
  });
});
```

### Plugin with Conditional Logic

You can add conditional logic based on store state or other factors.

**File:** `slices/user/plugins/menu.ts`

```typescript
import { MenuGroupTypes } from '#common';

export default defineNuxtPlugin(async () => {
  const menu = useMenuStore();
  const userStore = useUserStore();

  // Only add menu item if user is authenticated
  if (userStore.isAuthenticated) {
    menu.addSidebar({
      id: 'profile',
      group: MenuGroupTypes.Account,
      title: 'Profile',
      link: 'profile',
      active: false,
      icon: 'User',
      isPolling: false,
      sortOrder: 1,
    });
  }
});
```

### Plugin for Resources Section

**File:** `slices/files/plugins/menu.ts`

```typescript
import { MenuGroupTypes } from '#common';

export default defineNuxtPlugin(() => {
  const menu = useMenuStore();

  menu.addSidebar({
    id: 'files',
    group: MenuGroupTypes.Resources,
    title: 'Files',
    link: 'files',
    active: false,
    icon: 'File',
    isPolling: false,
    sortOrder: 1,
  });
});
```

## Menu Item Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier for the menu item |
| `group` | `MenuGroupTypes` | Optional group for sidebar organization |
| `title` | `string` | Display text (supports i18n keys) |
| `link` | `string` | Route name to navigate to |
| `active` | `boolean` | Whether the item is currently active (auto-calculated) |
| `icon` | `string` | Icon name (e.g., Lucide icon names) |
| `sortOrder` | `number` | Order within the group (lower = higher) |
| `isPolling` | `boolean` | Shows a pulsing indicator when true |

## Usage in Layouts

Add the menu components to your layout files.

**File:** `layouts/default.vue`

```vue
<template>
  <div class="layout">
    <header>
      <CommonMenuTop />
    </header>
    <aside>
      <CommonMenuSidebar />
    </aside>
    <main>
      <slot />
    </main>
  </div>
</template>
```

## Best Practices

1. **Unique IDs**: Always use unique `id` values to prevent duplicate entries
2. **Consistent Naming**: Use the slice name as the menu item `id` for clarity
3. **Sort Order**: Plan your `sortOrder` values with gaps (e.g., 10, 20, 30) to allow future insertions
4. **Group Organization**: Use `MenuGroupTypes` to logically organize sidebar items
5. **SSR Safety**: The store's `addSidebar` and `addItem` methods include duplicate prevention for SSR hydration
6. **i18n Support**: Use translation keys for `title` to support internationalization

## Adding New Menu Groups

To add a new menu group, update the `MenuGroupTypes` enum:

```typescript
export enum MenuGroupTypes {
  Project = 'project',
  Playground = 'playground',
  Account = 'account',
  Resources = 'resources',
  Admin = 'admin', // New group
}
```

Then update the `Sidebar.vue` component to include the new group in the iteration array.
