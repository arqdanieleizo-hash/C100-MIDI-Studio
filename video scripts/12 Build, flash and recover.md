# Episode 12: Build, flash and recover

**Length:** about 5:00  **Status:** matches firmware v13
**Goal:** the viewer goes from a saved layout to a working keyboard, knows the safety checks, and can rescue a keyboard that does not start.
**Prepare:** the project folder; `Build C100.bat`, `Flash C100.bat`; the layout file; the keyboard; a close-up of the RESET button on **your** keyboard; an old firmware (a v11 or the stock .bin) to demonstrate going back.

## Scenes

| # | Time | On screen | Voice-over | Notes |
|---|------|-----------|------------|-------|
| 1 | 0:00 | Montage: layout file, black terminal window, keyboard lighting up. | "From a text file to a working keyboard in about three minutes." | |
| 2 | 0:10 | Diagram (draw it): Layout file, keymap, firmware, keyboard. | "Here is the whole path. Your layout file becomes a key map, the key map is compiled into a firmware file, and the firmware is flashed to the keyboard. Two double-clicks do everything." | Animated arrows. |
| 3 | 0:40 | Double-click `Build C100.bat`: "Making keymap.c from the layout file", then the compile messages. | "Double-click Build C100. First it makes the key map from your layout file. Then it compiles the firmware. This takes one to three minutes." | Speed up the compile 4x. |
| 4 | 1:25 | The "Done. Firmware saved as…" box: file name and size. | "When it says Done, you get a firmware file, and its size. This one is about a hundred and twenty thousand bytes." | Zoom the size. |
| 5 | 1:45 | Two safety checks: the 256 KB message and the Flash tool's refusal (shown as a graphic). | "Two safety checks protect you. The builder refuses to save a file that does not have the two-hundred-and-fifty-six kilobyte setting. And the flasher refuses any file that would overwrite its own settings area. The keyboard has twice the memory its default build assumed, and the build now knows." | Keep it short; one graphic. |
| 6 | 2:20 | Double-click `Flash C100.bat`; choose the file; flash mode; Done. | "Now flash it, exactly as in episode two: list, number, hold the top-left key while plugging in, wait for Done." | Repeat only the key steps. |
| 7 | 3:00 | Test: the guide and the keyboard side by side. | "Test the keys that you changed. If the lights and the messages match the guide, you are done." | |
| 8 | 3:20 | **If the keyboard does not start.** Black screen / no USB sound. | "Now the part everyone fears: what if the keyboard does not start? The key trick, hold the top-left key, only works if the firmware is running. So use the real safety net." | Dramatic but calm. |
| 9 | 3:45 | The RESET button, a hand holding it, plugging the cable. The flasher says "Found it". | "Inside the keyboard is a tiny reset button. Hold it while you plug in, and the keyboard goes into flash mode by itself. This mode lives in the chip, so a bad firmware cannot damage it." | **Film your own keyboard** and show where the button is. |
| 10 | 4:15 | Flash an older, known-good file (v11 or the stock firmware). | "Flash an older firmware that you know works, or the original stock firmware to get plain typing back. The keyboard is alive again." | Pill: "Keep one working .bin". |
| 11 | 4:40 | A list of folders: keymap-v11, v12, v13. | "Keep your old versions. Every version has its own folder with its own firmware file, so you can always go back." | |

## FAQ card (post as a pinned comment or end card)

- **The flasher never finds the keyboard.** Try another USB port or cable (some cables only charge). Unplug, hold the top-left key *before* plugging in, and keep holding for three seconds.
- **Windows does not recognise "DFU in FS Mode".** A driver (WinUSB, with the free Zadig tool) may be needed once.
- **Build fails.** Copy the red lines at the end of the window and send them to whoever helps you with the firmware.
- **The keyboard starts but the layout is old.** The Launcher keymap resets when you flash. Flash again with the build you want.
- **I want my normal keyboard back.** Flash the stock firmware (`c100_8k_STOCK.bin`).

## Closing

"That is the whole tool chain. You can play it, design it, build it and recover it. Thanks for watching."

## On-screen text

- "Layout file → keymap → firmware → keyboard"
- "Build C100.bat, then Flash C100.bat"
- "RESET button = always works"
- "Keep one working .bin"

## Narration only

From a text file to a working keyboard in about three minutes.

Here is the whole path. Your layout file becomes a key map, the key map is compiled into a firmware file, and the firmware is flashed to the keyboard. Two double-clicks do everything.

Double-click Build C100. First it makes the key map from your layout file. Then it compiles the firmware. This takes one to three minutes.

When it says Done, you get a firmware file, and its size. This one is about a hundred and twenty thousand bytes.

Two safety checks protect you. The builder refuses to save a file that does not have the two-hundred-and-fifty-six kilobyte setting. And the flasher refuses any file that would overwrite its own settings area. The keyboard has twice the memory its default build assumed, and the build now knows.

Now flash it, exactly as in episode two: list, number, hold the top-left key while plugging in, wait for Done.

Test the keys that you changed. If the lights and the messages match the guide, you are done.

Now the part everyone fears: what if the keyboard does not start? The key trick, hold the top-left key, only works if the firmware is running. So use the real safety net.

Inside the keyboard is a tiny reset button. Hold it while you plug in, and the keyboard goes into flash mode by itself. This mode lives in the chip, so a bad firmware cannot damage it.

Flash an older firmware that you know works, or the original stock firmware to get plain typing back. The keyboard is alive again.

Keep your old versions. Every version has its own folder with its own firmware file, so you can always go back.

That is the whole tool chain. You can play it, design it, build it and recover it. Thanks for watching.
