import sqlite3 from 'sqlite3';
import path from 'path';
import { processarUploadAtleta } from './googleDrive';
import { enviarEmailComLink } from './email';

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
          p.id, p.nome, p.email, p.caminho_pasta_atleta, p.tipo_pedido,
          p.link_drive, p.email_enviado, p.whatsapp_enviado, p.erro_processamento,
          t.caminho_pasta as torneio_caminho,
          t.nome as torneio_nome
        FROM pedidos p
        JOIN torneios t ON p.torneio_id = t.id
        WHERE p.estado = 'pendente' 
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
          let linkDriveAtual = pedido.link_drive;

          // ETAPA 1: GOOGLE DRIVE
          if (!linkDriveAtual) {
            if (!pedido.caminho_pasta_atleta) continue; // Fica à espera que o caminho seja corrigido
            
            const caminhoLocalCompleto = path.join(pedido.torneio_caminho, pedido.caminho_pasta_atleta);
            const nomePastaCloud = `${pedido.torneio_nome} - ${pedido.nome}`;
            
            console.log(`[Trator] FASE 1: Upload para o pedido ID ${pedido.id} (${pedido.nome})...`);
            const resultadoUpload = await processarUploadAtleta(caminhoLocalCompleto, nomePastaCloud);

            if (resultadoUpload.sucesso) {
              linkDriveAtual = resultadoUpload.link;
              const dataEnvio = new Date().toISOString();
              
              await new Promise<void>((resolve, reject) => {
                db.run(`UPDATE pedidos SET link_drive = ?, drive_folder_id = ?, data_envio = ?, erro_processamento = NULL WHERE id = ?`, 
                  [resultadoUpload.link, resultadoUpload.idPasta, dataEnvio, pedido.id], 
                  (err) => err ? reject(err) : resolve()
                );
              });
              console.log(`[Trator] FASE 1 OK! Link guardado.`);
            } else {
             const msgErro = typeof resultadoUpload.erro === 'string' ? resultadoUpload.erro : 'Erro ao carregar ficheiros para o Google Drive.';
              await new Promise<void>((resolve) => {
                db.run(`UPDATE pedidos SET erro_processamento = ? WHERE id = ?`, [`Erro Drive: ${msgErro}`, pedido.id], () => resolve());
              });
              continue; // Se falhou a Cloud, não avança para o Email neste ciclo
            }
          }

          // ETAPA 2: EMAIL
          let emailEnviadoAtual = pedido.email_enviado;
          
          if (linkDriveAtual && !emailEnviadoAtual) {
            if (!pedido.email) {
              console.log(`[Trator] FASE 2: Pedido ID ${pedido.id} não tem email definido! À espera...`);
            } else {
              console.log(`[Trator] FASE 2: A enviar Email para ${pedido.email}...`);
              const resultadoEmail = await enviarEmailComLink(pedido.email, pedido.nome, pedido.torneio_nome, linkDriveAtual);

              if (resultadoEmail.sucesso) {
                emailEnviadoAtual = 1;
                await new Promise<void>((resolve, reject) => {
                  db.run(`UPDATE pedidos SET email_enviado = 1, erro_processamento = NULL WHERE id = ?`, [pedido.id], 
                    (err) => err ? reject(err) : resolve()
                  );
                });
                console.log(`[Trator] FASE 2 OK! Email disparado.`);
              } else {
                 const msgErro = resultadoEmail.erro || 'Falha na autenticação ou servidor de email.';
                 await new Promise<void>((resolve) => {
                   db.run(`UPDATE pedidos SET erro_processamento = ? WHERE id = ?`, [`Erro Email: ${msgErro}`, pedido.id], () => resolve());
                 });
                 continue;
              }
            }
          }

          // ETAPA 3: WHATSAPP 
          if (emailEnviadoAtual && !pedido.whatsapp_enviado) {
             // ...
          }

        } catch (erroPedido: any) {
          await new Promise<void>((resolve) => {
            db.run(`UPDATE pedidos SET erro_processamento = ? WHERE id = ?`, [`Erro Crítico: ${erroPedido.message}`, pedido.id], () => resolve());
          });
        }
      }

    } catch (erroQuery) {
      console.error('[Trator] Erro na query principal:', erroQuery);
    } finally {
      isProcessando = false; // Destranca a porta no fim do ciclo
    }

  }, 10 * 1000); 
}