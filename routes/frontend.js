const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Importar middleware de segurança
const {
    appointmentRateLimit,
    validateAppointment,
    validatePhone,
    validateFutureDate
} = require('../middleware/security.middleware');

// GET /api/frontend/services - Obter todos os serviços para o frontend
router.get('/services', (req, res) => {
    try {
        const servicosPath = path.join(__dirname, '..', 'database', 'servicos.json');
        if (!fs.existsSync(servicosPath)) {
            return res.status(404).json({ success: false, error: 'Arquivo de serviços não encontrado' });
        }
        
        const servicos = JSON.parse(fs.readFileSync(servicosPath, 'utf8'));
        res.json({ success: true, data: servicos });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erro ao obter serviços', message: error.message });
    }
});

// GET /api/frontend/appointments - Obter todos os agendamentos para o frontend
router.get('/appointments', (req, res) => {
    try {
        const agendamentosPath = path.join(__dirname, '..', 'database', 'agendamentos.json');
        if (!fs.existsSync(agendamentosPath)) {
            return res.status(404).json({ success: false, error: 'Arquivo de agendamentos não encontrado' });
        }
        
        const agendamentos = JSON.parse(fs.readFileSync(agendamentosPath, 'utf8'));
        res.json({ success: true, data: agendamentos });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erro ao obter agendamentos', message: error.message });
    }
});

// GET /api/frontend/employees - Obter todos os colaboradores para o frontend
router.get('/employees', (req, res) => {
    try {
        const colaboradoresPath = path.join(__dirname, '..', 'database', 'colaboradores.json');
        if (!fs.existsSync(colaboradoresPath)) {
            return res.status(404).json({ success: false, error: 'Arquivo de colaboradores não encontrado' });
        }
        
        const colaboradores = JSON.parse(fs.readFileSync(colaboradoresPath, 'utf8'));
        res.json({ success: true, data: colaboradores });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erro ao obter colaboradores', message: error.message });
    }
});

// GET /api/frontend/clients - Obter todos os clientes para o frontend
router.get('/clients', (req, res) => {
    try {
        const clientesPath = path.join(__dirname, '..', 'database', 'clientes.json');
        if (!fs.existsSync(clientesPath)) {
            return res.status(404).json({ success: false, error: 'Arquivo de clientes não encontrado' });
        }
        
        const clientes = JSON.parse(fs.readFileSync(clientesPath, 'utf8'));
        res.json({ success: true, data: clientes });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erro ao obter clientes', message: error.message });
    }
});

// POST /api/frontend/appointments - Criar novo agendamento via frontend
router.post('/appointments', 
    appointmentRateLimit,
    validateAppointment,
    validatePhone,
    validateFutureDate,
    (req, res) => {
    // Log detalhado dos dados recebidos
    console.log('📥 Dados recebidos no backend:', {
        data_agendamento: req.body.data_agendamento,
        horario_agendamento: req.body.horario_agendamento
    });

    // Impedir agendamento de datas passadas
    const today = new Date();
    today.setHours(0,0,0,0); // Zera hora para comparar só a data
    const agendamentoDateStr = req.body.data_agendamento || req.body.date || req.body.data;
    let agendamentoDate = null;
    if (agendamentoDateStr && /^\d{4}-\d{2}-\d{2}$/.test(agendamentoDateStr)) {
        agendamentoDate = new Date(agendamentoDateStr + 'T00:00:00');
    }
    if (!agendamentoDate || agendamentoDate < today) {
        return res.status(400).json({ success: false, error: 'Não é permitido agendar para datas passadas. Escolha hoje ou uma data futura.' });
    }
    try {
        // Ensure logs directory exists and append incoming request info for diagnostics
        try {
            const logsDir = path.join(__dirname, '..', 'logs');
            if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
            const logLine = `${new Date().toISOString()} - POST /api/frontend/appointments - data_agendamento: ${req.body && req.body.data_agendamento} - body: ${JSON.stringify(req.body)}\n`;
            fs.appendFileSync(path.join(logsDir, 'frontend_incoming.log'), logLine);
        } catch (logErr) {
            console.error('Could not write frontend incoming log:', logErr);
        }
        const agendamentosPath = path.join(__dirname, '..', 'database', 'agendamentos.json');
        if (!fs.existsSync(agendamentosPath)) {
            return res.status(404).json({ success: false, error: 'Arquivo de agendamentos não encontrado' });
        }
        
        const agendamentos = JSON.parse(fs.readFileSync(agendamentosPath, 'utf8'));
        
        // Gerar novo ID
        const newId = agendamentos.length > 0 ? Math.max(...agendamentos.map(a => a.id || 0)) + 1 : 1;
        
        // Normalize/validate date fields from the incoming body
        const rawDate = req.body && (req.body.data_agendamento || req.body.date || req.body.data || '');
        let normalizedDate = '';
        if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
            normalizedDate = rawDate;
        } else if (rawDate) {
            // Try to parse other formats (e.g., dd/mm/yyyy or timestamps)
            try {
                // If format is dd/mm/yyyy, replace slashes
                const maybeIso = rawDate.includes('/') ? rawDate.split('/').reverse().join('-') : rawDate;
                const parsed = new Date(maybeIso);
                if (!isNaN(parsed.getTime())) {
                    normalizedDate = parsed.toISOString().slice(0,10);
                } else {
                    normalizedDate = '';
                }
            } catch (e) {
                normalizedDate = '';
            }
        }

        // Criar novo agendamento mantendo dados exatamente como recebidos (sem conversão)
        const novoAgendamento = {
            ...req.body,
            id: newId,
            data_criacao: new Date().toISOString(),
            status: req.body.status || 'Agendado'
        };

        // Log if normalization changed something
        try {
            const logsDir = path.join(__dirname, '..', 'logs');
            const normLog = `${new Date().toISOString()} - normalized data_agendamento for id ${newId}: raw="${rawDate}" -> normalized="${novoAgendamento.data_agendamento}"\n`;
            fs.appendFileSync(path.join(logsDir, 'frontend_incoming.log'), normLog);
        } catch (e) {
            // ignore logging errors
        }
        
        agendamentos.push(novoAgendamento);
        
        // Salvar no arquivo
    fs.writeFileSync(agendamentosPath, JSON.stringify(agendamentos, null, 2));
    console.log('✅ Agendamento salvo com sucesso no arquivo JSON');
    res.json({ success: true, data: novoAgendamento, message: 'Agendamento criado com sucesso' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erro ao criar agendamento', message: error.message });
    }
});

module.exports = router;
