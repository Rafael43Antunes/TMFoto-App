import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getAtletas: () => Promise<any[]>
      addAtleta: (dados: any) => Promise<{ success: boolean; message?: string }>
    }
  }
}
