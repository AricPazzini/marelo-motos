@echo off
chcp 65001 > nul
title Marelo Motos - Recriar banco de dados
cd /d "%~dp0"

echo.
echo   RECRIAR O BANCO DE DADOS
echo.
echo   Isso devolve o sistema ao estado inicial de teste.
echo   O banco atual sera guardado em banco\anteriores, entao
echo   nada do que voce digitou sera perdido de verdade.
echo.
echo   IMPORTANTE: feche antes a janela do sistema (INICIAR.bat).
echo.
pause

node ferramentas/recriar-banco.js
echo.
pause
