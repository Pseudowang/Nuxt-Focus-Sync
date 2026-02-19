import { ref } from 'vue'

const isProfileOpen = ref(false)

export const useUI = () => {
  const openProfile = () => {
    isProfileOpen.value = true
  }

  const closeProfile = () => {
    isProfileOpen.value = false
  }

  const toggleProfile = () => {
    isProfileOpen.value = !isProfileOpen.value
  }

  return {
    isProfileOpen,
    openProfile,
    closeProfile,
    toggleProfile
  }
}
