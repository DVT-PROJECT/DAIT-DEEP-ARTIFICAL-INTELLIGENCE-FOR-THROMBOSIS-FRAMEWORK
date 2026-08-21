export const AUTH_CHANGED_EVENT = 'dait:auth_changed'

export function emitAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

