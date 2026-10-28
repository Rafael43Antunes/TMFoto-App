import sqlite3 from 'sqlite3'
import Store from 'electron-store'
import { app } from 'electron';
import path from 'path';

const StoreClass = (Store as any).default || Store
const store = new StoreClass()

let db: sqlite3.Database | null = null

export function iniciarBaseDados() {
    // 1. Pergunta à memória onde está a base de dados
    let dbPath = store.get('caminho_base_dados') as string
    
    // 2. Se for a primeira vez que abrimos a app, cria o ficheiro na pasta segura do sistema (AppData)
    if (!dbPath) {
        dbPath = path.join(app.getPath('userData'), 'tmfoto.db')
        store.set('caminho_base_dados', dbPath)
    }

    // 3. Liga o motor SQLite a esse ficheiro
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Erro ao abrir base de dados:', err.message)
        } else {
            console.log('Base de dados ligada com sucesso em:', dbPath)
            
            // 4. Cria as nossas tabelas
            db?.serialize(() =>{

                const tratarErro = (nomeTabela: string) => (err: Error | null) => {
                    if (err) console.error(`Erro na tabela ${nomeTabela}:`, err.message)
                }

                //Tabela de atletas
                db?.run(`
                    CREATE TABLE IF NOT EXISTS atletas (
                        numero_fpp INTEGER PRIMARY KEY,
                        nome TEXT NOT NULL,
                        clube TEXT NOT NULL,
                        associacao TEXT NOT NULL,
                        email TEXT,
                        telemovel TEXT,
                        data_apagado TEXT
                    )
                `, tratarErro('atletas'))

                //Tabela de Torneios
                db?.run(`
                    CREATE TABLE IF NOT EXISTS torneios(
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        nome TEXT NOT NULL,
                        data_evento TEXT,
                        data_criacao TEXT NOT NULL,
                        caminho_pasta TEXT,
                        estado TEXT DEFAULT 'aberto',
                        data_apagado TEXT
                    ) 
                `, tratarErro('torneios'))

                db?.run(`ALTER TABLE torneios ADD COLUMN data_apagado TEXT`, (err) => {
                    // Se o SQLite reclamar que a coluna já existe, nós ignoramos pacificamente
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('Erro na migração dos torneios:', err.message)
                    } else if (!err) {
                        console.log('Migração: Coluna data_apagado adicionada aos torneios com sucesso.')
                    }
                })

                //Tabela de pedidos
                db?.run(`
                    CREATE TABLE IF NOT EXISTS pedidos(
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        torneio_id INTEGER NOT NULL,
                        numero_fpp INTEGER,
                        nome TEXT,
                        clube TEXT,
                        associacao TEXT,
                        email TEXT,
                        telemovel TEXT,
                        escalao TEXT,
                        tipo_pedido TEXT,
                        podio BOOLEAN DEFAULT 0,
                        valor_final REAL NOT NULL,
                        estado TEXT DEFAULT 'pendente',
                        data_criacao TEXT NOT NULL,
                        FOREIGN KEY (torneio_id) REFERENCES torneios (id)
                    ) 
                `, tratarErro('pedidos'))

                const adicionarColunas = [
                    "ALTER TABLE pedidos ADD COLUMN caminho_pasta_atleta TEXT;",
                    "ALTER TABLE pedidos ADD COLUMN link_drive TEXT;",
                    "ALTER TABLE pedidos ADD COLUMN drive_folder_id TEXT;",
                    "ALTER TABLE pedidos ADD COLUMN data_envio TEXT;"
                ];

                adicionarColunas.forEach(query => {
                    db.run(query, (err) => {
                        // É normal dar erro se a coluna já existir, por isso ignoramos silenciosamente
                        if (err && !err.message.includes("duplicate column name")) {
                        console.error("Erro ao adicionar coluna:", err.message);
                        }
                    });
                });

                db?.run(`
                    CREATE TABLE IF NOT EXISTS precos(
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        nome_pedido TEXT NOT NULL,
                        valor_padrao REAL NOT NULL
                    )       
                `, (err) => {
                    tratarErro('precos')(err)
                    if (!err) console.log('Todas as tabelas verificadas/criadas com sucesso.')
                })

                db?.run(`ALTER TABLE pedidos ADD COLUMN data_apagado TEXT`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('Erro na migração dos pedidos:', err.message)
                    } else if (!err) {
                        console.log('✅ Migração: Coluna data_apagado adicionada aos pedidos com sucesso.')
                    }
                })
            })
        }
    })

    return db
}

// Função para obter o caminho atual (útil para mostrarmos nas configurações mais tarde)
export function getCaminhoBD() {
    return store.get('caminho_base_dados') as string
}