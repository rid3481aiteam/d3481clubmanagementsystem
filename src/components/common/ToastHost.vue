<script setup lang="ts">
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
</script>

<template>
  <div class="toast-wrap">
    <div v-for="t in toast.toasts" :key="t.id" class="toast" :class="t.type === 'ok' ? 'toast-ok' : 'toast-err'">
      {{ t.message }}
    </div>
  </div>
</template>
