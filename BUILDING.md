# Building the firmware yourself

> ## ⚠️ Tested on Windows only
> Everything here (the `.bat` files and these steps) was written and tested on **Windows 11**. It has **not** been tried on macOS or Linux. QMK itself builds on those systems, but the helper files in this project will not run there.
>
> You do **not** need to build anything to use the keyboard: the ready-made `keychron_c100_8k_midi_v13.bin` is in `files/keymap-v13/`. Build only if you change the layout or the code.

## What you need (one time)

| Tool | What it is for | Where to get it |
|---|---|---|
| **QMK MSYS** | The compiler and build tools. **It also contains gcc** (see "Installing gcc" below). | <https://msys.qmk.fm> |
| **Git for Windows** | Downloads the Keychron QMK source. | <https://git-scm.com/download/win> |
| **Node.js** (LTS) | Makes `keymap.c` from the layout file and rebuilds the guide, planner and virtual keyboard. | <https://nodejs.org> |
| **Keychron QMK source** | Keychron's copy of QMK, branch `2025q3`. It holds the C100 8K board definition. About 1 GB with its parts. | downloaded by `Set up building.bat` (Step 3) |

GitHub Desktop is **not** enough for Git: it keeps its own copy of Git hidden and does not put it on the PATH.

## Step 1: install QMK MSYS

1. Go to <https://msys.qmk.fm> and download **QMK_MSYS.exe**.
2. Run it and accept the **default folder `C:\QMK_MSYS`**. Choose another folder only if you must (then see "Custom locations").
3. Let it finish. You do not need to open it afterwards: `Build C100.bat` starts it by itself.

## Step 2: install Git and Node.js

Run both installers with the default options. Open a new PowerShell window and check:

```
git --version
node --version
```

Both should print a version number.

## Step 3: download the Keychron QMK source

Double-click **`Set up building.bat`**. It:

1. checks that QMK MSYS, Git and Node.js are there and tells you what is missing,
2. asks where to put the Keychron QMK source (press **Enter** for the default `C:\Users\<you>\qmk_keychron`, or type your own folder),
3. downloads it (several minutes).

The same thing by hand, in PowerShell:

```
git clone --branch 2025q3 --depth 1 --recurse-submodules --shallow-submodules https://github.com/Keychron/qmk_firmware.git "$env:USERPROFILE\qmk_keychron"
```

The download is finished when the folder `keyboards\keychron\c100_8k` exists inside it.

## Step 4: build

Double-click **`Build C100.bat`** (1-3 minutes). It makes `keymap.c` from the layout file, compiles, checks that the file has the 256 KB flash setting, and saves `keychron_c100_8k_midi_v13.bin` in `files/keymap-v13/`. Then flash it with `Flash C100.bat`.

## Custom locations (your own folders)

By default the build looks here:

| Thing | Default |
|---|---|
| Keychron QMK source | `C:\Users\<you>\qmk_keychron` |
| QMK MSYS | `C:\QMK_MSYS` |
| Node.js | `C:\Program Files\nodejs\node.exe` |

If yours are somewhere else (another drive, a folder with spaces, ...) there are two ways:

**A. Let the build ask you.** If `Build C100.bat` cannot find QMK MSYS or the Keychron source, it says so and asks for the folder. Type it once; it is saved for next time. The same prompt is in `Set up building.bat` for the QMK source.

**B. Write it in a file.**

1. Copy `build-locations.example.txt` and name the copy **`build-locations.txt`** (same folder as `Build C100.bat`).
2. Open it in Notepad, remove the `#` in front of the line you want, and write your folder:

   ```
   QMK=D:\firmware\qmk_keychron
   MSYS=D:\QMK_MSYS
   NODE=D:\tools\nodejs\node.exe
   ```

   No quotes, even with spaces. A line that is missing keeps its default. Lines starting with `#` are ignored.
3. Save. Both `.bat` files read this file every time.

How to check: `QMK` must be the folder that **contains** `keyboards`. `MSYS` must be the folder that contains `usr` and `mingw64`.

## Installing gcc (only for the tests)

`Build C100.bat` does **not** need gcc from you: QMK MSYS has its own. You only need gcc to run the **test** that compares the simulator with the firmware code (`node hosttest.js`).

**Easiest: use the gcc that comes with QMK MSYS.** It is already installed in Step 1, at `C:\QMK_MSYS\mingw64\bin\gcc.exe`. Put that folder first on the PATH for the current PowerShell window, then run the test:

```
$env:Path = "C:\QMK_MSYS\mingw64\bin;" + $env:Path
gcc --version
cd files\keymap-v13\tools\hosttest
node hosttest.js
```

`gcc --version` must print a version. The test ends with `All tests passed: engine.js and keymap.c send the same MIDI.` (about 70 scenarios).

To make that permanent: Start menu > "Edit the system environment variables" > Environment Variables > select **Path** under "User variables" > Edit > New > `C:\QMK_MSYS\mingw64\bin`. Open a new PowerShell window afterwards.

**Alternative, without QMK MSYS** (not tested here): any gcc for Windows that works in PowerShell, for example the MinGW-w64 build from <https://winlibs.com>. Check that `gcc --version` works in a new PowerShell window.

## If the build fails

| What you see | What to do |
|---|---|
| "QMK MSYS was not found" | Do Step 1, or give your folder (Custom locations). |
| "The Keychron QMK source was not found" | Run `Set up building.bat`, or give your folder. |
| "git was not found" in the set-up | Install Git for Windows (Step 2), then open a new window. |
| The set-up download stops or fails | Check your internet, delete the half-downloaded folder, run it again. |
| "STOP: the file does not have the 256 KB setting" | `rules.mk` in `files/keymap-v13` lost its `MCU_LDSCRIPT` and `OPT_DEFS` lines. Restore them from the repository. The build will not save a file without them, because such a firmware can erase itself on the first start. |
| `BUILD FAILED` with compiler messages | Read the last lines above it. A typical cause is a typo in a changed layout or code file. Undo the last change and build again. |
| A path with an apostrophe `'` in it | Not supported. Use a folder without one. |
