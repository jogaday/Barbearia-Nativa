const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar middleware de segurança
const {
    helmetConfig,
    apiRateLimit,
    securityLogger,
    sanitizeInput,
    checkBusinessHours
} = require('./middleware/security.middleware');

// Importar serviços
// MonitoringService removido durante limpeza

// Importar rotas
const colaboradoresRoutes = require('./routes/colaboradores');
const servicosRoutes = require('./routes/servicos');
const clientesRoutes = require('./routes/clientes');
const agendamentosRoutes = require('./routes/agendamentos');
const avaliacoesRoutes = require('./routes/avaliacoes');
const whatsappRoutes = require('./routes/whatsapp-ultra');
const frontendRoutes = require('./routes/frontend');
const monitoringRoutes = require('./routes/monitoring'); // Novo: Monitoramento

const app = express();
const PORT = process.env.PORT || 8080;

// Inicializar monitoramento (DESABILITADO PARA EVITAR CONFLITOS)
// const monitoringService = new MonitoringService();

// Middleware de segurança
app.use(helmetConfig);
app.use(apiRateLimit);
app.use(securityLogger);
app.use(sanitizeInput);
app.use(checkBusinessHours);

// Middleware básico
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? ['https://seudominio.com'] : true,
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos (frontend)
app.use(express.static(path.join(__dirname)));

// Rotas da API
app.use('/api/colaboradores', colaboradoresRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/agendamentos', agendamentosRoutes);
app.use('/api/avaliacoes', avaliacoesRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/frontend', frontendRoutes);
app.use('/api/monitoring', monitoringRoutes); // Novo: Monitoramento

// Rota para servir o frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'sources', 'index.html'));
});

// Rota para redirecionar colaborador.html para o caminho correto
app.get('/colaborador.html', (req, res) => {
    res.redirect('/sources/colaborador.html');
});

// Rota para o painel de administração do WhatsApp
app.get('/whatsapp-admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'sources', 'whatsapp-admin.html'));
});

// Rota para verificar agendamentos (para debug) - MANTIDA PARA COMPATIBILIDADE
app.get('/api/agendamentos-debug', (req, res) => {
    res.json({ 
        message: 'Os agendamentos são armazenados no localStorage do navegador.',
        instrucoes: [
            '1. Abra o Console do navegador (F12)',
            '2. Digite: localStorage.getItem("barbearia_appointments")',
            '3. Isso mostrará todos os agendamentos salvos'
        ],
        nota: 'Use /api/agendamentos para acessar os agendamentos do banco de dados'
    });
});

// Middleware para atualizar métricas (DESABILITADO)
// app.use((req, res, next) => {
//     const startTime = Date.now();
//     
//     res.on('finish', () => {
//         monitoringService.incrementRequests();
//         monitoringService.updateResponseTime(Date.now() - startTime);
//         
//         if (res.statusCode >= 400) {
//             monitoringService.incrementErrors();
//         }
//     });
//     
//     next();
// });

// Rota de status da API
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        message: '🚀 API da Barbearia Nativa funcionando perfeitamente!',
        version: '1.0.0',
        endpoints: {
            colaboradores: '/api/colaboradores',
            servicos: '/api/servicos',
            clientes: '/api/clientes',
            agendamentos: '/api/agendamentos',
            avaliacoes: '/api/avaliacoes',
            whatsapp: '/api/whatsapp',
            monitoring: '/api/monitoring'
        },
        timestamp: new Date().toISOString()
    });
});

// Rotas de monitoramento
app.get('/api/monitoring/health', (req, res) => {
    try {
        const health = monitoringService.getHealthStatus();
        res.json(health);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Erro ao obter status de saúde',
            error: error.message
        });
    }
});

app.get('/api/monitoring/metrics', (req, res) => {
    try {
        const metrics = monitoringService.getMetrics();
        res.json({
            success: true,
            data: metrics,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao obter métricas',
            message: error.message
        });
    }
});

app.get('/api/monitoring/alerts', (req, res) => {
    try {
        const alerts = monitoringService.getAlerts();
        res.json({
            success: true,
            data: alerts,
            count: alerts.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao obter alertas',
            message: error.message
        });
    }
});

app.get('/api/monitoring/report', (req, res) => {
    try {
        const report = monitoringService.generateStatusReport();
        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar relatório',
            message: error.message
        });
    }
});


// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Algo deu errado! 😅',
        message: err.message 
    });
});

// Rota 404
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Rota não encontrada! 🤷‍♂️',
        path: req.originalUrl 
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Frontend Local: http://localhost:${PORT}`);
    console.log(`📱 Frontend (Rede): http://192.168.0.100:${PORT}`);
    console.log(`🔧 API Local: http://localhost:${PORT}/api`);
    console.log(`🔧 API (Rede): http://192.168.0.100:${PORT}/api`);
    console.log(`👥 Colaboradores: http://192.168.0.100:${PORT}/sources/colaborador.html`);
});
