import nodemailer from 'nodemailer';
import Store from 'electron-store';

// Inicializa a store
const StoreClass = (Store as any).default || Store;
const store = new StoreClass();

export async function enviarEmailComLink(emailDestino: string, nomeAtleta: string, nomeTorneio: string, linkDrive: string) {
  try {
    // Vai buscar as credenciais à memória da aplicação
    const emailUser = store.get('email_user') as string;
    const emailPass = store.get('email_pass') as string;

    if (!emailUser || !emailPass) {
      console.log('[Email] Falha: Credenciais não estão configuradas na Store.');
      return { sucesso: false, erro: 'Falta configurar o email nas definições.' };
    }

    // Cria o motor de envio com as credenciais do teu pai
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    //corpo do email
    const mailOptions = {
      from: `"TM Foto" <${emailUser}>`, 
      to: emailDestino,
      subject: `📸 As tuas fotos do ${nomeTorneio} já estão disponíveis!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #1e293b; text-align: center;">Olá!</h2>
          
          <p style="color: #475569; font-size: 16px; line-height: 1.6; text-align: center;">
            As fotografias do atleta <strong>${nomeAtleta}</strong> referentes ao torneio <strong>${nomeTorneio}</strong> já estão prontas e carregadas na cloud em alta qualidade!
          </p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${linkDrive}" style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);">
              Aceder às Fotografias
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; text-align: center;">
            Basta clicar no botão acima para abrir a pasta no Google Drive, onde podes ver e transferir as tuas fotos originais.
          </p>
          
          <p style="color: #ef4444; font-size: 13px; font-weight: bold; text-align: center; margin-top: 15px;">⚠️ Atenção: Este link ficará disponível apenas durante 7 dias. Por favor, transfere as tuas fotografias o mais breve possível.</p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
          
          <p style="color: #475569; font-size: 15px; font-weight: bold; text-align: center; margin-bottom: 20px;">
            Obrigado por confiares no nosso trabalho!
          </p>

          <p style="color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.5;">
            <strong style="color: #64748b; font-size: 13px;">TM Foto</strong><br>
            <a href="https://www.instagram.com/tmfoto_sport/" target="_blank" style="color: #3b82f6; text-decoration: none; font-weight: bold;">Instagram</a> &bull; 
            <span style="color: #64748b;">+351 910 334 154</span>
          </p>
        </div>
      `
    };

    // 4. Envia!
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Sucesso! Email enviado para ${emailDestino}. ID: ${info.messageId}`);
    return { sucesso: true };
    
  } catch (erro) {
    console.error(`[Email] Erro ao enviar email para ${emailDestino}:`, erro);
    return { sucesso: false, erro };
  }
}