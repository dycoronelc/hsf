@echo off
setlocal

REM Verifica si se ha pasado un parametro
if "%~1"=="" (
    echo Error: No se proporciono un mensaje.
    echo Uso: %0 "Tu mensaje de commit"
    pause
    exit /b 1
)

REM 1) Mostrar lo que se va a commitear para que el usuario lo revise
echo.
echo ===== Archivos a incluir en el commit =====
git status --short
if errorlevel 1 (
    echo.
    echo Error: no se pudo ejecutar git status. Estas dentro de un repo?
    pause
    exit /b 1
)

REM 2) Avisar si se detectan archivos sospechosos (.env, *.log, node_modules, dist)
set "SOSPECHOSO="
for /f "delims=" %%F in ('git status --porcelain') do (
    echo %%F | findstr /R /C:"\.env" /C:"\.log" /C:"node_modules" /C:"/dist/" /C:"\\dist\\" >nul
    if not errorlevel 1 set "SOSPECHOSO=1"
)
if defined SOSPECHOSO (
    echo.
    echo  ATENCION: se detectaron archivos potencialmente peligrosos
    echo    .env / *.log / node_modules / dist
    echo    Revisa la lista de arriba antes de continuar.
)

REM 3) Confirmacion explicita antes de tocar nada
echo.
set /p CONFIRM="Continuar con add + commit + push a origin/main? (s/N): "
if /i not "%CONFIRM%"=="s" (
    echo Cancelado por el usuario. No se hizo ningun cambio.
    exit /b 0
)

REM 4) Ejecutar el flujo
git add .
if errorlevel 1 (
    echo Error en git add. Abortando.
    pause
    exit /b 1
)

git commit -m "%~1"
if errorlevel 1 (
    echo Error en git commit. Abortando.
    pause
    exit /b 1
)

git push origin main
if errorlevel 1 (
    echo.
    echo Error en git push. Revisa el mensaje de arriba.
    echo Si fue por push protection (secretos detectados), NO uses el link
    echo "allow secret" sin antes rotar la credencial expuesta.
    pause
    exit /b 1
)

echo.
echo Commit realizado con el mensaje: %~1
endlocal
