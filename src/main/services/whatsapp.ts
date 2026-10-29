import { Client, LocalAuth } from 'whatsapp-web.js';
import { BrowserWindow } from 'electron';

// Variáveis globais para guardar o estado do nosso robô
let client: Client | null = null;
let isReady = false;
let qrCodeData = '';

export function iniciarWhatsApp(mainWindow: BrowserWindow) {
    console.log('[WhatsApp] A iniciar o motor do WhatsApp...');

    // Inicializamos o cliente com o LocalAuth para ele guardar a sessão.
    client = new Client({
        authStrategy: new LocalAuth({ dataPath: 'whatsapp_session' }),
        puppeteer: {
            headless: true, // true = Chrome invisível
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Evita conflitos no Electron
        }
    });

    let qrJaMostrado = false;

    // Evento 1: A Google gerou o QR Code
    client.on('qr', (qr) => {
        if (!qrJaMostrado) {
            console.log('[WhatsApp] QR Code gerado! A aguardar leitura no ecrã...');
            qrJaMostrado = true;
        }
        qrCodeData = qr;
        isReady = false;
        // Envia o QR Code cru para o Frontend desenhar
        mainWindow.webContents.send('whatsapp-qr', qr);
    });

    // Evento 2: O telemóvel leu o código com sucesso
    client.on('ready', () => {
        console.log('[WhatsApp] Telemóvel emparelhado. Motor pronto a disparar!');
        isReady = true;
        qrCodeData = ''; // Limpa o código antigo
        qrJaMostrado = false;
        mainWindow.webContents.send('whatsapp-ready');
    });

    // Evento 3: O telemóvel ficou sem internet ou a sessão expirou
    client.on('disconnected', (motivo) => {
        console.log('[WhatsApp] Desligado:', motivo);
        isReady = false;
        mainWindow.webContents.send('whatsapp-disconnected');
    });

    client.initialize();
}

export async function enviarMensagemWhatsApp(numeroTelemovel: string, mensagem: string) {
    if (!client || !isReady) {
        return { sucesso: false, erro: 'O WhatsApp não está ligado.' };
    }

    try {
        // O WhatsApp Web exige um formato específico: indicativo + numero + "@c.us"
        // Vamos limpar espaços e garantir o prefixo de Portugal (+351) se ele não existir
        let numeroLimpo = numeroTelemovel.replace(/\s+/g, '');
        if (!numeroLimpo.startsWith('+')) {
            numeroLimpo = '+351' + numeroLimpo;
        }
        
        // Remove o "+" e adiciona o sufixo mágico do WhatsApp
        const numeroFormatado = numeroLimpo.substring(1) + '@c.us';

        await client.sendMessage(numeroFormatado, mensagem);
        return { sucesso: true };
        
    } catch (erro: any) {
        console.error('[WhatsApp] Erro ao enviar mensagem:', erro);
        return { sucesso: false, erro: erro.message };
    }
}

export function getStatusWhatsApp() {
    return { isReady, qrCodeData };
}