/**
 * Sistema de Cache em Memória
 * Melhora performance evitando leituras desnecessárias do JSON
 */

class CacheService {
    constructor() {
        this.cache = new Map();
        this.ttl = new Map(); // Time To Live
        this.defaultTTL = 5 * 60 * 1000; // 5 minutos
    }

    /**
     * Armazenar dados no cache
     * @param {string} key - Chave do cache
     * @param {any} data - Dados para armazenar
     * @param {number} ttl - Tempo de vida em ms (opcional)
     */
    set(key, data, ttl = this.defaultTTL) {
        this.cache.set(key, data);
        this.ttl.set(key, Date.now() + ttl);
        console.log(`💾 Cache SET: ${key} (TTL: ${ttl}ms)`);
    }

    /**
     * Recuperar dados do cache
     * @param {string} key - Chave do cache
     * @returns {any|null} - Dados ou null se expirado/não encontrado
     */
    get(key) {
        const ttl = this.ttl.get(key);
        
        if (!ttl || Date.now() > ttl) {
            // Cache expirado ou não existe
            this.delete(key);
            return null;
        }

        const data = this.cache.get(key);
        console.log(`💾 Cache HIT: ${key}`);
        return data;
    }

    /**
     * Verificar se existe no cache
     * @param {string} key - Chave do cache
     * @returns {boolean}
     */
    has(key) {
        const ttl = this.ttl.get(key);
        if (!ttl || Date.now() > ttl) {
            this.delete(key);
            return false;
        }
        return this.cache.has(key);
    }

    /**
     * Remover do cache
     * @param {string} key - Chave do cache
     */
    delete(key) {
        this.cache.delete(key);
        this.ttl.delete(key);
        console.log(`💾 Cache DELETE: ${key}`);
    }

    /**
     * Limpar todo o cache
     */
    clear() {
        this.cache.clear();
        this.ttl.clear();
        console.log('💾 Cache CLEAR: Todos os dados removidos');
    }

    /**
     * Limpar cache expirado
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, expireTime] of this.ttl.entries()) {
            if (now > expireTime) {
                this.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Cache CLEANUP: ${cleaned} itens expirados removidos`);
        }
    }

    /**
     * Estatísticas do cache
     */
    getStats() {
        const now = Date.now();
        let active = 0;
        let expired = 0;

        for (const expireTime of this.ttl.values()) {
            if (now > expireTime) {
                expired++;
            } else {
                active++;
            }
        }

        return {
            total: this.cache.size,
            active,
            expired,
            memoryUsage: process.memoryUsage().heapUsed
        };
    }

    /**
     * Cache com função de fallback
     * @param {string} key - Chave do cache
     * @param {Function} fallback - Função para buscar dados se não estiver no cache
     * @param {number} ttl - TTL opcional
     * @returns {Promise<any>}
     */
    async getOrSet(key, fallback, ttl = this.defaultTTL) {
        let data = this.get(key);
        
        if (data === null) {
            console.log(`💾 Cache MISS: ${key} - Executando fallback`);
            data = await fallback();
            this.set(key, data, ttl);
        }

        return data;
    }
}

// Instância singleton
const cacheService = new CacheService();

// Limpeza automática a cada 5 minutos
setInterval(() => {
    cacheService.cleanup();
}, 5 * 60 * 1000);

module.exports = cacheService;

