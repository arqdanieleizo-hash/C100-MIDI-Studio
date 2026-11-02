@echo off
setlocal EnableDelayedExpansion
title C100 build set-up
cd /d "%~dp0"
rem Tested on Windows only.
echo.
echo  ===== C100 build set-up  (tested on Windows only) =====
echo.
echo  This checks the tools you need to build the firmware and downloads the Keychron QMK source.
echo  Details: BUILDING.md
echo.

set "B_QMK=%USERPROFILE%\qmk_keychron"
set "B_MSYS=C:\QMK_MSYS"
if exist "%~dp0build-locations.txt" for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%~dp0build-locations.txt") do (
  if /i "%%A"=="QMK" set "B_QMK=%%B"
  if /i "%%A"=="MSYS" set "B_MSYS=%%B"
)

rem ---- 1. QMK MSYS (the compiler tools; it also contains gcc) ----
if exist "%B_MSYS%\usr\bin\bash.exe" ( echo  [OK] QMK MSYS found: %B_MSYS% ) else (
  echo  [MISSING] QMK MSYS was not found at %B_MSYS%
  echo            1. Download and run QMK_MSYS.exe from  https://msys.qmk.fm
  echo            2. Keep the default folder C:\QMK_MSYS ^(or write your folder in build-locations.txt, see BUILDING.md^)
  echo            3. Run this file again.
  echo.
)

rem ---- 2. Git ----
set "B_GIT="
for /f "delims=" %%G in ('where git 2^>nul') do if not defined B_GIT set "B_GIT=%%G"
if defined B_GIT ( echo  [OK] Git found: !B_GIT! ) else (
  echo  [MISSING] Git was not found. Install "Git for Windows" from https://git-scm.com/download/win
  echo            ^(GitHub Desktop alone is not enough: it does not put git on the PATH^). Then run this file again.
  goto end
)

rem ---- 3. Node.js (makes keymap.c from the layout file) ----
where node >nul 2>nul && ( echo  [OK] Node.js found ) || ( if exist "C:\Program Files\nodejs\node.exe" ( echo  [OK] Node.js found ) else ( echo  [MISSING] Node.js: install the LTS version from https://nodejs.org ) )

rem ---- 4. the Keychron QMK source ----
echo.
if exist "%B_QMK%\keyboards\keychron\c100_8k" (
  echo  [OK] Keychron QMK source found: %B_QMK%
  goto done
)
echo  The Keychron QMK source (about 1 GB with its parts) will be downloaded to:
echo    %B_QMK%
echo  Press Enter to use that folder, or type another folder (it must NOT exist yet, or be empty).
set "B_ASK="
set /p "B_ASK= Folder: "
if not "%B_ASK%"=="" (
  set "B_QMK=%B_ASK%"
  >>"%~dp0build-locations.txt" echo QMK=!B_ASK!
  echo  Saved your folder in build-locations.txt
)
echo.
echo  Downloading (branch 2025q3). This takes several minutes. Please wait...
git clone --branch 2025q3 --depth 1 --recurse-submodules --shallow-submodules https://github.com/Keychron/qmk_firmware.git "%B_QMK%"
if errorlevel 1 ( echo. & echo  The download failed. Check your internet connection and run this file again. & goto end )
if not exist "%B_QMK%\keyboards\keychron\c100_8k" ( echo  The download finished but the C100 8K board files are missing. & goto end )
echo.
echo  [OK] Keychron QMK source downloaded.

:done
echo.
echo  Set-up finished. Now double-click "Build C100.bat".
:end
echo.
pause
