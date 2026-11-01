@echo off
setlocal EnableDelayedExpansion
title C100 builder
cd /d "%~dp0"
rem (variable names start with B_ because QMK's build reads variables like SRC and SH from the environment)
set "B_QMK=C:\Users\Pichau\qmk_keychron"
set "B_SH=C:\QMK_MSYS\usr\bin\bash.exe"
echo.
echo  ===== C100 8K builder =====
echo.
if not exist "%B_SH%" ( echo  QMK MSYS not found at C:\QMK_MSYS & goto end )
if not exist "%B_QMK%\keyboards\keychron\c100_8k" ( echo  Keychron QMK source not found at %B_QMK% & goto end )

rem ---- 1. which version folder: a folder dropped on this file, or the highest keymap-vNN ----
set "B_SRC=%~1"
if not "%B_SRC%"=="" goto have_src
for /f "delims=" %%D in ('powershell -NoProfile -Command "Get-ChildItem -Directory '%~dp0files' | Where-Object { $_.Name -match '^keymap-v(\d+)$' -and (Test-Path (Join-Path $_.FullName 'keymap.c')) } | Sort-Object { [int]($_.Name -replace '\D','') } -Descending | Select-Object -First 1 -ExpandProperty FullName"') do set "B_SRC=%%D"
if "%B_SRC%"=="" ( echo  No keymap-vNN folder with a keymap.c found in "files". & goto end )
:have_src
for %%N in ("%B_SRC%") do set "B_NAME=%%~nxN"
set "B_VER=%B_NAME:keymap-=%"
echo  Building from: %B_SRC%
echo.

rem ---- 1b. if the folder has a layout file and the generator, make keymap.c from the layout first ----
set "B_NODE=C:\Program Files\nodejs\node.exe"
set "B_LAY="
if exist "%B_SRC%\tools\gen_keymap.js" if exist "%B_NODE%" for /f "delims=" %%L in ('powershell -NoProfile -Command "Get-ChildItem -Path '%B_SRC%' -Filter c100-layout-v*.txt | Sort-Object { [int]($_.BaseName -replace '\D','') } -Descending | Select-Object -First 1 -ExpandProperty FullName"') do set "B_LAY=%%L"
if defined B_LAY (
  echo  Making keymap.c from the layout file: !B_LAY!
  "%B_NODE%" "%B_SRC%\tools\gen_keymap.js" "!B_LAY!" "%B_SRC%\tools\keymap_template.c" "%B_SRC%\keymap.c" || goto end
  echo.
)

rem ---- 2. copy the keymap files into the QMK source ----
set "B_KM=%B_QMK%\keyboards\keychron\c100_8k\keymaps\midi"
if not exist "%B_KM%" mkdir "%B_KM%"
copy /y "%B_SRC%\keymap.c" "%B_KM%\keymap.c" >nul || goto end
copy /y "%B_SRC%\rules.mk" "%B_KM%\rules.mk" >nul || goto end
if exist "%B_SRC%\config.h" copy /y "%B_SRC%\config.h" "%B_KM%\config.h" >nul
if not exist "%B_KM%\config.h" ( echo  config.h is missing. & goto end )

rem ---- 3. build (about 1-3 minutes) ----
echo  Building... this takes 1-3 minutes.
echo.
set "MSYSTEM=MINGW64"
"%B_SH%" -lc "cd /c/Users/Pichau/qmk_keychron && rm -f keychron_c100_8k_midi.bin && make keychron/c100_8k:midi -j8 > /tmp/c100_build.log 2>&1; tail -n 25 /tmp/c100_build.log" | findstr /v /c:"Welcome to QMK" /c:"Documentation:" /c:"Support:" /c:"If you have" /c:"run "
if not exist "%B_QMK%\keychron_c100_8k_midi.bin" (
  echo.
  echo  =====================================
  echo   BUILD FAILED. Copy the lines above and send them to Claude.
  echo  =====================================
  goto end
)

rem ---- 4. safety check: the 256 KB lines must be in the file ----
set "B_OUT=%B_SRC%\keychron_c100_8k_midi_%B_VER%.bin"
copy /y "%B_QMK%\keychron_c100_8k_midi.bin" "%B_OUT%" >nul
set "B_BIN=%B_OUT%"
powershell -NoProfile -Command "$b = [IO.File]::ReadAllBytes($env:B_BIN); $h = [BitConverter]::ToString($b) -replace '-',''; if ($h.Contains('0000000800000400')) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  del "%B_OUT%" >nul 2>&1
  echo.
  echo  =====================================
  echo   STOP: the file does not have the 256 KB setting. It was NOT saved.
  echo   Check that rules.mk in %B_SRC% has the MCU_LDSCRIPT and OPT_DEFS lines.
  echo  =====================================
  goto end
)
for %%S in ("%B_OUT%") do set "B_SIZE=%%~zS"
echo.
echo  =====================================
echo   Done. Firmware saved as:
echo   %B_OUT%
echo   Size: %B_SIZE% bytes. Safe to flash with Flash C100.bat.
echo  =====================================

:end
echo.
pause
