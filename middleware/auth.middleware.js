const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Configurações de autenticação
const JWT_SECRET = process.env.JWT_SECRET || 'barbearia-nativa-super-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Middleware para verificar token JWT
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Token de acesso necessário',
            message: 'Faça login para acessar este recurso'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                error: 'Token inválido',
                message: 'Token expirado ou inválido'
            });
        }
        req.user = user;
        next();
    });
};

/**
 * Middleware para verificar permissões específicas
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Não autenticado',
                message: 'Faça login primeiro'
            });
        }

        if (!req.user.permissions || !req.user.permissions[permission]) {
            return res.status(403).json({
                success: false,
                error: 'Permissão negada',
                message: `Você não tem permissão para ${permission}`
            });
        }

        next();
    };
};

/**
 * Gerar token JWT
 */
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            nome: user.nome,
            role: user.role,
            permissions: user.permissions
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

/**
 * Hash de senha
 */
const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};

/**
 * Verificar senha
 */
const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

/**
 * Middleware para rotas públicas (não requer autenticação)
 */
const publicRoute = (req, res, next) => {
    next();
};

module.exports = {
    authenticateToken,
    requirePermission,
    generateToken,
    hashPassword,
    verifyPassword,
    publicRoute,
    JWT_SECRET,
    JWT_EXPIRES_IN
};

