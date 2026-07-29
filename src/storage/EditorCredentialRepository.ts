export interface EditorCredentialRepository {
  loadToken(): string | null
  storeToken(token: string): void
  clearToken(): void
}
