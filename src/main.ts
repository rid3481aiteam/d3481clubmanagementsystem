import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initGlobalErrorHandlers, reportError } from './lib/errorReporting'

const app = createApp(App)
app.use(createPinia())
app.use(router)

app.config.errorHandler = (err, _instance, info) => {
  console.error(err, info)
  reportError(err instanceof Error ? err.message : String(err), err instanceof Error ? (err.stack ?? null) : null)
}

app.mount('#app')
initGlobalErrorHandlers()
