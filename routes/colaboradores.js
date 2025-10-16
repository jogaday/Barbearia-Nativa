const express = require('express');
const fs = require('fs');
const path = require('path');
const { hashPassword, verifyPassword, generateToken } = require('../middleware/auth.middleware');
const cacheService = require('../services/cache.service');

const router = express.Router();

// Caminho para o arquivo JSON dos colaboradores
const colaboradoresPath = path.join(__dirname, '..', 'database', 'colaboradores.json');

// Função para ler colaboradores do JSON (sem cache temporariamente)
function readColaboradores() {
    try {
        console.log('🔍 Lendo arquivo de colaboradores...');
        console.log('📁 Caminho:', colaboradoresPath);
        if (!fs.existsSync(colaboradoresPath)) {
            console.log('❌ Arquivo não existe:', colaboradoresPath);
            return [];
        }
        const data = fs.readFileSync(colaboradoresPath, 'utf8');
        console.log('📄 Tamanho do arquivo:', data.length, 'caracteres');
        console.log('📄 Primeiros 100 caracteres:', data.substring(0, 100));
        const colaboradores = JSON.parse(data);
        console.log('✅ Colaboradores lidos:', colaboradores.length);
        console.log('✅ Tipo:', typeof colaboradores);
        console.log('✅ É array:', Array.isArray(colaboradores));
        return colaboradores;
    } catch (error) {
        console.error('❌ Erro ao ler colaboradores:', error);
        return [];
    }
}

// Função para escrever colaboradores no JSON
function writeColaboradores(colaboradores) {
    try {
        fs.writeFileSync(colaboradoresPath, JSON.stringify(colaboradores, null, 2), 'utf8');
        // Invalidar cache após escrita
        cacheService.delete('colaboradores');
        console.log('💾 Cache invalidado: colaboradores');
        return true;
    } catch (error) {
        console.error('Erro ao salvar colaboradores:', error);
        return false;
    }
}

// Função para gerar próximo ID
function getNextId(colaboradores) {
    if (colaboradores.length === 0) return 1;
    return Math.max(...colaboradores.map(c => c.id)) + 1;
}

// GET /api/colaboradores - Listar todos os colaboradores
router.get('/', (req, res) => {
    try {
        const colaboradores = readColaboradores();
        res.json({
            success: true,
            data: colaboradores,
            total: colaboradores.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar colaboradores',
            message: error.message
        });
    }
});

// GET /api/colaboradores/:id - Buscar colaborador por ID
router.get('/:id', (req, res) => {
    try {
        const colaboradores = readColaboradores();
        const id = parseInt(req.params.id);
        const colaborador = colaboradores.find(c => c.id === id);

        if (!colaborador) {
            return res.status(404).json({
                success: false,
                error: 'Colaborador não encontrado'
            });
        }

        res.json({
            success: true,
            data: colaborador
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar colaborador',
            message: error.message
        });
    }
});

// POST /api/colaboradores - Criar novo colaborador
router.post('/', async (req, res) => {
    try {
        const colaboradores = await readColaboradores();
        const { nome, cargo, telefone, email, status, especialidades, horario_trabalho, observacoes } = req.body;

        // Validação básica
        if (!nome || !cargo || !telefone || !email) {
            return res.status(400).json({
                success: false,
                error: 'Campos obrigatórios: nome, cargo, telefone, email'
            });
        }

        // Verificar se email já existe
        const emailExists = colaboradores.some(c => c.email === email);
        if (emailExists) {
            return res.status(400).json({
                success: false,
                error: 'Email já cadastrado'
            });
        }

        // Hash da senha se fornecida
        const password = req.body.password || '';
        const hashedPassword = password ? await hashPassword(password) : '';

        const novoColaborador = {
            id: getNextId(colaboradores),
            nome,
            cargo,
            telefone,
            email,
            username: req.body.username || email,
            password: hashedPassword,
            status: status || 'Ativo',
            servicos_semana: 0,
            avaliacao: 0,
            data_cadastro: new Date().toISOString().split('T')[0],
            especialidades: especialidades || [],
            horario_trabalho: horario_trabalho || {
                "segunda": "08:00-18:00",
                "terca": "08:00-18:00",
                "quarta": "08:00-18:00",
                "quinta": "08:00-18:00",
                "sexta": "08:00-18:00",
                "sabado": "08:00-14:00",
                "domingo": "Fechado"
            },
            observacoes: observacoes || '',
            role: req.body.role || 'colaborador'
        };

        colaboradores.push(novoColaborador);
        
        if (writeColaboradores(colaboradores)) {
            res.status(201).json({
                success: true,
                message: 'Colaborador criado com sucesso! 🎉',
                data: novoColaborador
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Erro ao salvar colaborador'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao criar colaborador',
            message: error.message
        });
    }
});

// PUT /api/colaboradores/:id - Atualizar colaborador
router.put('/:id', async (req, res) => {
    try {
        const colaboradores = await readColaboradores();
        const id = parseInt(req.params.id);
        const colaboradorIndex = colaboradores.findIndex(c => c.id === id);

        if (colaboradorIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Colaborador não encontrado'
            });
        }

        const { nome, cargo, telefone, email, status, especialidades, horario_trabalho, observacoes, role, username, password } = req.body;

        // Validação básica
        if (!nome || !cargo || !telefone || !email) {
            return res.status(400).json({
                success: false,
                error: 'Campos obrigatórios: nome, cargo, telefone, email'
            });
        }

        // Verificar se email já existe em outro colaborador
        const emailExists = colaboradores.some(c => c.email === email && c.id !== id);
        if (emailExists) {
            return res.status(400).json({
                success: false,
                error: 'Email já cadastrado em outro colaborador'
            });
        }

        // 🔒 SEGURANÇA: Proteção para administradores
        const currentColaborador = colaboradores[colaboradorIndex];
        console.log(`🔍 Colaborador atual:`, currentColaborador.nome, 'Role:', currentColaborador.role);
        console.log(`🔍 Status recebido:`, status);
        console.log(`🔍 Role recebido:`, role);
        
        let finalStatus = status || currentColaborador.status;
        let finalRole = role || currentColaborador.role;

        if (currentColaborador.role === 'admin') {
            // Administradores devem sempre manter status "Ativo" e role "admin"
            finalStatus = 'Ativo';
            finalRole = 'admin';
            console.log(`🔒 Proteção aplicada para administrador: ${currentColaborador.nome}`);
            console.log(`🔒 Status forçado para: ${finalStatus}`);
            console.log(`🔒 Role forçado para: ${finalRole}`);
        }

        // Atualizar colaborador
        colaboradores[colaboradorIndex] = {
            ...colaboradores[colaboradorIndex],
            nome,
            cargo,
            telefone,
            email,
            status: finalStatus,
            especialidades: especialidades || colaboradores[colaboradorIndex].especialidades,
            horario_trabalho: horario_trabalho || colaboradores[colaboradorIndex].horario_trabalho,
            observacoes: observacoes || colaboradores[colaboradorIndex].observacoes,
            role: finalRole,
            username: username || colaboradores[colaboradorIndex].username,
            password: password ? await hashPassword(password) : colaboradores[colaboradorIndex].password
        };

        if (writeColaboradores(colaboradores)) {
            res.json({
                success: true,
                message: 'Colaborador atualizado com sucesso! ✏️',
                data: colaboradores[colaboradorIndex]
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Erro ao salvar alterações'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar colaborador',
            message: error.message
        });
    }
});

// DELETE /api/colaboradores/:id - Excluir colaborador
router.delete('/:id', (req, res) => {
    try {
        const colaboradores = readColaboradores();
        const id = parseInt(req.params.id);
        const colaboradorIndex = colaboradores.findIndex(c => c.id === id);

        if (colaboradorIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Colaborador não encontrado'
            });
        }

        const colaboradorRemovido = colaboradores[colaboradorIndex];
        colaboradores.splice(colaboradorIndex, 1);

        if (writeColaboradores(colaboradores)) {
            res.json({
                success: true,
                message: 'Colaborador excluído com sucesso! 🗑️',
                data: colaboradorRemovido
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Erro ao excluir colaborador'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao excluir colaborador',
            message: error.message
        });
    }
});

// PUT /api/colaboradores/:id/status - Atualizar apenas o status
router.put('/:id/status', (req, res) => {
    try {
        const colaboradores = readColaboradores();
        const id = parseInt(req.params.id);
        const { status } = req.body;
        const colaboradorIndex = colaboradores.findIndex(c => c.id === id);

        if (colaboradorIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Colaborador não encontrado'
            });
        }

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status é obrigatório'
            });
        }

        colaboradores[colaboradorIndex].status = status;

        if (writeColaboradores(colaboradores)) {
            res.json({
                success: true,
                message: 'Status atualizado com sucesso! 📊',
                data: colaboradores[colaboradorIndex]
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar status'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar status',
            message: error.message
        });
    }
});

// GET /api/colaboradores/ativos - Buscar apenas colaboradores ativos
router.get('/ativos', (req, res) => {
    try {
        const colaboradores = readColaboradores();
        const colaboradoresAtivos = colaboradores.filter(c => c.status === 'Ativo');
        
        res.json({
            success: true,
            data: colaboradoresAtivos,
            total: colaboradoresAtivos.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar colaboradores ativos',
            message: error.message
        });
    }
});

module.exports = router;

// Rota de login com controle de acesso por roles e JWT
router.post('/login', async (req, res) => {
    try {
        const colaboradores = readColaboradores();
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username e password são obrigatórios' 
            });
        }

        // Buscar usuário por username ou email (permite Ativo e Treinamento)
        console.log('🔍 Buscando usuário:', username);
        console.log('📋 Colaboradores disponíveis:', colaboradores.map(c => ({ nome: c.nome, username: c.username, status: c.status })));
        
        const user = colaboradores.find(c => 
            (c.username === username || c.email === username) &&
            (c.status === 'Ativo' || c.status === 'Treinamento')
        );
        
        console.log('👤 Usuário encontrado:', user ? { nome: user.nome, status: user.status } : 'Nenhum');
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Credenciais inválidas ou usuário inativo' 
            });
        }

            // Verificar senha (compatibilidade com senhas antigas em texto plano)
            let isValidPassword = false;
            
            console.log('🔐 Verificando senha para:', user.nome);
            console.log('🔐 Senha armazenada:', user.password.substring(0, 10) + '...');
            console.log('🔐 Senha fornecida:', password);
            
            if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
                // Senha já está hasheada
                console.log('🔐 Senha está hasheada, verificando...');
                isValidPassword = await verifyPassword(password, user.password);
                console.log('🔐 Resultado da verificação:', isValidPassword);
            } else {
                // Senha antiga em texto plano - migrar automaticamente
                console.log('🔐 Senha em texto plano, comparando...');
                if (user.password === password) {
                    isValidPassword = true;
                    console.log('🔐 Senha correta, migrando para hash...');
                    // Atualizar senha para hash
                    user.password = await hashPassword(password);
                    writeColaboradores(colaboradores);
                    console.log(`✅ Senha migrada para hash para usuário: ${user.nome}`);
                } else {
                    console.log('🔐 Senha incorreta');
                }
            }

        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                error: 'Credenciais inválidas' 
            });
        }

        // Retornar dados essenciais (sem senha) incluindo role
        const { password: _, ...safeUser } = user;
        const userData = {
            ...safeUser,
            role: user.role || 'colaborador',
            permissions: getUserPermissions(user.role || 'colaborador')
        };

        // Gerar token JWT
        const token = generateToken(userData);
        
        res.json({ 
            success: true, 
            data: userData,
            token: token
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno no servidor', 
            message: error.message 
        });
    }
});

// Função para definir permissões por role
function getUserPermissions(role) {
    const permissions = {
        admin: {
            canViewAllAppointments: true,
            canManageColaboradores: true,
            canManageServices: true,
            canViewFinancialReports: true,
            canManageReviews: true,
            canAccessWhatsAppAdmin: true,
            canViewOtherColaboradoresData: true
        },
        colaborador: {
            canViewAllAppointments: false,
            canManageColaboradores: false,
            canManageServices: false,
            canViewFinancialReports: false,
            canManageReviews: false,
            canAccessWhatsAppAdmin: false,
            canViewOtherColaboradoresData: false
        }
    };
    
    return permissions[role] || permissions.colaborador;
}

