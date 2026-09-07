@echo off
cd /d "%~dp0server"
start "CAPTURED STUDIO SERVER" cmd /k "npm start"
exit