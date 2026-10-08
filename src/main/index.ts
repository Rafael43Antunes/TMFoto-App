import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDB } from './database';

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

   initDB();

  ipcMain.handle('get-atletas', () => {
    // Usamos LEFT JOIN caso algum atleta por erro não tenha clube associado
    const stmt = db.prepare(`
      SELECT atletas.*, clubes.nome as nome_clube 
      FROM atletas 
      LEFT JOIN clubes ON atletas.clube_id = clubes.id
      ORDER BY atletas.numero_fpp ASC
    `);
    return stmt.all();
  })

  ipcMain.handle('add-atleta', (_, atletaData) => {
    const {numero_fpp, nome, associacao, clube, email, telemovel} = atletaData;

    try{
      // 1. Garantir que a Associação existe
      db.prepare('INSERT OR IGNORE INTO associacoes (nome) VALUES (?)').run(associacao);
      const assocRow = db.prepare('SELECT id FROM associacoes WHERE nome = ?').get(associacao) as {id: number};
      const assocID= assocRow.id;

      // 2. Garantir que o Clube existe e está ligado à Associação
      db.prepare('INSERT OR IGNORE INTO clubes (nome, associacao_id) VALUES (?, ?)').run(clube, assocId);
      const clubeRow = db.prepare('SELECT id FROM clubes WHERE nome = ? AND associacao_id = ?').get(clube, assocId) as { id: number };
      const clubeId = clubeRow.id;
      // 3. Inserir atleta
      db.prepare(`
        INSERT INTO atletas (numero_fpp, nome, clube_id, email, telemovel) 
        VALUES (?, ?, ?, ?, ?)
      `).run(numero_fpp, nome, clubeId, email, telemovel);

      return { success: true };
    } catch (error: any) {
      // Retorna erro, por exemplo, se o número FPP já estiver registado
      return { success: false, message: error.message };
    }

  });

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
