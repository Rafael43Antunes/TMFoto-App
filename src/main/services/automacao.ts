import sqlite3 from 'sqlite3';
import path from 'path';
import { processarUploadAtleta } from './googleDrive';

let isProcessando = false;

export function iniciarTratorUploads(db: sqlite3.Database) {
  console.log('[Trator] Sistema de automacao iniciado! A espera de ordens...');

  setInterval(async () => {
    // Se ainda estiver a processar o ciclo anterior, ignora este aviso e espera.
    if (isProcessando) return; 

    isProcessando = true; // Tranca a porta!

    try {
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

      // 1. LER DA BASE DE DADOS (ESPERA ATÉ TER A RESPOSTA)
      const pedidos: any[] = await new Promise((resolve, reject) => {
        db.all(query, [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      if (pedidos.length === 0) {
        isProcessando = false;
        return; // Sai em silêncio se não houver trabalho
      }

      console.log(`\n[Trator] Encontrados ${pedidos.length} pedidos pendentes! A iniciar trabalhos...`);

      // 2. PROCESSAR CADA PEDIDO SEQUENCIALMENTE
      for (const pedido of pedidos) {
        try {
          const caminhoLocalCompleto = path.join(pedido.torneio_caminho, pedido.caminho_pasta_atleta);
          const nomePastaCloud = `${pedido.torneio_nome} - ${pedido.nome}`;

          console.log(`[Trator] Upload para o pedido ID ${pedido.id} (${pedido.nome})...`);

          const resultadoUpload = await processarUploadAtleta(caminhoLocalCompleto, nomePastaCloud);

          if (resultadoUpload.sucesso) {
            const dataEnvio = new Date().toISOString();
            
    
            const updateQuery = `
              UPDATE pedidos 
              SET link_drive = ?, drive_folder_id = ?, data_envio = ?
              WHERE id = ?
            `;
            
            //3 ATUALIZAR A BASE DE DADOS (ESPERA PELA CONFIRMAÇÃO)
            await new Promise<void>((resolveUpdate, rejectUpdate) => {
              db.run(updateQuery, [resultadoUpload.link, resultadoUpload.idPasta, dataEnvio, pedido.id], (updateErr) => {
                if (updateErr) {
                  console.error(`[Trator] Erro a atualizar BD (ID ${pedido.id}):`, updateErr.message);
                  rejectUpdate(updateErr);
                } else {
                  console.log(`[Trator] Sucesso! Link guardado (ID ${pedido.id}).`);
                  resolveUpdate();
                }
              });
            });

          } else {
            console.error(`[Trator] Falha no Drive (ID ${pedido.id}):`, resultadoUpload.erro);
          }

        } catch (erroGeral) {
          console.error(`[Trator] Erro grave no pedido ID ${pedido.id}:`, erroGeral);
        }
      }

    } catch (erroQuery) {
      console.error('[Trator] Erro na query principal:', erroQuery);
    } finally {
      //4 DESTRANCAR A PORTA (Aconteça o que acontecer, com sucesso ou erro, a porta é destrancada no fim)
      isProcessando = false;
    }

  }, 10 * 1000); 
}