import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { iniciarBaseDados, getCaminhoBD } from './database'
import fs from 'fs'
import path from 'path'

import { GoogleGenerativeAI } from '@google/generative-ai'

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

  // ===================== BASE DE DADOS ATLETAS ===========================================
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

  //=================== FOTOS HOME ======================================
  ipcMain.handle('get-fotos-slideshow', async () => {
    try {
      const caminhoBD = getCaminhoBD()
      const pastaSlideshow = path.join(path.dirname(caminhoBD), 'slideshow')

      if (!fs.existsSync(pastaSlideshow)) {
        fs.mkdirSync(pastaSlideshow, { recursive: true })
      }

      const ficheiros = fs.readdirSync(pastaSlideshow)
      const extensoesValidas = ['.jpg', '.jpeg', '.png', '.webp']
      
      const fotos = ficheiros
        .filter(f => extensoesValidas.includes(path.extname(f).toLowerCase()))
        .slice(0, 50)
        .map(foto => {
          const caminhoFicheiro = path.join(pastaSlideshow, foto)
          const base64Data = fs.readFileSync(caminhoFicheiro).toString('base64')
          const ext = path.extname(foto).toLowerCase().replace('.', '')
          const mimeType = ext === 'jpg' ? 'jpeg' : ext
          return `data:image/${mimeType};base64,${base64Data}`
        })

      return fotos
    } catch (err) {
      console.error('Erro ao ler pasta das fotos:', err)
      return []
    }
  })

  ipcMain.handle('abrir-pasta-slideshow', async () => {
    const caminhoBD = getCaminhoBD()
    const pastaSlideshow = path.join(path.dirname(caminhoBD), 'slideshow')
    
    if (!fs.existsSync(pastaSlideshow)) {
      fs.mkdirSync(pastaSlideshow, { recursive: true })
    }
    
    shell.openPath(pastaSlideshow)
  })

  //=============================== PDF Com IA PASTAS =================================================
  ipcMain.handle('escolher-pdf', async (event) => {
    const janelaAtiva = BrowserWindow.fromWebContents(event.sender)

    const { canceled, filePaths } = await dialog.showOpenDialog(janelaAtiva!, {
      title: 'Selecionar Ordem de Saída',
      properties: ['openFile'],
      filters: [{ name: 'Ficheiros PDF', extensions: ['pdf'] }]
    })

    if (canceled || filePaths.length === 0) return null
    return filePaths[0]
  })

  ipcMain.handle('processar-pdf', async (event, caminhoPdf) => {
    try {
      /*const chave = (import.meta.env as any).VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  
      const resposta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${chave}`);
      const dados = await resposta.json();
      console.log("OS MEUS MODELOS SÃO:", dados.models ? dados.models.map((m: any) => m.name) : dados);*/

      // 1. Lê o ficheiro a partir do caminho que o React enviou
      const pdfBuffer = fs.readFileSync(caminhoPdf)
      
      const pdfPart = {
        inlineData: {
          data: pdfBuffer.toString('base64'),
          mimeType: 'application/pdf'
        }
      }

      // 2. Inicializa a IA
      const genAI = new GoogleGenerativeAI((import.meta.env as any).VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY)
      
      // Mudámos para o modelo PRO, que é mais robusto e não dá o erro 404
      const model = genAI.getGenerativeModel({
        model: 'gemini-flash-latest', 
        generationConfig: { 
          responseMimeType: 'application/json' 
        }
      })

      const prompt = `
        És um especialista em extração de dados desportivos. Vais ler um PDF com a ordem de saída de um torneio de Patinagem Artística.
        Agrupa os atletas pelo seu escalão. Descobre também o dia da prova para cada escalão (ex: "Dia 1", "Dia 2", "Sábado", "Domingo"). Se não encontrares, usa "Dia 1".
        
        Devolve APENAS um array JSON exato com esta estrutura (sem markdown, sem \`\`\`json):
        [
          {
            "nome": "Nome do Escalão",
            "dia": "Dia 1",
            "atletas": [
              { "ordem": 1, "nome": "Nome do Atleta", "clube": "Sigla" }
            ]
          }
        ]
      `

      // 3. Pede a extração à IA
      const result = await model.generateContent([prompt, pdfPart])
      let respostaIA = result.response.text()

      respostaIA = respostaIA.replace(/```json/g, '').replace(/```/g, '').trim()

      return JSON.parse(respostaIA)

    } catch (err) {
      console.error('Erro na extração com IA:', err)
      return null
    }
  })

  ipcMain.handle('gerar-pastas-disco', async (event, escaloes) => {
    try {
      // 1. Pede ao utilizador para escolher a pasta raiz do Torneio (no disco externo)
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Escolher pasta de destino para as fotos do Torneio',
        properties: ['openDirectory']
      })

      if (canceled || filePaths.length === 0) return { sucesso: false, cancelado: true }

      const pastaDestino = filePaths[0]

      escaloes.forEach((escalao: any, indexEsc: number) => {
        const numEsc = String(indexEsc + 1).padStart(2, '0') // Ex: "01", "02"
        const nomeEscLimpo = escalao.nome.replace(/[<>:"/\\|?*]+/g, '').trim()
        const pastaEscalao = `${numEsc} ${nomeEscLimpo}` // "01 Iniciação"

        // Ordena os atletas pela ordem de saída para garantir a sequência
        const atletasOrdenados = [...escalao.atletas].sort((a, b) => a.ordem - b.ordem)

        atletasOrdenados.forEach((atleta, indexAtl) => {
          const numAtl = String(indexAtl + 1).padStart(2, '0') // Ex: "01", "02"
          const nomeAtlLimpo = atleta.nome.replace(/[<>:"/\\|?*]+/g, '').trim()
          const pastaAtleta = `${numAtl} ${nomeAtlLimpo}` // "01 Nome do Atleta"

          // Estrutura Final: Destino / Dia / 01 Escalão / 01 Nome Atleta
          const caminho = path.join(pastaDestino, escalao.dia, pastaEscalao, pastaAtleta)
          
          if (!fs.existsSync(caminho)) {
            fs.mkdirSync(caminho, { recursive: true })
          }
        })
      })

      return { sucesso: true, caminho: pastaDestino }
    } catch (err) {
      console.error('Erro ao gerar pastas:', err)
      return { sucesso: false, erro: err }
    }
  })

  // ============================= TORNEIOS ==============================
  ipcMain.handle('get-torneios', async () => {
    return new Promise((resolve) =>{
      const query = `
        SELECT 
          t.*, 
          COUNT(p.id) as pedidos, 
          COALESCE(SUM(p.valor_final), 0) as faturado 
        FROM torneios t
        LEFT JOIN pedidos p ON t.id = p.torneio_id AND p.estado != 'apagado'
        WHERE t.estado != 'apagado' 
        GROUP BY t.id 
        ORDER BY t.id DESC
      `

      db.all(query, [], (err, rows) => {
        if(err){
          console.error('Erro ao ler torneios:', err)
          resolve({sucesso: false, erro: err.message, dados: []} )
        }else{
          resolve({sucesso: true, dados: rows })
        }
      })
    })
  })

  ipcMain.handle('add-torneio', async (event, novoTorneio) => {
    return new Promise((resolve) => {
      const { nome, data_evento, data_criacao, caminho_pasta } = novoTorneio
      
      const query = `
        INSERT INTO torneios (nome, data_evento, data_criacao, caminho_pasta, estado) 
        VALUES (?, ?, ?, ?, ?)
      `
      
      const valores = [nome, data_evento, data_criacao, caminho_pasta, 'aberto']

      db.run(query, valores, function (err) {
        if (err) {
          console.error('Erro ao inserir torneio:', err)
          resolve({ sucesso: false, erro: err.message })
        } else {
          resolve({ sucesso: true, id: this.lastID })
        }
      })
    })
  })

  ipcMain.handle('soft-delete-torneio', async (event, id) => {
    return new Promise((resolve) => {
      // Usamos a data ISO para saber exatamente quando foi apagado (para os 7 dias)
      const dataApagado = new Date().toISOString()
      const query = `UPDATE torneios SET data_apagado = ?, estado = 'apagado' WHERE id = ?`
      const valores = [dataApagado, id]

      console.log('--- A EXECUTAR APAGAR TORNEIO ---')
      console.log('ID do torneio:', id)

      db.run(query, valores, function (err) {
        if (err) {
          console.error('Erro ao apagar torneio:', err)
          resolve({ sucesso: false, erro: err.message })
        } else {
          resolve({ sucesso: true })
        }
      })
    })
  })

  ipcMain.handle('update-torneio', async (event, dadosTorneio) => {
    return new Promise((resolve) => {
      const { id, nome, data_evento } = dadosTorneio
      
      const query = `UPDATE torneios SET nome = ?, data_evento = ? WHERE id = ?`
      const valores = [nome, data_evento, id]

      console.log('--- A EXECUTAR ATUALIZAR TORNEIO ---')
      console.log('Novos dados:', dadosTorneio)

      db.run(query, valores, function (err) {
        if (err) {
          console.error('Erro ao atualizar torneio:', err)
          resolve({ sucesso: false, erro: err.message })
        } else {
          resolve({ sucesso: true })
        }
      })
    })
  })

  ipcMain.handle('get-torneios-apagados', async () => {
    return new Promise((resolve) => {
      db.all(`SELECT * FROM torneios WHERE estado = 'apagado' ORDER BY id DESC`, [], (err, rows) => {
        if (err) {
          console.error('Erro ao ler torneios apagados:', err)
          resolve({ sucesso: false, erro: err.message, dados: [] })
        } else {
          resolve({ sucesso: true, dados: rows })
        }
      })
    })
  })

  ipcMain.handle('restore-torneio', async (event, id) => {
    return new Promise((resolve) => {
      const query = `UPDATE torneios SET data_apagado = NULL, estado = 'aberto' WHERE id = ?`
      db.run(query, [id], function (err) {
        if (err) {
          console.error('Erro ao restaurar torneio:', err)
          resolve({ sucesso: false, erro: err.message })
        } else {
          resolve({ sucesso: true })
        }
      })
    })
  })

  // ========================== PREÇOS ========================

  // LER TODOS OS PREÇOS
  ipcMain.handle('get-precos', async () => {
    return new Promise((resolve) => {
      db.all(`SELECT * FROM precos ORDER BY id ASC`, [], (err, rows) => {
        if (err) {
          console.error('Erro ao ler preços:', err)
          resolve({ sucesso: false, erro: err.message, dados: [] })
        } else {
          resolve({ sucesso: true, dados: rows })
        }
      })
    })
  })

  // ADICIONAR NOVO PREÇO
  ipcMain.handle('add-preco', async (event, dados) => {
    return new Promise((resolve) => {
      const { nome_pedido, valor_padrao } = dados
      db.run(
        `INSERT INTO precos (nome_pedido, valor_padrao) VALUES (?, ?)`, 
        [nome_pedido, valor_padrao], 
        function (err) {
          if (err) {
            console.error('Erro ao adicionar preço:', err)
            resolve({ sucesso: false, erro: err.message })
          } else {
            resolve({ sucesso: true, id: this.lastID })
          }
      })
    })
  })

  // ATUALIZAR UM PREÇO EXISTENTE
  ipcMain.handle('update-preco', async (event, dados) => {
    return new Promise((resolve) => {
      const { id, nome_pedido, valor_padrao } = dados
      db.run(
        `UPDATE precos SET nome_pedido = ?, valor_padrao = ? WHERE id = ?`, 
        [nome_pedido, valor_padrao, id], 
        function (err) {
          if (err) {
            console.error('Erro ao atualizar preço:', err)
            resolve({ sucesso: false, erro: err.message })
          } else {
            resolve({ sucesso: true })
          }
      })
    })
  })

  // APAGAR UM PREÇO
  ipcMain.handle('delete-preco', async (event, id) => {
    return new Promise((resolve) => {
      db.run(`DELETE FROM precos WHERE id = ?`, [id], function (err) {
        if (err) {
          console.error('Erro ao apagar preço:', err)
          resolve({ sucesso: false, erro: err.message })
        } else {
          resolve({ sucesso: true })
        }
      })
    })
  })

  // ============= PEDIDOS DE TORNEIO =====================

  ipcMain.handle('get-pedidos', async (event, torneioId) => {
      return new Promise((resolve) => {
        const query = `SELECT * FROM pedidos WHERE torneio_id = ? AND estado != 'apagado' ORDER BY id ASC`

        db.all(query, [torneioId], (err, rows) => {
          if (err) {
            console.error('Erro ao ler pedidos:', err)
            resolve({ sucesso: false, erro: err.message, dados: [] })
          } else {
            resolve({ sucesso: true, dados: rows })
          }
        })
      })
  })

  ipcMain.handle('add-pedido', async (event, dados) => {
    return new Promise((resolve) => {
      const { 
        torneio_id, numero_fpp, nome, clube, associacao, 
        email, telemovel, escalao, tipo_pedido, podio, valor_final 
      } = dados
      
      const data_criacao = new Date().toISOString()

      const query = `
        INSERT INTO pedidos (
          torneio_id, numero_fpp, nome, clube, associacao, 
          email, telemovel, escalao, tipo_pedido, podio, valor_final, data_criacao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      
      // O ternário (podio ? 1 : 0) converte o boolean do React para número do SQLite
      const valores = [
        torneio_id, numero_fpp, nome, clube, associacao, 
        email, telemovel, escalao, tipo_pedido, podio ? 1 : 0, valor_final, data_criacao
      ]

      db.run(query, valores, function(err) {
        if (err) {
          console.error('Erro ao adicionar pedido:', err)
          resolve({ sucesso: false, erro: err.message })
        } else {
          resolve({ sucesso: true, id: this.lastID })
        }
      })
    })
  })

  // ATUALIZAR ESTADO DO PEDIDO (Pendente <-> Concluído)
  ipcMain.handle('update-estado-pedido', async (event, dados) => {
    return new Promise((resolve) => {
      const { id, estado } = dados
      db.run(`UPDATE pedidos SET estado = ? WHERE id = ?`, [estado, id], function(err) {
        if (err) {
          console.error('Erro ao atualizar estado do pedido:', err)
          resolve({ sucesso: false, erro: err.message })
        } else {
          resolve({ sucesso: true })
        }
      })
    })
  })

  // SOFT DELETE DO PEDIDO 
  ipcMain.handle('soft-delete-pedido', async (event, id) => {
    return new Promise((resolve) => {
      const dataApagado = new Date().toISOString()
      db.run(`UPDATE pedidos SET estado = 'apagado', data_apagado = ? WHERE id = ?`, [dataApagado, id], function(err) {
        if (err) {
          console.error('Erro ao apagar pedido:', err)
          resolve({ sucesso: false, erro: err.message })
        } else {
          resolve({ sucesso: true })
        }
      })
    })
  })

  ipcMain.handle('update-pedido', async (event, dados) => {
    return new Promise((resolve) => {
      const { 
        id, numero_fpp, nome, clube, associacao, 
        email, telemovel, escalao, tipo_pedido, podio, valor_final 
      } = dados
      
      const query = `
        UPDATE pedidos SET
          numero_fpp = ?, nome = ?, clube = ?, associacao = ?, 
          email = ?, telemovel = ?, escalao = ?, tipo_pedido = ?, 
          podio = ?, valor_final = ?
        WHERE id = ?
      `
      const valores = [
        numero_fpp, nome, clube, associacao, 
        email, telemovel, escalao, tipo_pedido, podio ? 1 : 0, valor_final, id
      ]

      db.run(query, valores, function(err) {
        if (err) {
          console.error('Erro ao atualizar pedido:', err)
          resolve({ sucesso: false, erro: err.message })
        } else {
          resolve({ sucesso: true })
        }
      })
    })
  })

  //===================== Importar Torneios =======================

  ipcMain.handle('importar-torneios', async (event) => {
    return new Promise(async (resolve) => {
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openFile'],
          filters: [{ name: 'Ficheiros Excel', extensions: ['xlsx', 'xls'] }]
        })

        if (result.canceled || result.filePaths.length === 0) {
          return resolve({ sucesso: false, erro: 'Operação cancelada' })
        }

        const caminhoFicheiro = result.filePaths[0]
        const workbook = xlsx.readFile(caminhoFicheiro)
        const nomesFolhas = workbook.SheetNames

        const folhasTorneios = nomesFolhas.filter(nome => 
          nome !== 'Base de Dados' && !nome.toLowerCase().startsWith('folha')
        )

        let dataFalsa = new Date('2026-10-10') 

        for (const nomeTorneio of folhasTorneios) {
          const dataStr = dataFalsa.toISOString().split('T')[0] 
          
          await new Promise((resDB, rejDB) => {
            const query = `INSERT INTO torneios (nome, data_evento, data_criacao, estado) VALUES (?, ?, ?, ?)`
            const valores = [nomeTorneio, dataStr, new Date().toISOString(), 'concluido']
            
            db.run(query, valores, (err) => {
              if (err) rejDB(err)
              else resDB(true)
            })
          })

          dataFalsa.setDate(dataFalsa.getDate() - 7)
        }

        resolve({ sucesso: true, quantidade: folhasTorneios.length })

      } catch (error: any) {
        console.error('Erro na importação:', error)
        resolve({ sucesso: false, erro: error.message })
      }
    })
  })

  //================================================================
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
