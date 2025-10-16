const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

class WhatsAppUltraService {
    constructor() {
        // Configuração otimizada do Puppeteer baseada no estudo
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: "barbearia-nativa-ultra",
                dataPath: "./auth_info_whatsapp-ultra"
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-field-trial-config',
                    '--disable-back-forward-cache',
                    '--disable-ipc-flooding-protection',
                    '--no-default-browser-check',
                    '--disable-default-apps',
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-images',
                    '--disable-javascript',
                    '--disable-plugins-discovery',
                    '--disable-preconnect',
                    '--disable-translate',
                    '--disable-sync',
                    '--hide-scrollbars',
                    '--mute-audio',
                    '--no-first-run',
                    '--safebrowsing-disable-auto-update',
                    '--disable-client-side-phishing-detection',
                    '--disable-component-extensions-with-background-pages',
                    '--disable-default-apps',
                    '--disable-features=TranslateUI',
                    '--disable-ipc-flooding-protection'
                ],
                ignoreDefaultArgs: ['--disable-extensions'],
                timeout: 60000,
                protocolTimeout: 60000,
                defaultViewport: {
                    width: 1366,
                    height: 768
                }
            },
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
            }
        });

        this.isReady = false;
        this.isConnecting = false;
        this.isInitialized = false;
        this.currentQRCode = null;
        this.currentPairingCode = null;
        this.user = null;
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = 3;
        this.reconnectInterval = null;
        
        this.setupEvents();
    }

    setupEvents() {
        this.client.on('qr', async (qr) => {
            console.log('📱 QR Code gerado - Escaneie com seu WhatsApp');
            this.currentQRCode = qr;
            await this.saveQRCode(qr);
        });

        this.client.on('ready', async () => {
            console.log('✅ WhatsApp Web conectado e pronto!');
            this.isReady = true;
            this.isConnecting = false;
            this.isInitialized = true;
            this.connectionAttempts = 0;
            this.currentQRCode = null;
            this.currentPairingCode = null;
            
            // Capturar informações do usuário conectado
            try {
                const info = await this.client.info;
                this.user = {
                    id: info.wid._serialized,
                    name: info.pushname || info.name || 'Usuário WhatsApp',
                    phone: info.wid.user
                };
                console.log('👤 Usuário conectado:', this.user.name, '(' + this.user.phone + ')');
            } catch (error) {
                console.error('Erro ao obter informações do usuário:', error);
            }

            // Limpar intervalo de reconexão se existir
            if (this.reconnectInterval) {
                clearInterval(this.reconnectInterval);
                this.reconnectInterval = null;
            }
        });

        this.client.on('authenticated', (session) => {
            console.log('🔐 Autenticado com sucesso');
            this.user = session;
        });

        this.client.on('auth_failure', msg => {
            console.error('❌ Falha na autenticação:', msg);
            this.isReady = false;
            this.isConnecting = false;
            this.isInitialized = false;
            this.user = null;
        });

        this.client.on('disconnected', (reason) => {
            console.log('❌ Desconectado:', reason);
            this.isReady = false;
            this.isConnecting = false;
            this.isInitialized = false;
            this.currentQRCode = null;
            this.currentPairingCode = null;
            this.user = null;

            // Tentar reconectar automaticamente se não foi logout manual
            if (reason !== 'LOGOUT' && this.connectionAttempts < this.maxConnectionAttempts) {
                console.log(`🔄 Tentando reconectar... (${this.connectionAttempts + 1}/${this.maxConnectionAttempts})`);
                this.scheduleReconnect();
            }
        });

        this.client.on('pairing_code', (code) => {
            console.log('🔑 Código de pareamento:', code);
            this.currentPairingCode = code;
        });

        // Tratamento de erros do Puppeteer
        this.client.on('change_state', (state) => {
            console.log('🔄 Estado mudou para:', state);
        });

        // Tratamento de erros não capturados
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Erro não tratado:', reason);
            if (reason.message && reason.message.includes('ProtocolError')) {
                console.log('🔄 ProtocolError detectado, tentando reconectar...');
                this.scheduleReconnect();
            }
        });
    }

    async saveQRCode(qr) {
        try {
            // Gerar QR Code como imagem base64
            const qrImageData = await qrcode.toDataURL(qr, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            
            const qrData = {
                qr: qr,
                qrImage: qrImageData,
                timestamp: new Date().toISOString()
            };
            
            fs.writeFileSync(
                path.join(__dirname, '..', 'database', 'qr_code.json'),
                JSON.stringify(qrData)
            );
            
            console.log('✅ QR Code salvo como imagem');
        } catch (error) {
            console.error('❌ Erro ao salvar QR code:', error);
        }
    }

    scheduleReconnect() {
        if (this.reconnectInterval) return;

        this.reconnectInterval = setInterval(async () => {
            if (!this.isReady && !this.isConnecting && this.connectionAttempts < this.maxConnectionAttempts) {
                this.connectionAttempts++;
                console.log(`🔄 Tentativa de reconexão ${this.connectionAttempts}/${this.maxConnectionAttempts}`);
                await this.connect();
            } else {
                clearInterval(this.reconnectInterval);
                this.reconnectInterval = null;
            }
        }, 10000); // Tentar a cada 10 segundos
    }

    async connect() {
        if (this.isReady) {
            return { success: true, message: 'WhatsApp já está conectado' };
        }

        if (this.isConnecting) {
            return { success: false, message: 'Conexão já em andamento' };
        }

        try {
            this.isConnecting = true;
            console.log('🔄 Iniciando conexão com WhatsApp Web...');

            // Limpar sessão corrompida se necessário
            await this.cleanCorruptedSession();

            await this.client.initialize();
            
            return { success: true, message: 'Conexão iniciada - escaneie o QR Code' };
        } catch (error) {
            this.isConnecting = false;
            console.error('❌ Erro ao conectar:', error);
            
            // Se for erro de contexto destruído, tentar limpar sessão
            if (error.message && error.message.includes('Execution context was destroyed')) {
                console.log('🧹 Limpando sessão corrompida...');
                await this.cleanCorruptedSession();
            }
            
            return { success: false, message: error.message };
        }
    }

    async cleanCorruptedSession() {
        try {
            const authDir = path.join(__dirname, '..', 'auth_info_whatsapp-ultra');
            if (fs.existsSync(authDir)) {
                console.log('🧹 Limpando sessão corrompida...');
                
                // Tentar fechar qualquer instância do cliente
                try {
                    await this.client.destroy();
                } catch (e) {
                    // Ignorar erros ao destruir cliente corrompido
                }
                
                // Aguardar um pouco para liberar arquivos
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Limpar arquivos de cache que podem estar bloqueados
                await this.clearLockedFiles(authDir);
            }
        } catch (error) {
            console.error('❌ Erro ao limpar sessão:', error);
        }
    }

    async clearLockedFiles(dir) {
        try {
            const files = fs.readdirSync(dir, { recursive: true });
            
            for (const file of files) {
                const filePath = path.join(dir, file);
                
                try {
                    // Tentar remover arquivos que podem estar bloqueados
                    if (file.includes('Cookies') || file.includes('LOCK') || file.includes('LOG')) {
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    }
                } catch (e) {
                    // Ignorar arquivos que não podem ser removidos
                }
            }
        } catch (error) {
            console.error('❌ Erro ao limpar arquivos bloqueados:', error);
        }
    }

    async disconnect() {
        try {
            if (this.client) {
                console.log('🚪 Desconectando WhatsApp...');
                
                // Limpar intervalo de reconexão
                if (this.reconnectInterval) {
                    clearInterval(this.reconnectInterval);
                    this.reconnectInterval = null;
                }
                
                await this.client.destroy();
            }
            
            this.isReady = false;
            this.isConnecting = false;
            this.isInitialized = false;
            this.connectionAttempts = 0;
            this.currentQRCode = null;
            this.currentPairingCode = null;
            this.user = null;
            
            console.log('✅ WhatsApp desconectado');
            return { success: true, message: 'WhatsApp desconectado com sucesso' };
        } catch (error) {
            console.error('❌ Erro ao desconectar:', error);
            return { success: false, message: error.message };
        }
    }

    async clearSession() {
        try {
            console.log('🗑️ Limpando sessão WhatsApp...');
            
            await this.disconnect();
            
            const authDir = path.join(__dirname, '..', 'auth_info_whatsapp-ultra');
            if (fs.existsSync(authDir)) {
                // Aguardar para liberar arquivos
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                const files = fs.readdirSync(authDir, { recursive: true });
                for (const file of files) {
                    try {
                        const filePath = path.join(authDir, file);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    } catch (e) {
                        // Ignorar arquivos que não podem ser removidos
                    }
                }
                console.log('✅ Sessão limpa');
            }
            
        } catch (error) {
            console.error('❌ Erro ao limpar sessão:', error);
        }
    }

    async sendMessage(to, message) {
        if (!this.isReady) {
            throw new Error('WhatsApp não está conectado');
        }

        try {
            const phoneNumber = to.replace(/\D/g, '');
            if (phoneNumber.length < 10) {
                throw new Error('Número de telefone inválido');
            }

            const formattedNumber = to.includes('@') ? to : `${phoneNumber}@c.us`;
            
            const isRegistered = await this.client.isRegisteredUser(formattedNumber);
            if (!isRegistered) {
                throw new Error(`Número ${phoneNumber} não está registrado no WhatsApp`);
            }

            const result = await this.client.sendMessage(formattedNumber, message);
            
            console.log(`📤 Mensagem enviada para ${phoneNumber}`);
            
            return { 
                success: true, 
                message: 'Mensagem enviada com sucesso',
                messageId: result.id._serialized,
                recipient: phoneNumber
            };
        } catch (error) {
            console.error('❌ Erro ao enviar mensagem:', error);
            throw error;
        }
    }

    getStatus() {
        return {
            connected: this.isReady,
            isConnected: this.isReady,
            isConnecting: this.isConnecting,
            isInitialized: this.isInitialized,
            hasQRCode: !!this.currentQRCode,
            qrCode: this.getCurrentQRCode(),
            hasPairingCode: !!this.currentPairingCode,
            pairingCode: this.currentPairingCode,
            user: this.user,
            connectionAttempts: this.connectionAttempts,
            maxConnectionAttempts: this.maxConnectionAttempts
        };
    }

    getCurrentQRCode() {
        try {
            const qrPath = path.join(__dirname, '..', 'database', 'qr_code.json');
            if (fs.existsSync(qrPath)) {
                const qrData = JSON.parse(fs.readFileSync(qrPath, 'utf8'));
                return qrData.qrImage || qrData.qr;
            }
        } catch (error) {
            console.error('Erro ao obter QR code:', error);
        }
        return this.currentQRCode;
    }

    getPairingCode() {
        return this.currentPairingCode;
    }

    getConnectedUser() {
        return this.user;
    }
}

module.exports = WhatsAppUltraService;
