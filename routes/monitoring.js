const express = require('express');
const router = express.Router();
const cacheService = require('../services/cache.service');
const fs = require('fs');
const path = require('path');

/**
 * GET /api/monitoring/health - Health check do sistema
 */
router.get('/health', (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version,
            platform: process.platform
        };

        res.json({
            success: true,
            data: health
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Health check failed',
            message: error.message
        });
    }
});

/**
 * GET /api/monitoring/stats - Estatísticas do sistema
 */
router.get('/stats', (req, res) => {
    try {
        const stats = {
            cache: cacheService.getStats(),
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get stats',
            message: error.message
        });
    }
});

/**
 * GET /api/monitoring/cache - Informações do cache
 */
router.get('/cache', (req, res) => {
    try {
        const cacheStats = cacheService.getStats();
        
        res.json({
            success: true,
            data: {
                ...cacheStats,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get cache info',
            message: error.message
        });
    }
});

/**
 * POST /api/monitoring/cache/clear - Limpar cache
 */
router.post('/cache/clear', (req, res) => {
    try {
        cacheService.clear();
        
        res.json({
            success: true,
            message: 'Cache limpo com sucesso',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to clear cache',
            message: error.message
        });
    }
});

/**
 * GET /api/monitoring/database - Informações dos arquivos de dados
 */
router.get('/database', (req, res) => {
    try {
        const databasePath = path.join(__dirname, '..', 'database');
        const files = fs.readdirSync(databasePath);
        
        const fileStats = files.map(file => {
            const filePath = path.join(databasePath, file);
            const stats = fs.statSync(filePath);
            
            return {
                name: file,
                size: stats.size,
                modified: stats.mtime,
                created: stats.birthtime
            };
        });

        res.json({
            success: true,
            data: {
                files: fileStats,
                totalSize: fileStats.reduce((sum, file) => sum + file.size, 0),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get database info',
            message: error.message
        });
    }
});

module.exports = router;

