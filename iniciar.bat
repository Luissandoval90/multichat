@echo off
title Multi Chat Overlay
cd /d "%~dp0"

if not exist "node_modules" (
    echo Instalando dependencias por primera vez, esto puede tardar un par de minutos...
    call npm install
    if errorlevel 1 (
        echo.
        echo Hubo un error instalando las dependencias. Revisa el mensaje de arriba.
        pause
        exit /b 1
    )
)

echo Iniciando Multi Chat Overlay...
call npm start

echo.
echo La app se cerro. Presiona una tecla para salir de esta ventana.
pause >nul
