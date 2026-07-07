interface GoogleCredentialResponse {
  credential: string
  select_by: string
}

interface GoogleButtonConfig {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  width?: number
  text?: string
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
}

interface GoogleAccountsId {
  initialize: (config: { client_id: string; callback: (r: GoogleCredentialResponse) => void; auto_select?: boolean }) => void
  renderButton: (parent: HTMLElement, config: GoogleButtonConfig) => void
  prompt: () => void
  cancel: () => void
}

interface Window {
  google?: {
    accounts: {
      id: GoogleAccountsId
    }
  }
}
