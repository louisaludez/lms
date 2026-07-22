import { ref, computed, onMounted } from 'vue'

export type Theme = 'light' | 'dark'

const theme = ref<Theme>('light')
let initialized = false

function applyTheme(t: Theme) {
  theme.value = t
  if (typeof document !== 'undefined') {
    if (t === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('lumina_theme', t)
  }
}

export function useTheme() {
  function initTheme() {
    if (initialized) return
    const saved = typeof localStorage !== 'undefined' ? (localStorage.getItem('lumina_theme') as Theme | null) : null
    if (saved === 'dark' || saved === 'light') {
      applyTheme(saved)
    } else if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      applyTheme(prefersDark ? 'dark' : 'light')
    } else {
      applyTheme('light')
    }
    initialized = true
  }

  function toggleTheme() {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  onMounted(() => {
    initTheme()
  })

  return {
    theme,
    isDark: computed(() => theme.value === 'dark'),
    toggleTheme,
    initTheme
  }
}
