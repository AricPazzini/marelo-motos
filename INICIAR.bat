@echo off
chcp 65001 > nul
title Marelo Motos - Sistema de Gestao
cd /d "%~dp0"

echo.
echo   ===================================================
echo    MARELO MOTOS - Sistema de Gestao
echo   ===================================================
echo.
echo   Iniciando o servidor...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [ERRO] O Node nao foi encontrado neste computador.
  echo.
  echo   Instale o Node.js versao 22 ou mais nova em:
  echo   https://nodejs.org
  echo.
  pause
  exit /b 1
)

start "" http://localhost:7820

node servidor/servidor.js

echo.
echo   O servidor foi encerrado.
pause
