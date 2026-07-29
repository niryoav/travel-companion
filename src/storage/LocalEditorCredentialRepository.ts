import type { EditorCredentialRepository } from './EditorCredentialRepository'

const EDITOR_TOKEN_KEY = 'travel-companion:editor-token'

export class LocalEditorCredentialRepository
implements EditorCredentialRepository {
  private sessionToken: string | null = null

  constructor(private readonly storage: Storage) {}

  loadToken(): string | null {
    try {
      const token = this.storage.getItem(EDITOR_TOKEN_KEY)
      if (token?.trim()) {
        this.sessionToken = token
      }
    } catch {
      // Retain only the current in-memory credential when storage fails.
    }
    return this.sessionToken
  }

  storeToken(token: string): void {
    if (!token.trim()) {
      return
    }
    this.sessionToken = token
    try {
      this.storage.setItem(EDITOR_TOKEN_KEY, token)
    } catch {
      // The credential remains usable in this process.
    }
  }

  clearToken(): void {
    this.sessionToken = null
    try {
      this.storage.removeItem(EDITOR_TOKEN_KEY)
    } catch {
      // In-memory access is still cleared.
    }
  }
}
