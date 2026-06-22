import type { DesktopBridge, DesktopStateChangedEvent } from '@/types/desktop'
import { kurisuDesktopChannels } from '@/types/ipc.generated'

type Envelope = {
  id: string
  command: 'Post' | 'Get'
  data?: unknown
  version: 2
  requestId?: string
}

type GetResponsePayload = {
  requestId: string
  success: boolean
  data?: string
  error?: string
}

type InfiniFrameHostBridge = {
  postData?: (envelope: Envelope | string) => void
  receiveCallback?: (callback: (message: string) => void) => unknown
  getDataAsync?: (envelope: Envelope | string) => Promise<string>
}

type HostWindow = Window & {
  infiniframe?: {
    host?: InfiniFrameHostBridge
  }
}

const ENVELOPE_VERSION = 2 as const
const RESPONSE_ID = '__infiniframe:get:response'
const OPEN_EXTERNAL_ID = '__infiniframe:open:external'
const HOST_WINDOW = window as HostWindow
const EVENT_HANDLERS = new Map<string, Set<(payload: unknown) => void>>()
const PENDING_REQUESTS = new Map<string, { resolve: (value: unknown) => void; reject: (reason: Error) => void }>()

let receiverInstalled = false
let nextRequestId = 0

function ensureReceiver() {
  if (receiverInstalled) {
    return
  }
  receiverInstalled = true

  const host = HOST_WINDOW.infiniframe?.host
  if (!host) {
    console.warn('InfiniFrame host bridge is unavailable; running in local-only mode.')
    return
  }

  host.receiveCallback?.((raw: string) => {
    let envelope: Envelope
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!isEnvelope(parsed)) {
        return
      }
      envelope = parsed
    } catch {
      return
    }

    if (envelope.id === RESPONSE_ID) {
      handleGetResponse(envelope)
      return
    }

    const handlers = EVENT_HANDLERS.get(envelope.id)
    if (handlers && envelope.data !== undefined) {
      const payload = parseEnvelopeData(envelope.data)
      handlers.forEach((handler) => {
        try {
          handler(payload)
        } catch (error) {
          console.error('InfiniFrame event handler threw', envelope.id, error)
        }
      })
    }
  })
}

function isEnvelope(value: unknown): value is Envelope {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as { id?: unknown; version?: unknown }
  return (
    typeof candidate.id === 'string' &&
    candidate.version === ENVELOPE_VERSION
  )
}

function isGetResponsePayload(value: unknown): value is GetResponsePayload {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as { requestId?: unknown; success?: unknown }
  return (
    typeof candidate.requestId === 'string' &&
    typeof candidate.success === 'boolean'
  )
}

function handleGetResponse(envelope: Envelope) {
  if (envelope.data === undefined || envelope.data === null) {
    return
  }

  const response = isGetResponsePayload(envelope.data)
    ? envelope.data
    : parseEnvelopeData(envelope.data)
  if (!isGetResponsePayload(response)) {
    return
  }

  const pending = PENDING_REQUESTS.get(response.requestId)
  if (!pending) {
    return
  }
  PENDING_REQUESTS.delete(response.requestId)

  if (response.success) {
    const data = response.data
    pending.resolve(data === undefined || data === 'null' ? null : safeJsonParse(data))
  } else {
    pending.reject(new Error(response.error ?? 'Host returned an error.'))
  }
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function parseEnvelopeData(data: unknown): unknown {
  if (typeof data === 'string') {
    if (data === 'null') {
      return null
    }
    return safeJsonParse(data)
  }
  return data
}

function sendInvoke(id: string, payload: unknown): Promise<unknown> {
  const host = HOST_WINDOW.infiniframe?.host
  if (!host?.postData) {
    return Promise.reject(new Error('InfiniFrame host postData is unavailable.'))
  }

  ensureReceiver()
  const requestId = `if-req-${++nextRequestId}`

  return new Promise((resolve, reject) => {
    PENDING_REQUESTS.set(requestId, {
      resolve: (value) => resolve(value),
      reject: (error) => reject(error)
    })

    const envelope: Envelope = {
      id,
      command: 'Post',
      data: { requestId, payload: payload ?? null },
      version: ENVELOPE_VERSION
    }

    try {
      host.postData!(envelope)
    } catch (error) {
      PENDING_REQUESTS.delete(requestId)
      reject(error instanceof Error ? error : new Error(String(error)))
    }
  })
}

function subscribe<T>(id: string, callback: (payload: T) => void): () => void {
  ensureReceiver()
  const handlers =
    EVENT_HANDLERS.get(id) ?? new Set<(payload: unknown) => void>()
  const wrapped = callback as (payload: unknown) => void
  handlers.add(wrapped)
  EVENT_HANDLERS.set(id, handlers)

  return () => {
    handlers.delete(wrapped)
    if (handlers.size === 0) {
      EVENT_HANDLERS.delete(id)
    }
  }
}

const subscriptionChannels = new Set<string>([
  kurisuDesktopChannels.subscribeStateChanged,
  kurisuDesktopChannels.subscribeAuthChanged,
  kurisuDesktopChannels.subscribeSessionEvents,
  kurisuDesktopChannels.subscribeArenaEvents
])

const bridgeEntries = Object.entries(kurisuDesktopChannels).map(([methodName, channel]) => {
  if (subscriptionChannels.has(channel)) {
    return [methodName, (callback: (payload: unknown) => void) => subscribe(channel, callback)]
  }
  return [methodName, (payload?: unknown) => sendInvoke(channel, payload ?? null)]
})

const bridge = Object.fromEntries(bridgeEntries) as DesktopBridge
bridge.setLocale = (locale: string) =>
  sendInvoke(kurisuDesktopChannels.setLocale, { locale }) as Promise<DesktopStateChangedEvent>
bridge.openExternalUrl = (url: string) =>
  sendInvoke(OPEN_EXTERNAL_ID, { url })
    .then((result) => {
      if (!result || typeof result !== 'object') {
        return false
      }
      return Boolean((result as { opened?: boolean }).opened)
    })
    .catch(() => false)

window.kurisuDesktop = bridge
ensureExternalLinkInterception(bridge)

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
    if (!anchor) {
      return
    }

    const href = anchor.getAttribute('href') || (anchor as HTMLAnchorElement).href
    if (!isExternalUrl(href)) {
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
