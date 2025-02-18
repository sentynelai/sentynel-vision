import { Buffer } from 'buffer'
import inherits from 'inherits'
import process from 'process'

window.Buffer = Buffer
window.global = window
window.inherits = inherits
window.process = process

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';

// Initialize Firebase before creating the app
import './firebase/config';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Mount the app after Firebase is initialized
app.mount('#app');