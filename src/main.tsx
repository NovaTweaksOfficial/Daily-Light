import { Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'
import { SettingsProvider } from '@/state/settings'
import { LibraryProvider } from '@/state/library'
import { PlansProvider } from '@/state/plans'
import { PlayerProvider } from '@/state/player'
import { ToastProvider } from '@/state/toast'
import { speechPlayer } from '@/lib/tts'
import '@/styles/tokens.css'
import '@/styles/app.css'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fatal">
          <div className="fatal-card">
            <h1>Something went sideways</h1>
            <p>Daily Light hit an unexpected error. Your saved verses and progress are safe on this device.</p>
            <pre>{this.state.error.message}</pre>
            <button onClick={() => window.location.reload()}>Reload the app</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/* Keep speech + wake lock alive when returning to the tab. */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') speechPlayer.onVisible()
})

const root = createRoot(document.getElementById('root')!)
root.render(
  <ErrorBoundary>
    <ToastProvider>
      <SettingsProvider>
        <LibraryProvider>
          <PlansProvider>
            <PlayerProvider>
              <App />
            </PlayerProvider>
          </PlansProvider>
        </LibraryProvider>
      </SettingsProvider>
    </ToastProvider>
  </ErrorBoundary>,
)

/* Register the service worker in production builds only (dev uses fresh assets). */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing
          sw?.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              /* A new version is waiting — the controllerchange listener reloads. */
            }
          })
        })
      })
      .catch(() => undefined)

    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return
      reloading = true
      window.location.reload()
    })
  })
}
