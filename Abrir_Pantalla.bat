@echo off
title Pantalla Interactiva UNA Puno - Auto Sync 15 Minutos
echo =================================================================
echo   PANTALLA DIGITAL INTERACTIVA UNA PUNO - SEÑALÉTICA KIOSK
echo   Actualización automática de Facebook (@unapunooficial) c/15 min
echo =================================================================

REM Iniciar sincronizador de Facebook en segundo plano (cada 15 min)
start /B "" python "%~dp0scripts\sync_facebook.py" --daemon

REM Iniciar ejecutable en modo kiosko pantalla completa
start "" "%~dp0PantallaInteractiva.exe"

REM Abrir navegador
start http://127.0.0.1:8080
exit
