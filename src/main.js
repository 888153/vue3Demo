import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import request from '@/utils/request'
const app = createApp(App)
app.use(ElementPlus)
app.use(createPinia())
app.use(router)
app.config.globalProperties.http = request
app.mount('#app')
