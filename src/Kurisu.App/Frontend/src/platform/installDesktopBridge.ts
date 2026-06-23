import type { DesktopBridge, DesktopStateChangedEvent } from '@/types/desktop'
import { kurisuDesktopChannels } from '@/types/ipc.generated'

declare global {
  interface Window {
    require: (module: 'electron') => {
      ipcRenderer: {
        send: (channel: string, ...args: unknown[]) => void
        invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
        on: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void
        once: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void
        removeListener: (channel: string, listener: (...args: unknown[]) => void) => void
      }
    }
  }
}

const { ipcRenderer } = window.require('electron')

const REPLY_SUFFIX = ':reply'
const OPEN_EXTERNAL_CHANNEL = '__kurisu:open-external'

const subscriptionChannels = new Set<string>([
  kurisuDesktopChannels.subscribeStateChanged,
  kurisuDesktopChannels.subscribeAuthChanged,
  kurisuDesktopChannels.subscribeSessionEvents,
  kurisuDesktopChannels.subscribeArenaEvents
])

function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const replyChannel = channel + REPLY_SUFFIX

    let settled = false
    const cleanup = () => {
      ipcRenderer.removeListener(replyChannel, onReply)
    }

    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(`IPC timeout: ${channel}`))
    }, 10_000)

    const onReply = (_event: unknown, raw: unknown) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      cleanup()

      const text = typeof raw === 'string' ? raw : JSON.stringify(raw ?? null)
      try {
        resolve(JSON.parse(text) as T)
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    }

    ipcRenderer.once(replyChannel, onReply)
    ipcRenderer.send(channel, payload === undefined ? null : JSON.stringify(payload))
  })
}

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const handler = (_event: unknown, raw: unknown) => {
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw ?? null)
    try {
      callback(JSON.parse(text) as T)
    } catch (error) {
      console.error('Failed to parse IPC payload for', channel, error)
    }
  }
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const bridgeEntries = Object.entries(kurisuDesktopChannels).map(([methodName, channel]) => {
  if (subscriptionChannels.has(channel)) {
    return [methodName, (callback: (payload: unknown) => void) => subscribe(channel, callback)]
  }
  return [methodName, (payload?: unknown) => invoke(channel, payload ?? null)]
})

const bridge = Object.fromEntries(bridgeEntries) as DesktopBridge
bridge.setLocale = (locale: string) =>
  invoke<DesktopStateChangedEvent>(kurisuDesktopChannels.setLocale, { locale })

bridge.openExternalUrl = (url: string) =>
  invoke<{ opened: boolean }>(OPEN_EXTERNAL_CHANNEL, { url })
    .then((result) => result?.opened ?? false)
    .catch(() => false)

ensureExternalLinkInterception(bridge)

export function installDesktopBridge(): void {
  window.kurisuDesktop = bridge
  ensureExternalLinkInterception(bridge)
}

function ensureExternalLinkInterception(activeBridge: DesktopBridge) {
  const isExternalUrl = (value: string) => {
    try {
      const url = new URL(value, window.location.href)
      return ['http:', 'https:', 'mailto:'].includes(url.protocol)
    } catch {
      return false
    }
  }

  const openExternal = (url: string) => {
    if (!isExternalUrl(url)) {
      return false
    }
    void activeBridge.openExternalUrl?.(url)
    return true
  }

  const handlePointerNavigation = (event: MouseEvent) => {
    const target = event.target
    const anchor =
      target && typeof (target as Element).closest === 'function'
        ? (target as Element).closest('a[href]')
        : null
    if (!anchor)
    {
      return
    }

    const href = anchor.getAttribute('href') || (anchor as HTMLAnchorElement).href
    if (!isExternalUrl(href))
    {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    openExternal(href)
  }

  window.addEventListener('click', handlePointerNavigation, true)
  window.addEventListener('auxclick', handlePointerNavigation, true)

  const originalOpen = window.open?.bind(window)
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    if (typeof url === 'string' && openExternal(url)) {
      return null
    }
    return originalOpen ? originalOpen(url, target, features) : null
  }) as typeof window.open
}