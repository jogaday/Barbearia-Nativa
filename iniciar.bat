@echo off
title Barbearia Nativa - Servidor
color 0A

echo.
echo ========================================
echo    BARBEARIA NATIVA v2.0 - INICIANDO
echo ========================================
echo.
echo 🚀 Porta padrão: 8080 (utilize a variável de ambiente PORT para alterar)
echo.
echo 📱 URLs para acessar (substitua pelo seu IP/porta se necessário):
echo    • Site Principal: http://localhost:8080/
echo    • Colaboradores: http://localhost:8080/sources/colaborador.html
echo    • WhatsApp Admin: http://localhost:8080/sources/whatsapp-admin.html
echo.
echo 📊 Monitoramento (NOVO):
echo    • Status: http://localhost:8080/api/monitoring/health
echo    • Métricas: http://localhost:8080/api/monitoring/metrics
echo    • Alertas: http://localhost:8080/api/monitoring/alerts
echo.
echo 🔧 API Endpoints:
echo    • Status: http://localhost:8080/api/status
echo    • WhatsApp: http://localhost:8080/api/whatsapp/status
echo.
echo 💡 Para parar o servidor: Ctrl + C
echo.
echo ========================================
echo.

REM Verificar se o Node.js está instalado
where node >nul 2>&1
if errorlevel 1 (
	echo.
	echo [ERRO] Node.js nao encontrado no PATH.
	echo Por favor instale o Node.js LTS em: https://nodejs.org/
	echo Ou instale via winget: winget install -e --id OpenJS.NodeJS.LTS
	echo.
	pause
	exit /b 1
)

REM Ir para o diretorio do script (garante caminho relativo correto)
cd /d "%~dp0"

REM Instalar dependencias se necessario
if not exist node_modules (
	echo Instalando dependencias (npm install)...
	npm install
	if errorlevel 1 (
		echo.
		echo [ERRO] Falha ao instalar dependencias. Verifique a conexao e as permissoes.
		pause
		exit /b 1
	)
)

echo Iniciando servidor com: npm start
echo.
npm run start

pause
