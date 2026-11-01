@echo off
setlocal
title C100 pages and guide
cd /d "%~dp0"
set "B_NODE=C:\Program Files\nodejs\node.exe"
set "B_DIR=%~dp0files\keymap-v13"
echo.
echo  ===== Rebuild the planner, the virtual keyboard and the guide =====
echo.
if not exist "%B_NODE%" ( echo  Node.js was not found at %B_NODE% & goto end )
cd /d "%B_DIR%"
echo  1. Planner and virtual keyboard...
"%B_NODE%" tools\html\build_html.js || goto fail
echo  2. Guide...
"%B_NODE%" tools\guide\build_guide.js || goto fail
echo  3. Keycap designer and printable keycap sheet...
"%B_NODE%" tools\keycaps\build_keycaps.js || goto fail
echo.
echo  Done. Open these files in your browser (double-click):
echo    %B_DIR%\C100_guide.html
echo    %B_DIR%\C100_virtual_keyboard.html
echo    %B_DIR%\C100_keymap_planner.html
echo    %B_DIR%\C100_keycap_designer.html   (and C100_keycaps_layout.svg)
goto end
:fail
echo.
echo  Something went wrong. Copy the lines above and send them to Claude.
:end
echo.
pause
