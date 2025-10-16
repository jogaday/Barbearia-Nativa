const express = require('express');
const router = express.Router();
const WhatsAppUltraService = require('../services/whatsapp-ultra.service');

// Instância única do serviço WhatsApp
let whatsappService = null;

// Middleware para garantir que o serviço está inicializado
const requireWhatsAppService = (req, res, next) => {
    if (!whatsappService) {
        whatsappService = new WhatsAppUltraService();
    }
    req.whatsappService = whatsappService;
    next();
};

// GET /api/whatsapp/status - Obter status da conexão
router.get('/status', requireWhatsAppService, (req, res) => {
    try {
        const status = req.whatsappService.getStatus();
        const user = req.whatsappService.getConnectedUser();
        
        res.json({
            success: true,
            data: {
                ...status,
                user: user
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao obter status',
            message: error.message
        });
    }
});

// POST /api/whatsapp/connect - Conectar ao WhatsApp
router.post('/connect', requireWhatsAppService, async (req, res) => {
    try {
        const result = await req.whatsappService.connect();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao conectar',
            message: error.message
        });
    }
});

// POST /api/whatsapp/disconnect - Desconectar do WhatsApp
router.post('/disconnect', requireWhatsAppService, async (req, res) => {
    try {
        const result = await req.whatsappService.disconnect();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao desconectar',
            message: error.message
        });
    }
});

// POST /api/whatsapp/clear-session - Limpar sessão
router.post('/clear-session', requireWhatsAppService, async (req, res) => {
    try {
        await req.whatsappService.clearSession();
        res.json({
            success: true,
            message: 'Sessão limpa com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao limpar sessão',
            message: error.message
        });
    }
});

// GET /api/whatsapp/qr-code - Obter QR code atual
router.get('/qr-code', requireWhatsAppService, (req, res) => {
    try {
        const qrCode = req.whatsappService.getCurrentQRCode();
        
        res.json({
            success: true,
            data: {
                hasQRCode: !!qrCode,
                qrCode: qrCode
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao obter QR code',
            message: error.message
        });
    }
});

// GET /api/whatsapp/pairing-code - Obter código de pareamento
router.get('/pairing-code', requireWhatsAppService, (req, res) => {
    try {
        const pairingCode = req.whatsappService.getPairingCode();
        
        res.json({
            success: true,
            data: {
                hasPairingCode: !!pairingCode,
                pairingCode: pairingCode
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao obter código de pareamento',
            message: error.message
        });
    }
});

// POST /api/whatsapp/send-message - Enviar mensagem
router.post('/send-message', requireWhatsAppService, async (req, res) => {
    try {
        const { to, message } = req.body;
        
        if (!to || !message) {
            return res.status(400).json({
                success: false,
                error: 'Dados inválidos',
                message: 'Telefone e mensagem são obrigatórios'
            });
        }
        
        const result = await req.whatsappService.sendMessage(to, message);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao enviar mensagem',
            message: error.message
        });
    }
});

// GET /api/whatsapp/today-appointments - Obter agendamentos de hoje
router.get('/today-appointments', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const appointmentsPath = path.join(__dirname, '..', 'database', 'agendamentos.json');
        
        if (fs.existsSync(appointmentsPath)) {
            const appointments = JSON.parse(fs.readFileSync(appointmentsPath, 'utf8'));
            const today = new Date().toISOString().split('T')[0];
            
            const todayAppointments = appointments.filter(appointment => 
                appointment.data_agendamento === today
            );
            
            res.json({
                success: true,
                data: todayAppointments
            });
        } else {
            res.json({
                success: true,
                data: []
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao obter agendamentos',
            message: error.message
        });
    }
});

// POST /api/whatsapp/send-bulk-confirmations - Enviar confirmações em lote
router.post('/send-bulk-confirmations', requireWhatsAppService, async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const appointmentsPath = path.join(__dirname, '..', 'database', 'agendamentos.json');
        
        if (!fs.existsSync(appointmentsPath)) {
            return res.json({
                success: true,
                data: { total: 0, sent: 0, failed: 0 }
            });
        }

        const appointments = JSON.parse(fs.readFileSync(appointmentsPath, 'utf8'));
        const today = new Date().toISOString().split('T')[0];
        
        const todayAppointments = appointments.filter(appointment => 
            appointment.data_agendamento === today && 
            (appointment.status === 'Agendado' || appointment.status === 'pendente')
        );

        let sent = 0;
        let failed = 0;

        for (const appointment of todayAppointments) {
            try {
                const message = `Olá ${appointment.cliente_nome}! Seu agendamento para hoje às ${appointment.horario_agendamento} está confirmado. Serviço: ${appointment.servico_nome}`;
                await req.whatsappService.sendMessage(appointment.cliente_telefone, message);
                sent++;
                
                // Atualizar status do agendamento
                appointment.status = 'confirmado';
                
                // Pequena pausa entre mensagens para evitar rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error('Erro ao enviar confirmação:', error);
                failed++;
            }
        }

        // Salvar agendamentos atualizados
        fs.writeFileSync(appointmentsPath, JSON.stringify(appointments, null, 2));

        res.json({
            success: true,
            data: {
                total: todayAppointments.length,
                sent: sent,
                failed: failed
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao enviar confirmações',
            message: error.message
        });
    }
});

// POST /api/whatsapp/cancel-confirmations - Cancelar confirmações
router.post('/cancel-confirmations', requireWhatsAppService, async (req, res) => {
    try {
        const { reason } = req.body;
        const fs = require('fs');
        const path = require('path');
        const appointmentsPath = path.join(__dirname, '..', 'database', 'agendamentos.json');
        
        if (!fs.existsSync(appointmentsPath)) {
            return res.json({
                success: true,
                data: { cancelledCount: 0 }
            });
        }

        const appointments = JSON.parse(fs.readFileSync(appointmentsPath, 'utf8'));
        const today = new Date().toISOString().split('T')[0];
        
        const todayAppointments = appointments.filter(appointment => 
            appointment.data_agendamento === today
        );

        let cancelledCount = 0;

        for (const appointment of todayAppointments) {
            try {
                const message = `Olá ${appointment.cliente_nome}! Infelizmente precisamos cancelar seu agendamento para hoje às ${appointment.horario_agendamento}. Motivo: ${reason || 'Problemas técnicos'}`;
                await req.whatsappService.sendMessage(appointment.cliente_telefone, message);
                
                // Atualizar status do agendamento
                appointment.status = 'cancelado';
                cancelledCount++;
                
                // Pequena pausa entre mensagens
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error('Erro ao cancelar agendamento:', error);
            }
        }

        // Salvar agendamentos atualizados
        fs.writeFileSync(appointmentsPath, JSON.stringify(appointments, null, 2));

        res.json({
            success: true,
            data: { cancelledCount: cancelledCount }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao cancelar confirmações',
            message: error.message
        });
    }
});

// POST /api/whatsapp/send-report-daily - Enviar relatório diário
router.post('/send-report-daily', requireWhatsAppService, async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const appointmentsPath = path.join(__dirname, '..', 'database', 'agendamentos.json');
        
        let todayAppointments = [];
        if (fs.existsSync(appointmentsPath)) {
            const appointments = JSON.parse(fs.readFileSync(appointmentsPath, 'utf8'));
            const today = new Date().toISOString().split('T')[0];
            todayAppointments = appointments.filter(appointment => 
                appointment.data_agendamento === today
            );
        }

        const total = todayAppointments.length;
        const confirmed = todayAppointments.filter(a => a.status === 'confirmado').length;
        const cancelled = todayAppointments.filter(a => a.status === 'cancelado').length;

        const message = `📊 RELATÓRIO DIÁRIO - ${new Date().toLocaleDateString('pt-BR')}

📅 Total de agendamentos: ${total}
✅ Confirmados: ${confirmed}
❌ Cancelados: ${cancelled}

💰 Receita estimada: R$ ${(confirmed * 50).toFixed(2)}`;

        // Enviar para o próprio usuário conectado (dono)
        const connectedUser = req.whatsappService.getConnectedUser();
        if (connectedUser && connectedUser.id) {
            const ownerPhone = connectedUser.id.replace('@c.us', '');
            await req.whatsappService.sendMessage(ownerPhone, message);
        } else {
            throw new Error('Usuário não conectado para enviar relatório');
        }

        res.json({
            success: true,
            message: 'Relatório diário enviado com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao enviar relatório',
            message: error.message
        });
    }
});

// POST /api/whatsapp/send-report-weekly - Enviar relatório semanal
router.post('/send-report-weekly', requireWhatsAppService, async (req, res) => {
    try {
        const message = `📊 RELATÓRIO SEMANAL

Esta funcionalidade será implementada em breve.
Por enquanto, use o relatório diário.`;

        // Enviar para o próprio usuário conectado (dono)
        const connectedUser = req.whatsappService.getConnectedUser();
        if (connectedUser && connectedUser.id) {
            const ownerPhone = connectedUser.id.replace('@c.us', '');
            await req.whatsappService.sendMessage(ownerPhone, message);
        } else {
            throw new Error('Usuário não conectado para enviar relatório');
        }

        res.json({
            success: true,
            message: 'Relatório semanal enviado com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao enviar relatório',
            message: error.message
        });
    }
});

// POST /api/whatsapp/send-report-monthly - Enviar relatório mensal
router.post('/send-report-monthly', requireWhatsAppService, async (req, res) => {
    try {
        const message = `📊 RELATÓRIO MENSAL

Esta funcionalidade será implementada em breve.
Por enquanto, use o relatório diário.`;

        // Enviar para o próprio usuário conectado (dono)
        const connectedUser = req.whatsappService.getConnectedUser();
        if (connectedUser && connectedUser.id) {
            const ownerPhone = connectedUser.id.replace('@c.us', '');
            await req.whatsappService.sendMessage(ownerPhone, message);
        } else {
            throw new Error('Usuário não conectado para enviar relatório');
        }

        res.json({
            success: true,
            message: 'Relatório mensal enviado com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao enviar relatório',
            message: error.message
        });
    }
});

// GET /api/whatsapp/logs - Obter logs
router.get('/logs', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const logsPath = path.join(__dirname, '..', 'database', 'whatsapp_logs.json');
        
        if (fs.existsSync(logsPath)) {
            const logs = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
            res.json({
                success: true,
                data: logs.slice(-50) // Últimos 50 logs
            });
        } else {
            res.json({
                success: true,
                data: []
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao obter logs',
            message: error.message
        });
    }
});

// POST /api/whatsapp/clear-logs - Limpar logs
router.post('/clear-logs', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const logsPath = path.join(__dirname, '..', 'database', 'whatsapp_logs.json');
        
        if (fs.existsSync(logsPath)) {
            fs.writeFileSync(logsPath, JSON.stringify([], null, 2));
        }

        res.json({
            success: true,
            message: 'Logs limpos com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao limpar logs',
            message: error.message
        });
    }
});

module.exports = router;
