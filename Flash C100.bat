@echo off
setlocal EnableDelayedExpansion
title C100 flasher
cd /d "%~dp0"
set "DFU=%~dp0flash tool\dfu-util-0.11-binaries\dfu-util-0.11-binaries\win64\dfu-util.exe"
echo.
echo  ===== C100 8K flasher =====
echo.
if not exist "%DFU%" (
  echo  dfu-util.exe not found at:
  echo  %DFU%
  goto end
)

rem ---- 1. which firmware: a .bin dropped on this file, or pick from a list ----
set "BIN=%~1"
if not "%BIN%"=="" goto have_bin

echo  Firmware files, newest first (this folder and your Downloads):
echo.
set /a N=0
for /f "delims=" %%F in ('powershell -NoProfile -Command "$a = @(Get-ChildItem -Path '%~dp0' -Recurse -Filter *.bin -ErrorAction SilentlyContinue) + @(Get-ChildItem -Path \"$env:USERPROFILE\Downloads\" -Filter *.bin -ErrorAction SilentlyContinue); $a | Sort-Object LastWriteTime -Descending | Select-Object -First 15 | ForEach-Object { $_.FullName }"') do (
  set /a N+=1
  set "F!N!=%%F"
  for %%G in ("%%F") do echo   !N!. %%~nxG    ^(%%~tG, %%~dpG^)
)
if !N!==0 (
  echo  No .bin files found. Drag a .bin onto this file instead.
  goto end
)
echo.
set "PICK="
set /p "PICK= Type a number and press Enter (1 = newest): "
if "%PICK%"=="" set "PICK=1"
if not defined F%PICK% (
  echo  Not a number from the list.
  goto end
)
set "BIN=!F%PICK%!"

:have_bin
echo.
echo  Firmware: %BIN%
echo.

rem ---- safety: a firmware built for 128 KB must end before the saved settings at 124,928 bytes ----
powershell -NoProfile -Command "$b = [IO.File]::ReadAllBytes($env:BIN); $h = [BitConverter]::ToString($b) -replace '-',''; if ($h.Contains('0000000800000200') -and $b.Length -gt 124928) { exit 1 } else { exit 0 }"
if errorlevel 1 (
  echo  STOP: this firmware is too big for the 128 KB setting. It would erase part of itself
  echo  and the keyboard would not start. Build it with the 256 KB lines in rules.mk.
  goto end
)

rem ---- 2. wait for flash mode ----
echo  Put the C100 in flash mode now:
echo    1. Unplug it.  2. Hold the top-left key.  3. Plug it in, keep holding 3 seconds, let go.
echo.
echo  Waiting for the C100 (up to 2 minutes)...
set /a W=0
:wait
"%DFU%" -l 2>nul | findstr /i "2e3c:df11" >nul
if not errorlevel 1 goto found
set /a W+=1
if !W! geq 120 (
  echo.
  echo  The C100 did not appear in flash mode. Unplug it and try again.
  goto end
)
timeout /t 1 /nobreak >nul
goto wait

rem ---- 3. flash ----
:found
echo  Found it. Flashing - do not unplug...
echo.
set "LOG=%TEMP%\c100_flash.log"
"%DFU%" -d 2e3c:df11 -a 0 -s 0x08000000:leave -D "%BIN%" > "%LOG%" 2>&1
findstr /i /c:"downloaded successfully" /c:"Download done" "%LOG%" >nul
if not errorlevel 1 (
  echo  =====================================
  echo   Done. The C100 restarts by itself.
  echo  =====================================
) else (
  type "%LOG%"
  echo.
  echo  Flashing did not finish. Put the C100 in flash mode again and run this file again.
  echo  Your board is safe: flash mode always works.
)

:end
echo.
pause
