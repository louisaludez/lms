<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import ForcedPasswordChangeModal from '@/components/ForcedPasswordChangeModal.vue'

const { initTheme } = useTheme()
initTheme()
</script>

<template>
  <RouterView />
  <ForcedPasswordChangeModal />
</template>
