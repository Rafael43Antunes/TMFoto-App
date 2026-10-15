import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getAtletas: () => ipcRenderer.invoke('get-atletas'),
  getAtletasApagados: () => ipcRenderer.invoke('get-atletas-apagados'),
  addAtleta: (atleta) => ipcRenderer.invoke('add-atleta', atleta),
  updateAtleta: (atleta) => ipcRenderer.invoke('update-atleta', atleta),
  softDeleteAtleta: (numero_fpp) => ipcRenderer.invoke('soft-delete-atleta', numero_fpp),
  restoreAtleta: (numero_fpp) => ipcRenderer.invoke('restore-atleta', numero_fpp),

  importarExcel: () => ipcRenderer.invoke('importar-excel'),

  getFotosSlideshow: () => ipcRenderer.invoke('get-fotos-slideshow'),
  abrirPastaSlideshow: () => ipcRenderer.invoke('abrir-pasta-slideshow'),

  escolherPdf: () => ipcRenderer.invoke('escolher-pdf'),
  processarPdf: (caminho) => ipcRenderer.invoke('processar-pdf', caminho),
  gerarPastasDisco: (dados) => ipcRenderer.invoke('gerar-pastas-disco', dados),

  getTorneios: () => ipcRenderer.invoke('get-torneios'),
  addTorneio: (torneio: any) => ipcRenderer.invoke('add-torneio', torneio),
  softDeleteTorneio: (id: number) => ipcRenderer.invoke('soft-delete-torneio', id),
  updateTorneio: (dados: any) => ipcRenderer.invoke('update-torneio', dados),
  getTorneiosApagados: () => ipcRenderer.invoke('get-torneios-apagados'),

  //Preços
  getPrecos: () => ipcRenderer.invoke('get-precos'),
  addPreco: (dados: any) => ipcRenderer.invoke('add-preco', dados),
  updatePreco: (dados: any) => ipcRenderer.invoke('update-preco', dados),
  deletePreco: (id: number) => ipcRenderer.invoke('delete-preco', id),

  getPedidos: (torneioId: number) => ipcRenderer.invoke('get-pedidos', torneioId),

  importarTorneios: () => ipcRenderer.invoke('importar-torneios')
}

// O RESTO DO TEU FICHEIRO MANTÉM-SE IGUAL:
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}