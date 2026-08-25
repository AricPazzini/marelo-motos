@echo off
chcp 65001 > nul
title Marelo Motos - Publicar no GitHub Pages
cd /d "%~dp0"

echo.
echo   PUBLICAR A DEMONSTRACAO NO GITHUB PAGES
echo.
echo   Isso gera a pasta site\ e envia para o GitHub.
echo   O link publico e:
echo   https://aricpazzini.github.io/marelo-motos/
echo.
pause

node ferramentas/gerar-site.js
if errorlevel 1 goto :erro

node ferramentas/publicar-site.js
if errorlevel 1 goto :erro

echo.
echo   Pronto! O GitHub leva ate 2 minutos para atualizar a pagina.
echo.
pause
exit /b 0

:erro
echo.
echo   Algo deu errado. Leia a mensagem acima.
echo.
pause
