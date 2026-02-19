<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useFocusFlowDAO } from "~/composables/useFocusFlowDAO";
import { useGoogleCalendar } from "~/composables/useGoogleCalendar";
import { usePomodoro, DURATIONS } from "~/composables/usePomodoro";

import TodoList from "./TodoList.vue";
import StatsDisplay from "./StatsDisplay.vue";
import { useUI } from "~/composables/useUI";

const {
  isSignedIn,
  currentUser,
  isLoading,
  errorMessage,
  signInWithGoogle,
  signOutGoogle,
} = useGoogleCalendar();

const { hasGuestData, setShouldMigrateGuestOnLogin } = useFocusFlowDAO();

const { currentMode, timeLeft, isRunning } = usePomodoro();
const { openProfile } = useUI();

const showDropdown = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const googleButtonTitle = computed(() => {
  if (isLoading.value) return "Connecting...";
  if (isSignedIn.value) return "Connected";
  return "Sync with Google";
});

const progress = computed(() => {
  if (currentMode.value === "flow") return isRunning.value ? 100 : 0;
  const total = DURATIONS[currentMode.value];
  if (total === 0) return 0;
  return ((total - timeLeft.value) / total) * 100;
});

const modeColorClass = computed(() => {
  switch (currentMode.value) {
    case "focus":
      return "text-focus";
    case "short-break":
      return "text-short-break";
    case "long-break":
      return "text-long-break";
    case "flow":
      return "text-flow";
    default:
      return "text-focus";
  }
});

const modeGlowStyle = computed(() => {
  const colors = {
    focus: "rgba(163, 66, 60, 0.4)",
    "short-break": "rgba(67, 104, 80, 0.4)",
    "long-break": "rgba(75, 123, 148, 0.4)",
    flow: "rgba(118, 88, 152, 0.4)",
  };
  return {
    "--hover-glow": colors[currentMode.value],
  };
});

const handleGoogleSignIn = async () => {
  try {
    const hasGuest = await hasGuestData();
    if (hasGuest) {
      const shouldMigrate = window.confirm(
        "是否将游客数据同步至你的 Google 账号？\n选择“确定”会迁移 guest 数据，选择“取消”会保留 guest 数据。",
      );
      setShouldMigrateGuestOnLogin(shouldMigrate);
    } else {
      setShouldMigrateGuestOnLogin(false);
    }

    await signInWithGoogle();
  } catch (error) {
    console.error("Google sign-in failed", error);
  }
};

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

const handleOpenProfile = () => {
  openProfile();
  showDropdown.value = false;
};

const closeDropdown = (e: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    showDropdown.value = false;
  }
};

onMounted(() => {
  window.addEventListener("click", closeDropdown);
});

onUnmounted(() => {
  window.removeEventListener("click", closeDropdown);
});
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

        <!-- Auth Section -->
        <div class="relative" ref="dropdownRef">
          <Transition name="fade" mode="out-in">
            <!-- Google Login Button -->
            <button
              v-if="!isSignedIn"
              @click="handleGoogleSignIn"
              :disabled="isLoading"
              class="google-login-btn flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-glass-border transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              :style="modeGlowStyle"
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

            <!-- User Avatar & Dropdown Trigger -->
            <div v-else class="flex items-center">
              <button
                @click="toggleDropdown"
                class="relative group focus:outline-none"
              >
                <!-- Avatar with Progress Ring -->
                <div
                  class="relative w-10 h-10 flex items-center justify-center"
                >
                  <!-- Progress Ring -->
                  <svg
                    v-if="isRunning"
                    class="absolute inset-0 w-full h-full -rotate-90 transform"
                    viewBox="0 0 40 40"
                  >
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-dasharray="113.097"
                      :stroke-dashoffset="113.097 * (1 - progress / 100)"
                      class="transition-all duration-1000 ease-linear"
                      :class="modeColorClass"
                    />
                  </svg>

                  <!-- Static Border if not running -->
                  <div
                    v-else
                    class="absolute inset-0 rounded-full border-2 border-white/10"
                  ></div>

                  <!-- Profile Image -->
                  <img
                    v-if="currentUser?.picture"
                    :src="currentUser.picture"
                    :alt="currentUser.name"
                    class="w-[32px] h-[32px] rounded-full border-2 border-white/40 object-cover shadow-lg group-hover:scale-105 transition-transform"
                  />
                  <div
                    v-else
                    class="w-[32px] h-[32px] rounded-full border-2 border-white/40 bg-white/10 flex items-center justify-center text-[10px] font-bold"
                  >
                    {{ currentUser?.name?.charAt(0) || "U" }}
                  </div>
                </div>
              </button>

              <!-- Dropdown Menu -->
              <Transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="transform scale-95 opacity-0"
                enter-to-class="transform scale-100 opacity-100"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="transform scale-100 opacity-100"
                leave-to-class="transform scale-95 opacity-0"
              >
                <div
                  v-if="showDropdown"
                  class="absolute right-0 top-full mt-2 w-56 bg-slate-900/90 backdrop-blur-2xl border border-glass-border rounded-2xl shadow-2xl overflow-hidden z-50 py-2"
                >
                  <div class="px-4 py-3 border-b border-glass-border/50 mb-1">
                    <p
                      class="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-60"
                    >
                      Signed in as
                    </p>
                    <p
                      class="text-[11px] text-text-primary/80 truncate font-medium mt-0.5"
                    >
                      {{ currentUser?.email }}
                    </p>
                  </div>

                  <button
                    class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-text-primary hover:bg-white/10 transition-colors flex items-center gap-3"
                    @click="handleOpenProfile"
                  >
                    <svg
                      class="w-4 h-4 opacity-70"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <polyline points="22 21 18 17 22 13" />
                    </svg>
                    Profile & Stats
                  </button>

                  <div class="mx-4 my-1 h-px bg-glass-border/50"></div>

                  <button
                    @click="signOutGoogle"
                    class="w-full text-left px-4 py-2.5 text-[12px] font-semibold text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                  >
                    <svg
                      class="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Log out
                  </button>
                </div>
              </Transition>
            </div>
          </Transition>
        </div>
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

<style scoped>
.google-login-btn:hover {
  box-shadow: 0 0 15px var(--hover-glow);
  border-color: var(--hover-glow);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
