@echo off
echo ========================================
echo   INSTALADOR BARBEARIA NATIVA v2.0
echo ========================================
echo.

echo [1/5] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    echo Por favor, instale o Node.js em: https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js encontrado!

echo.
echo [2/5] Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo ERRO: Falha ao instalar dependencias!
    pause
    exit /b 1
)
echo Dependencias instaladas com sucesso!

echo.
echo [3/5] Configurando banco de dados...
if not exist "database" mkdir database
echo Banco de dados configurado!

echo.
echo [4/5] Configurando logs...
if not exist "logs" mkdir logs
echo Logs configurados!

echo.
echo [5/5] Configurando arquivos de autenticacao...
if not exist "auth_info_whatsapp-web" mkdir auth_info_whatsapp-web
echo Autenticacao configurada!

echo.
echo ========================================
echo   INSTALACAO CONCLUIDA COM SUCESSO!
echo ========================================
echo.
echo Para iniciar o servidor, execute:
echo   npm start
echo.
echo Ou use o arquivo:
echo   iniciar.bat
echo.
echo IMPORTANTE: Configure o arquivo config.js
echo baseado no config.example.js
echo.
pause
