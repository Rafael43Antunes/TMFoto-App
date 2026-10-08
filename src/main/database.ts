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
            console.log('✅ Base de dados ligada com sucesso em:', dbPath)
            
            // 4. Cria a tabela relacional com o Soft Delete (data_apagado)
            const query = `
                CREATE TABLE IF NOT EXISTS atletas (
                    numero_fpp INTEGER PRIMARY KEY,
                    nome TEXT NOT NULL,
                    clube TEXT NOT NULL,
                    associacao TEXT NOT NULL,
                    email TEXT,
                    telemovel TEXT,
                    data_apagado TEXT
                )
            `
            db?.run(query, (err) => {
                if (err) console.error('Erro ao criar tabela de atletas:', err.message)
                else console.log('✅ Tabela de atletas verificada/criada.')
            })
        }
    })

    return db
}

// Função para obter o caminho atual (útil para mostrarmos nas configurações mais tarde)
export function getCaminhoBD() {
    return store.get('caminho_base_dados') as string
}