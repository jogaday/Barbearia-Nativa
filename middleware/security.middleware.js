const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const Joi = require('joi');

// Rate limiting para diferentes endpoints
const createRateLimit = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            success: false,
            error: 'Muitas tentativas',
            message: message
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
};

// Rate limiting específico para WhatsApp
const whatsappRateLimit = createRateLimit(
    15 * 60 * 1000, // 15 minutos
    10, // máximo 10 tentativas
    'Muitas tentativas de conexão WhatsApp. Tente novamente em 15 minutos.'
);

// Rate limiting para agendamentos
const appointmentRateLimit = createRateLimit(
    60 * 1000, // 1 minuto
    5, // máximo 5 agendamentos por minuto
    'Muitos agendamentos. Aguarde um momento antes de tentar novamente.'
);

// Rate limiting para API geral (mais permissivo para desenvolvimento)
const apiRateLimit = createRateLimit(
    60 * 1000, // 1 minuto
    1000, // máximo 1000 requests por minuto
    'Muitas requisições. Tente novamente em alguns minutos.'
);

// Configuração do Helmet para segurança
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
});

// Validação de dados de entrada
const validateAppointment = (req, res, next) => {
    const schema = Joi.object({
        cliente_nome: Joi.string().min(2).max(100).required(),
        cliente_telefone: Joi.string().pattern(/^\(?[1-9]{2}\)?\s?[0-9]{4,5}-?[0-9]{4}$/).required(),
        servico_id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
        servico_nome: Joi.string().min(2).max(100).required(),
        servico_preco: Joi.number().positive().required(),
        colaborador_id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
        colaborador_nome: Joi.string().min(2).max(100).required(),
        data_agendamento: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
        horario_agendamento: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        duracao_estimada: Joi.number().positive().max(300).required(),
        forma_pagamento: Joi.string().valid('Dinheiro', 'Cartão', 'PIX').default('Dinheiro'),
        observacoes: Joi.string().max(500).allow('').default('')
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: 'Dados inválidos',
            message: error.details[0].message
        });
    }

    req.body = value;
    next();
};

// Validação de telefone brasileiro
const validateBrazilianPhone = (phone) => {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Verifica se tem 10 ou 11 dígitos (com DDD)
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
        return false;
    }
    
    // Verifica se o DDD é válido (11 a 99)
    const ddd = parseInt(cleanPhone.substring(0, 2));
    if (ddd < 11 || ddd > 99) {
        return false;
    }
    
    return true;
};

// Middleware para validar telefone
const validatePhone = (req, res, next) => {
    if (req.body.cliente_telefone) {
        if (!validateBrazilianPhone(req.body.cliente_telefone)) {
            return res.status(400).json({
                success: false,
                error: 'Telefone inválido',
                message: 'Digite um telefone válido com DDD (ex: 11999999999)'
            });
        }
    }
    next();
};

// Middleware para validar data futura
const validateFutureDate = (req, res, next) => {
    if (req.body.data_agendamento) {
        const appointmentDate = new Date(req.body.data_agendamento);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (appointmentDate < today) {
            return res.status(400).json({
                success: false,
                error: 'Data inválida',
                message: 'Não é possível agendar para datas passadas'
            });
        }
    }
    next();
};

// Middleware de sanitização
const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        for (let key in obj) {
            if (typeof obj[key] === 'string') {
                // Remove caracteres potencialmente perigosos
                obj[key] = obj[key]
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '')
                    .trim();
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitize(obj[key]);
            }
        }
    };

    if (req.body) {
        sanitize(req.body);
    }
    if (req.query) {
        sanitize(req.query);
    }
    if (req.params) {
        sanitize(req.params);
    }

    next();
};

// Middleware de logging de segurança (DESABILITADO PARA DESENVOLVIMENTO)
const securityLogger = (req, res, next) => {
    // Desabilitado para evitar spam de logs durante desenvolvimento
    next();
};

// Middleware para verificar horário de funcionamento
const checkBusinessHours = (req, res, next) => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Domingo, 1 = Segunda, etc.

    // Barbearia funciona de Segunda a Sábado, das 8h às 19h
    const isBusinessDay = day >= 1 && day <= 6; // Segunda a Sábado
    const isBusinessHour = hour >= 8 && hour < 19;

    if (!isBusinessDay || !isBusinessHour) {
        // Permitir agendamentos fora do horário, mas logar
        console.log('⚠️ Agendamento fora do horário de funcionamento:', {
            day: day,
            hour: hour,
            ip: req.ip
        });
    }

    next();
};

module.exports = {
    helmetConfig,
    whatsappRateLimit,
    appointmentRateLimit,
    apiRateLimit,
    validateAppointment,
    validatePhone,
    validateFutureDate,
    sanitizeInput,
    securityLogger,
    checkBusinessHours,
    validateBrazilianPhone
};
