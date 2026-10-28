import sqlite3 from 'sqlite3';
import path from 'path';
import { processarUploadAtleta } from './googleDrive';

let isProcessando = false;

export function iniciarTratorUploads(db: sqlite3.Database) {
  console.log('Trator de Automação iniciado! À espera de ordens...');

  // O setInterval faz o código correr repetidamente (ex: a cada 1 minuto = 60000ms)
  setInterval(async () => {
    if (isProcessando) return; 

    isProcessando = true;

    // 1. Procurar pedidos pendentes do tipo 'email' (juntando os dados do torneio)
    const query = `
      SELECT 
        p.id, p.nome, p.caminho_pasta_atleta, p.tipo_pedido,
        t.caminho_pasta as torneio_caminho,
        t.nome as torneio_nome
      FROM pedidos p
      JOIN torneios t ON p.torneio_id = t.id
      WHERE p.estado = 'pendente' 
        AND p.link_drive IS NULL 
        AND p.caminho_pasta_atleta IS NOT NULL 
        AND p.caminho_pasta_atleta != '' 
        AND LOWER(p.tipo_pedido) LIKE '%email%'
    `;

    const pedidos: any[] = await new Promise((resolve, reject) => {
        db.all(query, [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

    db.all(query, [], async (err, pedidos: any[]) => {
      if (err) {
        console.error('[Trator] Erro ao ler BD:', err.message);
        return;
      }

      if (pedidos.length === 0) {
        isProcessando = false;
        return; 
      }

      console.log(`[Trator] Encontrados ${pedidos.length} pedidos pendentes! A iniciar trabalhos...`);

      //Processar um atleta de cada vez 
      for (const pedido of pedidos) {
        try {
          if (!pedido.caminho_pasta_atleta) {
            console.log(`Pedido ID ${pedido.id} não tem caminho definido. A ignorar...`);
            continue; 
          }

          //Junta a Raiz do Torneio com a Pasta do Atleta (Ex: "E:\Torneios\Aveiro" + "\01 Iniciacao\05 Rafa")
          const caminhoLocalCompleto = path.join(pedido.torneio_caminho, pedido.caminho_pasta_atleta);
          const nomePastaCloud = `${pedido.torneio_nome} - ${pedido.nome}`;

          console.log(`\n[Trator] A iniciar Upload para o pedido ID ${pedido.id} (${pedido.nome})...`);

          const resultadoUpload = await processarUploadAtleta(caminhoLocalCompleto, nomePastaCloud);

          //Se o upload correr bem, grava na Base de Dados!
          if (resultadoUpload.sucesso) {
            const dataEnvio = new Date().toISOString();
            const updateQuery = `
              UPDATE pedidos 
              SET link_drive = ?, drive_folder_id = ?, data_envio = ?, estado = 'concluido' 
              WHERE id = ?
            `;
            
            // ATENÇÃO: Mais tarde vamos mudar o estado para 'concluido' só depois do WhatsApp.
            // Para já, testamos a primeira etapa (Upload completo).
            db.run(updateQuery, [resultadoUpload.link, resultadoUpload.idPasta, dataEnvio, pedido.id], (updateErr) => {
              if (updateErr) {
                console.error(`Erro a atualizar BD para o ID ${pedido.id}:`, updateErr.message);
              } else {
                console.log(`Pedido ID ${pedido.id} fechado! Link guardado.`);
              }
            });
          } else {
            console.error(`Falha no Drive para o pedido ID ${pedido.id}:`, resultadoUpload.erro);
          }

        } catch (erroGeral) {
          console.error(`Erro grave no pedido ID ${pedido.id}:`, erroGeral);
        }
      }
    });
  }, 10 * 1000); 
}