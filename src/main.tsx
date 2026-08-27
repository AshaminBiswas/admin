import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { keepAliveServerPing } from './api/adminApi'

// ─── Pre-Login Server Warm-Up ────────────────────────────────────────────────
// Ping the backend immediately when the admin panel loads (even before login)
// and then every 4 minutes, so the Render server NEVER sleeps — regardless of
// whether anyone is authenticated.
keepAliveServerPing();
const _preLoginPing = setInterval(keepAliveServerPing, 4 * 60 * 1000);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
