import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';


const CLIENT_ID = (import.meta.env as any).VITE_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = (import.meta.env as any).VITE_GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = (import.meta.env as any).VITE_GOOGLE_REFRESH_TOKEN || process.env.VITE_GOOGLE_REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

/* Criar a pasta no google drive e devolver o link*/

async function criarPastaPartilhada(nomePasta: string) {
  const resposta = await drive.files.create({
    requestBody: {
      name: nomePasta,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id, webViewLink',
  });

  const pastaId = resposta.data.id;
  if (!pastaId) throw new Error('Falha ao criar pasta no Drive.');

  // Tornar a pasta visível para quem tiver o link
  await drive.permissions.create({
    fileId: pastaId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  return { id: pastaId, link: resposta.data.webViewLink };
}

/* Ler o ficheiro em disco e envia-lo para dentro da pasta partilhada */

async function fazerUploadFicheiro(caminhoLocal: string, pastaDestinoId: string) {
  const nomeFicheiro = path.basename(caminhoLocal);
  const ext = path.extname(nomeFicheiro).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

  const resposta = await drive.files.create({
    requestBody: {
      name: nomeFicheiro,
      parents: [pastaDestinoId],
    },
    media: {
      mimeType: mimeType,
      body: fs.createReadStream(caminhoLocal), // Lê o ficheiro em pedaços para não esgotar a RAM
    },
    fields: 'id',
  });

  return resposta.data.id;
}

/* Função principal */

export async function processarUploadAtleta(caminhoPastaLocal: string, nomePastaCloud: string) {
  try {
    console.log(`\n--- A iniciar processo para: ${nomePastaCloud} ---`);
    
    //1 Validar se a pasta local existe
    if (!fs.existsSync(caminhoPastaLocal)) {
      throw new Error(`A pasta local não existe: ${caminhoPastaLocal}`);
    }

    //2 Criar a pasta na Cloud
    console.log('1. A criar pasta pública no Google Drive...');
    const pastaCloud = await criarPastaPartilhada(nomePastaCloud);
    console.log(`Pasta criada com sucesso! Link: ${pastaCloud.link}`);

    // 3. Ler as fotografias do disco local
    console.log('2. A ler ficheiros locais...');
    const ficheiros = fs.readdirSync(caminhoPastaLocal);
    const fotos = ficheiros.filter(f => f.match(/\.(jpg|jpeg|png)$/i));
    
    if (fotos.length === 0) {
      throw new Error('Não foram encontradas fotografias nesta pasta.');
    }

    console.log(`Foram encontradas ${fotos.length} fotos. A iniciar upload...`);

    //4 Fazer upload uma a uma (Usa-se um ciclo para evitar bloquear a API da Google com demasiados pedidos em simultâneo)
    let concluidos = 0;
    for (const foto of fotos) {
      const caminhoCompleto = path.join(caminhoPastaLocal, foto);
      await fazerUploadFicheiro(caminhoCompleto, pastaCloud.id);
      concluidos++;
      console.log(` - Upload ${concluidos}/${fotos.length}: ${foto}`);
    }

    console.log(` Processo concluído para ${nomePastaCloud}!`);
    return { sucesso: true, link: pastaCloud.link, idPasta: pastaCloud.id, fotosEnviadas: fotos.length };

  } catch (erro: any) {
    console.error(' Erro no processo de Upload:', erro);
    return { sucesso: false, erro: erro.message };
  }
}

export async function apagarPastaCloud(idPasta: string) {
  try {
    await drive.files.delete({ fileId: idPasta });
    return true;
  } catch (erro) {
    console.error(`[Drive] Erro ao apagar pasta ${idPasta}:`, erro);
    return false;
  }
}

