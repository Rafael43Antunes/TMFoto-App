import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { iniciarBaseDados } from './database';

import * as xlsx from 'xlsx'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
 

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const db = iniciarBaseDados()

  ipcMain.handle('get-atletas', async () => {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM atletas WHERE data_apagado IS NULL ORDER BY associacao ASC, clube ASC, numero_fpp ASC'
        db.all(query, [], (err, rows) => {
          if (err) reject(err)
          else resolve(rows)
        })
      })
  })

  ipcMain.handle('get-atletas-apagados', () => {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM atletas WHERE data_apagado IS NOT NULL ORDER BY associacao ASC, clube ASC, numero_fpp ASC'
      db.all(query, [], (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
  })
  

  ipcMain.handle('add-atleta', (_, atleta) => {
    return new Promise((resolve) => {
      const query = `INSERT INTO atletas (numero_fpp, nome, clube, associacao, email, telemovel) VALUES (?, ?, ?, ?, ?, ?)`
      db.run(query, [atleta.numero_fpp, atleta.nome, atleta.clube, atleta.associacao, atleta.email, atleta.telemovel], function (err) {
        if (err) resolve({ success: false, message: err.message })
        else resolve({ success: true })
      })
    })
  })

  ipcMain.handle('update-atleta', (_, atleta) => {
    return new Promise((resolve) => {
      const query = `UPDATE atletas SET nome = ?, clube = ?, associacao = ?, email = ?, telemovel = ? WHERE numero_fpp = ?`
      db.run(query, [atleta.nome, atleta.clube, atleta.associacao, atleta.email, atleta.telemovel, atleta.numero_fpp], function (err) {
        if (err) resolve({ success: false, message: err.message })
        else resolve({ success: true })
      })
    })
  })

  ipcMain.handle('soft-delete-atleta', (_, numero_fpp) => {
    return new Promise((resolve) => {
      const data_hoje = new Date().toLocaleDateString('pt-PT')
      db.run(`UPDATE atletas SET data_apagado = ? WHERE numero_fpp = ?`, [data_hoje, numero_fpp], function (err) {
        if (err) resolve({ success: false })
        else resolve({ success: true })
      })
    })
  })

  ipcMain.handle('restore-atleta', (_, numero_fpp) => {
    return new Promise((resolve) => {
      db.run(`UPDATE atletas SET data_apagado = NULL WHERE numero_fpp = ?`, [numero_fpp], function (err) {
        if (err) resolve({ success: false })
        else resolve({ success: true })
      })
    })
  })

  ipcMain.handle('importar-excel', async () => {
    // 1. Abre a janela do Windows para escolher o ficheiro
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Selecionar Ficheiro Excel',
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile']
    })

    if (canceled || filePaths.length === 0) return { success: false, message: 'Cancelado' }

    try {
      // 2. Lê o ficheiro e a primeira folha
      const workbook = xlsx.readFile(filePaths[0])
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      
      // 3. Converte para uma matriz (array de arrays) para ler por colunas (0=FPP, 1=Nome, ...)
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
      
      let importados = 0

      // Função para inserir um atleta de cada vez
      const insertAtleta = (row: any[]) => {
        return new Promise((resolve) => {
          const fpp = parseInt(row[0])
          if (isNaN(fpp)) return resolve(false) // Ignora linhas sem nº FPP válido

          // Mapeia as colunas
          const nome = row[1] ? String(row[1]).trim() : ''
          const clube = row[2] ? String(row[2]).trim() : ''
          const associacao = row[3] ? String(row[3]).trim() : ''
          const email = row[5] ? String(row[5]).trim() : ''
          const telemovel = row[6] ? String(row[6]).trim() : ''

          // O INSERT OR REPLACE atualiza o atleta se o FPP já existir, ou cria se for novo
          const query = `INSERT OR REPLACE INTO atletas (numero_fpp, nome, clube, associacao, email, telemovel, data_apagado) VALUES (?, ?, ?, ?, ?, ?, NULL)`
          db.run(query, [fpp, nome, clube, associacao, email, telemovel], (err) => {
            if (err) resolve(false)
            else resolve(true)
          })
        })
      }

      // 4. Percorre as linhas e insere
      for (const row of data) {
        if (row && row.length >= 4) { // Garante que a linha tem dados mínimos
          const sucesso = await insertAtleta(row)
          if (sucesso) importados++
        }
      }

      return { success: true, importados }
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
