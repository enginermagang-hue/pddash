<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { isAuthenticated, logout } from './auth.ts';

const router = useRouter();
const menuOpen = ref(false);

function handleLogout() {
  logout();
  router.replace('/login');
}
const isDark = ref(localStorage.getItem('theme') === 'dark');

watch(
  isDark,
  (value) => {
    document.documentElement.classList.toggle('dark', value);
    localStorage.setItem('theme', value ? 'dark' : 'light');
  },
  { immediate: true },
);
</script>
<template>
  <div class="flex min-h-screen flex-col bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100">
    <header
      class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80"
    >
      <h1 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Dashboard Peserta Didik</h1>
      <div class="flex items-center gap-3">
        <button
          class="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          @click="isDark = !isDark"
          :aria-label="isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'"
        >
          <i class="bi" :class="isDark ? 'bi-sun' : 'bi-moon'"></i>
        </button>
        <button
          v-if="isAuthenticated"
          class="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          @click="handleLogout"
          aria-label="Keluar"
        >
          <i class="bi bi-box-arrow-right"></i>
        </button>
        <button
          class="md:hidden rounded-lg border border-slate-300 p-2 text-slate-600 dark:border-slate-600 dark:text-slate-300"
          @click="menuOpen = !menuOpen"
          aria-label="Menu"
        >
          <i class="bi bi-list"></i>
        </button>
        <nav v-if="isAuthenticated" class="hidden items-center gap-6 text-sm md:flex">
          <RouterLink
            to="/"
            class="text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
            active-class="border-b-2 border-indigo-600 font-semibold text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
          >
            Dashboard
          </RouterLink>
          <RouterLink
            to="/about"
            class="text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
            active-class="border-b-2 border-indigo-600 font-semibold text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
          >
            Tentang
          </RouterLink>
        </nav>
      </div>

      <nav
        v-show="menuOpen && isAuthenticated"
        class="absolute right-0 top-full z-10 flex w-48 flex-col gap-1 border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800 md:hidden"
      >
        <RouterLink
          to="/"
          class="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40"
          active-class="bg-indigo-50 font-semibold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
          @click="menuOpen = false"
        >
          Dashboard
        </RouterLink>
        <RouterLink
          to="/about"
          class="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40"
          active-class="bg-indigo-50 font-semibold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
          @click="menuOpen = false"
        >
          Tentang
        </RouterLink>
      </nav>
    </header>

    <main class="flex-1 w-full">
      <RouterView />
    </main>
  </div>
</template>
