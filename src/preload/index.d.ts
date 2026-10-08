import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getAtletas: () => Promise<any[]>
      getAtletasApagados: () => Promise<any[]>
      addAtleta: (atleta: any) => Promise<{success: boolean, message?: string}>
      updateAtleta: (atleta: any) => Promise<{success: boolean, message?: string}>
      softDeleteAtleta: (numero_fpp: number) => Promise<{success: boolean}>
      restoreAtleta: (numero_fpp: number) => Promise<{success: boolean}>

      importarExcel: () => Promise<any>
    }
  }
}
