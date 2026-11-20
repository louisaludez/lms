<script setup lang="ts">
import { onMounted, ref, computed, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import { useLibraryStore, useAuthStore } from '@/stores/useLibraryStore'
import NavBar from '@/components/NavBar.vue'

const store = useLibraryStore()
const auth = useAuthStore()

const isDesktop = ref(window.innerWidth >= 768)
function handleResize() { isDesktop.value = window.innerWidth >= 768 }
onMounted(() => {
  store.fetchStats()
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => window.removeEventListener('resize', handleResize))

const sidebarPadding = computed(() => {
  if (!isDesktop.value) return '0'
  return auth.isSidebarVisible ? '16rem' : '0'
})
</script>

<template>
  <div class="min-h-screen bg-[#F7F5F0] dark:bg-[#0F172A] transition-colors duration-200 transition-all duration-300" :style="{ paddingLeft: sidebarPadding }">
    <NavBar />
    <main class="p-4 sm:p-6 lg:p-8">
      <RouterView />
    </main>
  </div>
</template>