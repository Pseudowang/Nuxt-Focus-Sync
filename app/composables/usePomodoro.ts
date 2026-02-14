import { ref, watch, onMounted } from 'vue'

export type TimerMode = 'focus' | 'short-break' | 'long-break' | 'flow'

interface Stats {
    todayFocusTime: number // in seconds
    streak: number
    lastDate: string
}

// Global State
const currentMode = ref<TimerMode>('focus')
const timeLeft = ref(25 * 60)
const isRunning = ref(false)
const timerInterval = ref<any>(null) // Use any to avoid NodeJS/Browser type conflicts

// Initial stats
const stats = ref<Stats>({
    todayFocusTime: 0,
    streak: 0,
    lastDate: new Date().toISOString().split('T')[0]
})

// Mode durations (in seconds)
const DURATIONS: Record<TimerMode, number> = {
    'focus': 25 * 60,
    'short-break': 5 * 60,
    'long-break': 15 * 60,
    'flow': 0
}

export const usePomodoro = () => {
    // Load stats from localStorage
    onMounted(() => {
        if (typeof window === 'undefined') return // Nuxt SSR check
        const savedStats = localStorage.getItem('pomodoro-stats')
        if (savedStats) {
            try {
                const parsed = JSON.parse(savedStats)
                const today = new Date().toISOString().split('T')[0]

                if (parsed.lastDate) {
                    const lastDateObj = new Date(parsed.lastDate)
                    const todayObj = new Date(today)
                    const diffTime = todayObj.getTime() - lastDateObj.getTime()
                    const diffDays = diffTime / (1000 * 3600 * 24)

                    if (diffDays >= 2) {
                        stats.value.streak = 0
                    } else {
                        stats.value.streak = parsed.streak || 0
                    }

                    if (parsed.lastDate !== today) {
                        stats.value.todayFocusTime = 0
                        stats.value.lastDate = today
                    } else {
                        stats.value.todayFocusTime = parsed.todayFocusTime || 0
                    }
                }
            } catch (e) {
                console.error('Failed to parse stats', e)
            }
        }
    })

    // Watch stats to save
    watch(stats, (newStats) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('pomodoro-stats', JSON.stringify(newStats))
        }
    }, { deep: true })

    const switchMode = (mode: TimerMode) => {
        currentMode.value = mode
        resetTimer()
    }

    const toggleTimer = () => {
        if (isRunning.value) {
            pauseTimer()
        } else {
            startTimer()
        }
    }

    const startTimer = () => {
        if (isRunning.value) return
        isRunning.value = true

        timerInterval.value = setInterval(() => {
            if (currentMode.value === 'flow') {
                timeLeft.value++
                stats.value.todayFocusTime++
            } else {
                if (timeLeft.value > 0) {
                    timeLeft.value--
                    if (currentMode.value === 'focus') {
                        stats.value.todayFocusTime++
                    }
                } else {
                    pauseTimer()
                    if (currentMode.value === 'focus') {
                        // Timer finished
                    }
                }
            }
        }, 1000)
    }

    const pauseTimer = () => {
        isRunning.value = false
        if (timerInterval.value) {
            clearInterval(timerInterval.value)
            timerInterval.value = null
        }
    }

    const resetTimer = () => {
        pauseTimer()
        if (currentMode.value === 'flow') {
            timeLeft.value = 0
        } else {
            timeLeft.value = DURATIONS[currentMode.value]
        }
    }

    // Format time mm:ss
    const formattedTime = () => {
        const minutes = Math.floor(timeLeft.value / 60)
        const seconds = timeLeft.value % 60
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    return {
        currentMode,
        timeLeft,
        isRunning,
        stats,
        switchMode,
        toggleTimer,
        resetTimer,
        formattedTime
    }
}
