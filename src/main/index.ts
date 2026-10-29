import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { iniciarBaseDados, getCaminhoBD } from './database'
import fs from 'fs'
import path from 'path'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { iniciarTratorUploads, iniciarCamiaoDoLixo } from './services/automacao'
import { iniciarWhatsApp, getStatusWhatsApp } from './services/whatsapp'

import Store from 'electron-store'

import * as xlsx from 'xlsx'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    title: 'TM Foto',
    icon: icon,
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

  iniciarTratorUploads(db)
  iniciarCamiaoDoLixo(db)
  


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

      const clubeFinal = atleta.clube && atleta.clube.trim() !== '' ? atleta.clube.trim() : ''
      const assocFinal = atleta.associacao && atleta.associacao.trim() !== '' ? atleta.associacao.trim() : ''

      db.run(query, [
        atleta.numero_fpp || null, 
        atleta.nome, 
        clubeFinal, 
        assocFinal, 
        atleta.email || '', 
        atleta.telemovel || ''
      ], function (err) {
        if (err) {
          console.error('[ERRO] Falha ao adicionar atleta:', err.message)
          resolve({ success: false, message: err.message })
        } else {
          console.log('[SUCESSO] Novo atleta gravado na DB global!')
          resolve({ success: true })
        }
      })
    })
  })

  ipcMain.handle('update-atleta', (_, atleta) => {
    return new Promise((resolve) => {
      const query = `UPDATE atletas SET nome = ?, clube = ?, associacao = ?, email = ?, telemovel = ? WHERE numero_fpp = ?`

      const clubeFinal = atleta.clube && atleta.clube.trim() !== '' ? atleta.clube.trim() : ''
      const assocFinal = atleta.associacao && atleta.associacao.trim() !== '' ? atleta.associacao.trim() : ''

      db.run(query, [
        atleta.nome, 
        clubeFinal, 
        assocFinal, 
        atleta.email || '', 
        atleta.telemovel || '', 
        atleta.numero_fpp
      ], function (err) {
        if (err) {
          console.error('[ERRO] Falha ao atualizar atleta:', err.message)
          resolve({ success: false, message: err.message })
        } else {
          resolve({ success: true })
        }
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
      const { id, nome, data_evento, caminho_pasta} = dadosTorneio
      
      const query = `UPDATE torneios SET nome = ?, data_evento = ?, caminho_pasta = ? WHERE id = ?`
      const valores = [nome, data_evento, caminho_pasta, id]

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

  ipcMain.handle('hard-delete-torneio', async (event, id) => {
    return new Promise((resolve) => {
      db.run(`DELETE FROM pedidos WHERE torneio_id = ?`, [id], (err) => {
        if (err) console.error("Erro ao limpar pedidos do torneio:", err)
        
        db.run(`DELETE FROM torneios WHERE id = ?`, [id], function(err2) {
          if (err2) resolve({ sucesso: false, erro: err2.message })
          else resolve({ sucesso: true })
        })
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
      email, telemovel, escalao, tipo_pedido, podio, valor_final,
      caminho_pasta_atleta 
    } = dados
      
      const data_criacao = new Date().toISOString()
      const associacaoFinal = associacao && associacao.trim() !== '' ? associacao : null

      const query = `
        INSERT INTO pedidos (
          torneio_id, numero_fpp, nome, clube, associacao, 
          email, telemovel, escalao, tipo_pedido, podio, valor_final, data_criacao,
          caminho_pasta_atleta
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      
      // O ternário (podio ? 1 : 0) converte o boolean do React para número do SQLite
      const valores = [
        torneio_id, numero_fpp, nome, clube, associacao, 
        email, telemovel, escalao, tipo_pedido, podio ? 1 : 0, valor_final, data_criacao, caminho_pasta_atleta || null
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
      
      // 1. Atualiza o estado do pedido
      db.run(`UPDATE pedidos SET estado = ? WHERE id = ?`, [estado, id], function(err) {
        if (err) {
          console.error('Erro ao atualizar estado do pedido:', err)
          resolve({ sucesso: false, erro: err.message })
          return
        }
        
        // 2. Descobrir a que torneio este pedido pertence
        db.get(`SELECT torneio_id FROM pedidos WHERE id = ?`, [id], (err, row: any) => {
          if (err || !row || !row.torneio_id) {
            resolve({ sucesso: true }) // Falha silenciosa na auto-gestão, mas o pedido atualizou
            return
          }

          const torneioId = row.torneio_id

          if (estado === 'concluido') {
            const checkQuery = `SELECT COUNT(*) as pendentes FROM pedidos WHERE torneio_id = ? AND estado = 'pendente'`
            
            db.get(checkQuery, [torneioId], (err, res: any) => {
              if (res && res.pendentes === 0) {
                // A condição AND estado != 'concluido' garante que só devolvemos true na primeira vez que fecha!
                db.run(`UPDATE torneios SET estado = 'concluido' WHERE id = ? AND estado != 'apagado' AND estado != 'concluido'`, [torneioId], function() {
                  if (this.changes > 0) {
                    // Avisa o Frontend que o torneio foi fechado NESTE exato momento!
                    resolve({ sucesso: true, torneioAutoConcluido: true })
                  } else {
                    resolve({ sucesso: true })
                  }
                })
              } else {
                resolve({ sucesso: true })
              }
            })
          } else if (estado === 'pendente') {
            //Se revertemos um pedido para pendente, o torneio tem de voltar a reabrir
            db.run(`UPDATE torneios SET estado = 'aberto' WHERE id = ? AND estado = 'concluido'`, [torneioId], () => {
              resolve({ sucesso: true })
            })
          } else {
            resolve({ sucesso: true })
          }
        })
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
        email, telemovel, escalao, tipo_pedido, podio, valor_final,
        caminho_pasta_atleta 
      } = dados
      
      const query = `
        UPDATE pedidos SET
          numero_fpp = ?, nome = ?, clube = ?, associacao = ?, 
          email = ?, telemovel = ?, escalao = ?, tipo_pedido = ?, 
          podio = ?, valor_final = ?, caminho_pasta_atleta = ?
        WHERE id = ?
      `
      const valores = [
        numero_fpp, nome, clube, associacao, 
        email, telemovel, escalao, tipo_pedido, podio ? 1 : 0, valor_final,
        caminho_pasta_atleta, id
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

  ipcMain.handle('get-pedidos-apagados', async (event, torneioId) => {
    return new Promise((resolve) => {
      const query = `SELECT * FROM pedidos WHERE torneio_id = ? AND estado = 'apagado' ORDER BY id ASC`
      db.all(query, [torneioId], (err, rows) => {
        if (err) resolve({ sucesso: false, erro: err.message, dados: [] })
        else resolve({ sucesso: true, dados: rows })
      })
    })
  })

  ipcMain.handle('restore-pedido', async (event, id) => {
    return new Promise((resolve) => {
      db.run(`UPDATE pedidos SET estado = 'pendente', data_apagado = NULL WHERE id = ?`, [id], function(err) {
        if (err) resolve({ sucesso: false, erro: err.message })
        else resolve({ sucesso: true })
      })
    })
  })

  ipcMain.handle('hard-delete-pedido', async (event, id) => {
    return new Promise((resolve) => {
      db.run(`DELETE FROM pedidos WHERE id = ?`, [id], function(err) {
        if (err) resolve({ sucesso: false, erro: err.message })
        else resolve({ sucesso: true })
      })
    })
  })

  // LIMPEZA AUTOMÁTICA 
  ipcMain.handle('limpar-reciclagem-automatica', async () => {
    return new Promise((resolve) => {
      // Calcula exatamente a data/hora de há 8 horas atrás
      const limite8Horas = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
      const limite7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const queryPedidos = `DELETE FROM pedidos WHERE estado = 'apagado' AND data_apagado <= ?`
      const queryTorneios = `DELETE FROM torneios WHERE estado = 'apagado' AND data_apagado <= ?`

      db.run(queryPedidos, [limite8Horas], (err1) => {
        if (err1) console.error("Erro a limpar pedidos antigos:", err1)
        db.run(queryTorneios, [limite7Dias], (err2) => {
          if (err2) console.error("Erro a limpar torneios antigos:", err2)
          resolve({ sucesso: true })
        })
      })
    })
  })

  //===================== Importar Torneios =======================

  // IMPORTAR DADOS DE TORNEIOS PASSADOS
ipcMain.handle('importar-excel-torneios', async () => {
    
    const executarQuery = (query: string, params: any[] = []): Promise<any> => {
        return new Promise((resolve, reject) => {
            db.run(query, params, function(err) {
                if (err) reject(err)
                else resolve(this)
            })
        })
    }

    try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Migrar Ficheiro Excel',
            filters: [{ name: 'Ficheiros Excel', extensions: ['xlsx', 'xls'] }],
            properties: ['openFile']
        })

        if (canceled || filePaths.length === 0) return { sucesso: false, erro: 'Operação cancelada' }

        const workbook = xlsx.readFile(filePaths[0])
        let torneiosCriados = 0
        let pedidosCriados = 0
        
        await executarQuery('BEGIN TRANSACTION')

        for (const sheetName of workbook.SheetNames) {
            if (sheetName.toLowerCase().includes('base de dados') || sheetName.toLowerCase().includes('folha')) continue;

            const folha = workbook.Sheets[sheetName]
            
            // Lemos tudo como uma grelha bruta (sem adivinhar cabeçalhos)
            const matriz = xlsx.utils.sheet_to_json(folha, { header: 1 }) as any[][]
            if (matriz.length === 0) continue;

            // 1. Procurar a linha que tem os cabeçalhos (a que contém a palavra 'nome')
            let rowIndexHeader = -1;
            for (let i = 0; i < matriz.length; i++) {
                const row = matriz[i];
                if (row && row.some(cell => typeof cell === 'string' && cell.toLowerCase().trim() === 'nome')) {
                    rowIndexHeader = i;
                    break;
                }
            }

            if (rowIndexHeader === -1) continue;

            const cabecalhos = matriz[rowIndexHeader].map(h => typeof h === 'string' ? h.toLowerCase().trim() : '')

            // 2. Descobrir em que posição exata está cada coluna
            const getIdx = (nomes: string[]) => cabecalhos.findIndex(c => nomes.includes(c));
            
            const idxFpp = getIdx(['número', 'numero', 'fpp']);
            const idxNome = getIdx(['nome', 'nome atleta']);
            const idxClube = getIdx(['clube']);
            const idxAssoc = getIdx(['associação', 'associacao', 'assoc']);
            const idxMail = getIdx(['mail', 'contacto']);
            const idxTel = getIdx(['telemovel', 'telemóvel', 'número telemóvel', 'tlm']);
            const idxEscalao = getIdx(['escalão', 'escalao', 'esca']);
            
            // Colunas financeiras e pódio
            const idxPen = getIdx(['pen cliente', 'pen']);
            const idxPatin = getIdx(['patin']);
            const idxEmailProd = getIdx(['email', 'e-mail']);
            const idxTratado = getIdx(['tratado']);

            const dataHoje = new Date().toISOString().split('T')[0]
            const dataCriacao = new Date().toISOString()

            // 3. Criar o Torneio
            const resultTorneio = await executarQuery(
                `INSERT INTO torneios (nome, data_evento, data_criacao, estado) VALUES (?, ?, ?, 'concluido')`, 
                [sheetName, dataHoje, dataCriacao]
            )
            const novoTorneioId = resultTorneio.lastID
            torneiosCriados++

            // 4. Ler os dados a partir da linha seguinte ao cabeçalho
            for (let i = rowIndexHeader + 1; i < matriz.length; i++) {
                const row = matriz[i]
                if (!row || row.length === 0) continue;

                const nome = idxNome !== -1 && row[idxNome] ? String(row[idxNome]).trim() : ''
                if (!nome) continue;

                // Proteção para FPP numéricos limpos
                const rawFpp = idxFpp !== -1 && row[idxFpp] ? row[idxFpp] : null
                const fpp = rawFpp ? parseInt(String(rawFpp), 10) : null
                
                const clube = idxClube !== -1 && row[idxClube] ? String(row[idxClube]).trim() : ''
                const associacao = idxAssoc !== -1 && row[idxAssoc] ? String(row[idxAssoc]).trim() : ''
                const emailContacto = idxMail !== -1 && row[idxMail] ? String(row[idxMail]).trim() : ''
                const telemovel = idxTel !== -1 && row[idxTel] ? String(row[idxTel]).trim() : ''
                const escalao = idxEscalao !== -1 && row[idxEscalao] ? String(row[idxEscalao]).trim() : ''
                
                // Converter os valores (substituindo vírgulas por pontos se necessário)
                const parsePreco = (val: any) => {
                    if (!val) return 0;
                    const num = parseFloat(String(val).replace(',', '.'));
                    return isNaN(num) ? 0 : num;
                }

                const valPen = idxPen !== -1 ? parsePreco(row[idxPen]) : 0;
                const valPatin = idxPatin !== -1 ? parsePreco(row[idxPatin]) : 0;
                const valEmail = idxEmailProd !== -1 ? parsePreco(row[idxEmailProd]) : 0;
                const valorCalculado = valPen + valPatin + valEmail;

                const tratado = idxTratado !== -1 && row[idxTratado] ? String(row[idxTratado]).toLowerCase() : ''
                const foiPodio = tratado.includes('podio') ? 1 : 0

                // Registar o Pedido com a Associação e Valores Financeiros!
                await executarQuery(
                    `INSERT INTO pedidos (torneio_id, numero_fpp, nome, clube, associacao, escalao, email, telemovel, estado, data_criacao, valor_final, podio) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'concluido', ?, ?, ?)`,
                    [novoTorneioId, fpp, nome, clube, associacao, escalao, emailContacto, telemovel, dataCriacao, valorCalculado, foiPodio]
                )
                pedidosCriados++

                // Registar Atleta (se já existir, é ignorado)
                await executarQuery(
                    `INSERT OR IGNORE INTO atletas (numero_fpp, nome, clube, associacao, email, telemovel) VALUES (?, ?, ?, ?, ?, ?)`,
                    [fpp, nome, clube, associacao, emailContacto, telemovel]
                )
            }
        }

        await executarQuery('COMMIT')
        return { sucesso: true, torneios: torneiosCriados, pedidos: pedidosCriados }

    } catch (error: any) {
        console.error('⚠️ Erro fatal na migração:', error)
        await executarQuery('ROLLBACK') 
        return { sucesso: false, erro: error.message }
    }
})

// ===================== ESTATÍSTICAS ===========================================
ipcMain.handle('get-estatisticas', async (event, filtros) => {
    return new Promise(async (resolve) => {
      let where = "estado != 'apagado'"
      let whereTorneioTop = "estado != 'apagado'"

      if (filtros?.torneioId && filtros.torneioId !== 'todos') {
          const tid = parseInt(filtros.torneioId)
          if (!isNaN(tid))
             where += ` AND torneio_id = ${tid}`
      }

      if (filtros?.periodo && filtros.periodo !== 'tudo') {
          const hoje = new Date()
          if (filtros.periodo === '1mes') hoje.setMonth(hoje.getMonth() - 1)
          else if (filtros.periodo === '6meses') hoje.setMonth(hoje.getMonth() - 6)
          else if (filtros.periodo === 'ano') hoje.setFullYear(hoje.getFullYear() - 1)

          const dataIso = hoje.toISOString()  
          where += ` AND data_criacao >= '${hoje.toISOString()}'`
          whereTorneioTop += ` AND data_criacao >= '${dataIso}'`
      }

      const whereP = where.replace(/estado/g, 'p.estado').replace(/torneio_id/g, 'p.torneio_id').replace(/data_criacao/g, 'p.data_criacao')
      const wherePTop = whereTorneioTop.replace(/estado/g, 'p.estado').replace(/torneio_id/g, 'p.torneio_id').replace(/data_criacao/g, 'p.data_criacao')

      // Função auxiliar para correr queries e devolver promessas
      const lerSQL = (query: string): Promise<any[]> => {
          return new Promise((res, rej) => db.all(query, [], (err, rows) => err ? rej(err) : res(rows)))
      }

      try {
          const totais = await lerSQL(`SELECT COALESCE(SUM(valor_final), 0) as faturado, COUNT(id) as pedidos FROM pedidos WHERE ${where}`)
          const topTorneios = await lerSQL(`SELECT t.nome, SUM(p.valor_final) as faturado, COUNT(p.id) as pedidos FROM torneios t JOIN pedidos p ON t.id = p.torneio_id WHERE ${whereP} GROUP BY t.id ORDER BY faturado DESC LIMIT 10`)
          const topClubes = await lerSQL(`SELECT clube as nome, COUNT(id) as pedidos, SUM(valor_final) as faturado FROM pedidos WHERE ${where} AND clube != '' AND clube IS NOT NULL GROUP BY clube ORDER BY pedidos DESC LIMIT 10`)
          const topAtletas = await lerSQL(`SELECT nome, COUNT(id) as pedidos, SUM(valor_final) as faturado FROM pedidos WHERE ${where} AND nome != '' AND nome IS NOT NULL GROUP BY nome ORDER BY faturado DESC LIMIT 10`)

          const faturacaoMensal = await lerSQL(`
              SELECT strftime('%m/%Y', data_criacao) as mes, SUM(valor_final) as total 
              FROM pedidos 
              WHERE ${where} 
              GROUP BY strftime('%Y-%m', data_criacao) 
              ORDER BY data_criacao ASC 
              LIMIT 12
          `)

          const tiposPedido = await lerSQL(`
              SELECT tipo_pedido as name, COUNT(id) as value 
              FROM pedidos 
              WHERE ${where} AND tipo_pedido != '' AND tipo_pedido IS NOT NULL 
              GROUP BY tipo_pedido 
              ORDER BY value DESC
          `)


          resolve({
              sucesso: true,
              dados: {
                  totalFaturado: totais[0]?.faturado || 0,
                  totalPedidos: totais[0]?.pedidos || 0,
                  topTorneios,
                  topClubes,
                  topAtletas,
                  faturacaoMensal,
                  tiposPedido
              }
          })
      } catch (err: any) {
          resolve({ sucesso: false, erro: err.message })
      }
    })
  })

  // =================== ENVIOSSSS ============================

  ipcMain.handle('get-envios-pendentes', async () => {
    return new Promise((resolve) => {
      const query = `
        SELECT 
          p.id, p.numero_fpp, p.nome, p.email, p.telemovel, 
          p.link_drive, p.email_enviado, p.whatsapp_enviado, 
          p.estado, p.data_criacao, p.data_envio,
          p.caminho_pasta_atleta, p.torneio_id, p.erro_processamento, 
          t.nome as torneio_nome
        FROM pedidos p
        JOIN torneios t ON p.torneio_id = t.id
        WHERE p.estado = 'pendente' 
          AND LOWER(p.tipo_pedido) LIKE '%email%' 
        ORDER BY p.data_criacao DESC
      `
      db.all(query, [], (err, rows) => {
        if (err) resolve({ sucesso: false, erro: err.message, dados: [] })
        else resolve({ sucesso: true, dados: rows })
      })
    })
  })

  ipcMain.handle('get-envios-concluidos', async () => {
    return new Promise((resolve) => {
      const query = `
        SELECT 
          p.id, p.numero_fpp, p.nome, p.email, p.telemovel, 
          p.link_drive, p.email_enviado, p.whatsapp_enviado, 
          p.estado, p.data_criacao, p.data_envio,
          p.caminho_pasta_atleta, p.torneio_id, p.erro_processamento,
          t.nome as torneio_nome
        FROM pedidos p
        JOIN torneios t ON p.torneio_id = t.id
        WHERE p.estado = 'concluido' 
          AND LOWER(p.tipo_pedido) LIKE '%email%' 
        ORDER BY p.data_criacao DESC
      `
      db.all(query, [], (err, rows) => {
        if (err) resolve({ sucesso: false, erro: err.message, dados: [] })
        else resolve({ sucesso: true, dados: rows })
      })
    })
  })

  //======================== whatsapp
  ipcMain.handle('get-whatsapp-status', async () => {
    return getStatusWhatsApp()
  })

  // ================== Definições
  const StoreClass = (Store as any).default || Store
  const store = new StoreClass()

  ipcMain.handle('get-config', async () => {
    return {
      emailUser: store.get('email_user') || '',
      emailPass: store.get('email_pass') || ''
    }
  })

  ipcMain.handle('set-config', async (_, dados) => {
    try {
      if (dados.emailUser !== undefined) store.set('email_user', dados.emailUser.trim())
      if (dados.emailPass !== undefined) store.set('email_pass', dados.emailPass.trim())
      return { sucesso: true }
    } catch (err: any) {
      console.error('Erro ao guardar configurações:', err)
      return { sucesso: false, erro: err.message }
    }
  })

  //================================================================
  createWindow()

  const janelaPrincipal = BrowserWindow.getAllWindows()[0]

  iniciarWhatsApp(janelaPrincipal)

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0){
      createWindow()
      const novaJanela = BrowserWindow.getAllWindows()[0]
      iniciarWhatsApp(novaJanela)
    } 
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
