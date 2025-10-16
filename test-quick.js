// Teste rápido do sistema
const axios = require('axios');

async function testSystem() {
    const baseUrl = 'http://localhost:8080';
    
    console.log('🧪 Testando sistema Barbearia Nativa v2.0...\n');
    
    try {
        // Teste 1: Status da API
        console.log('1️⃣ Testando status da API...');
        const statusResponse = await axios.get(`${baseUrl}/api/status`);
        console.log('✅ API Status:', statusResponse.data.message);
        
        // Teste 2: Status do WhatsApp
        console.log('\n2️⃣ Testando status do WhatsApp...');
        const whatsappResponse = await axios.get(`${baseUrl}/api/whatsapp/status`);
        console.log('✅ WhatsApp Status:', whatsappResponse.data.data.connected ? 'Conectado' : 'Desconectado');
        
        // Teste 3: QR Code
        console.log('\n3️⃣ Testando QR Code...');
        const qrResponse = await axios.get(`${baseUrl}/api/whatsapp/qr-code`);
        console.log('✅ QR Code disponível:', qrResponse.data.data.hasQRCode);
        
        // Teste 4: Agendamentos de hoje
        console.log('\n4️⃣ Testando agendamentos...');
        const appointmentsResponse = await axios.get(`${baseUrl}/api/whatsapp/today-appointments`);
        console.log('✅ Agendamentos hoje:', appointmentsResponse.data.data.length);
        
        console.log('\n🎉 TODOS OS TESTES PASSARAM!');
        console.log('\n📱 Acesse: http://localhost:8080/sources/whatsapp-admin.html');
        console.log('📊 Monitoramento: http://localhost:8080/api/monitoring/health');
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.response?.data || error.message);
    }
}

testSystem();
