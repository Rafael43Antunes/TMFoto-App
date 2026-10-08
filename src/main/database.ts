import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

// Define o caminho para o ficheiro da BD (no Windows fica em AppData/Roaming/tmfoto)
const dbPath = path.join(app.getPath('userData'), 'tmfoto.db');
const db = new Database(dbPath, { verbose: console.log });

export function initDB() {
  const createTables = `
    CREATE TABLE IF NOT EXISTS associacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clubes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      associacao_id INTEGER,
      FOREIGN KEY (associacao_id) REFERENCES associacoes (id)
    );

    CREATE TABLE IF NOT EXISTS atletas (
      numero_fpp INTEGER PRIMARY KEY,
      nome TEXT NOT NULL,
      clube_id INTEGER,
      email TEXT,
      telemovel TEXT,
      FOREIGN KEY (clube_id) REFERENCES clubes (id)
    );

    CREATE TABLE IF NOT EXISTS torneios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      torneio_id INTEGER,
      numero_fpp INTEGER,
      escalao TEXT,
      tipo TEXT NOT NULL,
      valor REAL,
      enviar_email BOOLEAN,
      estado TEXT DEFAULT 'Pendente',
      FOREIGN KEY (torneio_id) REFERENCES torneios (id),
      FOREIGN KEY (numero_fpp) REFERENCES atletas (numero_fpp)
    );
  `;

  db.exec(createTables);
  console.log('Base de dados inicializada em:', dbPath);
}

export default db;