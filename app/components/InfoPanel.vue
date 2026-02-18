<script setup lang="ts">
import { computed } from "vue";
import { useGoogleCalendar } from "~/composables/useGoogleCalendar";

import TodoList from "./TodoList.vue";
import StatsDisplay from "./StatsDisplay.vue";

const { isSignedIn, isLoading, errorMessage, signInWithGoogle, signOutGoogle } =
  useGoogleCalendar();

const googleButtonTitle = computed(() => {
  if (isLoading.value) return "Connecting...";
  if (isSignedIn.value) return "Connected";
  return "Sync with Google";
});

const handleGoogleSignIn = async () => {
  try {
    await signInWithGoogle();
  } catch (error) {
    console.error("Google sign-in failed", error);
  }
};
</script>

<template>
  <div class="h-full flex flex-col gap-10">
    <!-- Stats Section -->
    <section>
      <div class="flex items-center justify-between mb-6">
        <h2
          class="text-xs font-bold text-text-muted uppercase tracking-[0.2em] opacity-60"
        >
          Analytics
        </h2>

        <!-- Google Login Button -->
        <button
          v-if="!isSignedIn"
          @click="handleGoogleSignIn"
          :disabled="isLoading"
          class="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-glass-border hover:bg-white/10 hover:border-white/20 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          :title="googleButtonTitle"
        >
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            ></path>
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            ></path>
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            ></path>
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            ></path>
            <path fill="none" d="M0 0h48v48H0z"></path>
          </svg>
          <span class="text-xs font-semibold text-text-primary">Sync</span>
        </button>

        <button
          v-else
          @click="signOutGoogle"
          class="px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
          title="Disconnect Google Calendar"
        >
          Synced
        </button>
      </div>

      <p v-if="errorMessage" class="text-[11px] text-red-400 mb-2 font-medium">
        {{ errorMessage }}
      </p>

      <StatsDisplay />
    </section>

    <div class="h-px bg-glass-border w-full"></div>

    <!-- Todo Section -->
    <section class="flex-1 flex flex-col min-h-0">
      <TodoList />
    </section>
  </div>
</template>
