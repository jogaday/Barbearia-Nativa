/**
 * Script de Teste das Melhorias Implementadas
 * Testa todas as funcionalidades críticas implementadas
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

async function testImprovements() {
    console.log('🧪 TESTANDO MELHORIAS IMPLEMENTADAS\n');
    
    try {
        // Teste 1: Health Check
        console.log('1️⃣ Testando Health Check...');
        try {
            const healthResponse = await axios.get(`${BASE_URL}/api/monitoring/health`);
            console.log('✅ Health Check:', healthResponse.data.data.status);
        } catch (error) {
            console.log('❌ Health Check falhou:', error.message);
        }

        // Teste 2: Cache Stats
        console.log('\n2️⃣ Testando Cache Stats...');
        try {
            const cacheResponse = await axios.get(`${BASE_URL}/api/monitoring/cache`);
            console.log('✅ Cache Stats:', cacheResponse.data.data);
        } catch (error) {
            console.log('❌ Cache Stats falhou:', error.message);
        }

        // Teste 3: Login com Hash
        console.log('\n3️⃣ Testando Login com Hash...');
        try {
            const loginResponse = await axios.post(`${BASE_URL}/api/colaboradores/login`, {
                username: 'carlos',
                password: '123456'
            });
            
            if (loginResponse.data.success && loginResponse.data.token) {
                console.log('✅ Login com JWT:', 'Token gerado com sucesso');
                console.log('   Usuário:', loginResponse.data.data.nome);
                console.log('   Role:', loginResponse.data.data.role);
            } else {
                console.log('❌ Login falhou:', loginResponse.data.error);
            }
        } catch (error) {
            console.log('❌ Login falhou:', error.message);
        }

        // Teste 4: Cache Performance
        console.log('\n4️⃣ Testando Performance do Cache...');
        try {
            const startTime = Date.now();
            await axios.get(`${BASE_URL}/api/colaboradores`);
            const endTime = Date.now();
            console.log(`✅ Tempo de resposta: ${endTime - startTime}ms`);
        } catch (error) {
            console.log('❌ Teste de performance falhou:', error.message);
        }

        // Teste 5: Database Info
        console.log('\n5️⃣ Testando Database Info...');
        try {
            const dbResponse = await axios.get(`${BASE_URL}/api/monitoring/database`);
            console.log('✅ Database Info:', {
                totalFiles: dbResponse.data.data.files.length,
                totalSize: `${(dbResponse.data.data.totalSize / 1024).toFixed(2)} KB`
            });
        } catch (error) {
            console.log('❌ Database Info falhou:', error.message);
        }

        console.log('\n🎉 TESTES CONCLUÍDOS!');
        
    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    }
}

// Executar testes
testImprovements();

