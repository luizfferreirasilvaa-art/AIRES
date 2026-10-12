@echo off
title AIRES - Execution Engine (Servidor Local)
echo ========================================================
echo               AIRES - EXECUTION ENGINE
echo ========================================================
echo.
echo Iniciando servidor em http://localhost:8088 ...
echo Acessivel tambem na rede local pelo seu IP ou celular.
echo.

"C:\laragon\bin\php\php-8.4.21-Win32-vs17-x64\php.exe" -S 0.0.0.0:8088 -t public public/index.php
pause
