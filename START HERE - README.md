# START HERE: C100 8K MIDI controller, custom firmware v13

This is a custom MIDI firmware for the **Keychron C100 8K** (100 keys: an 8x8 pad grid, two control rows on top, two side columns). It adds 4 layers of pages: keyboards, Ableton control, sequencers and generative music, plus a guide, a planner, a virtual keyboard and a keycap designer.

**Credits and licence:** this project started from the idea and the first firmware by [FingerDrum Labo](https://github.com/FingerDrumLabo/keychron-c100-midi), and is built on [QMK](https://qmk.fm) and the Keychron QMK fork. Both are GPL, so this project is released under the **GNU GPL v2** (see `LICENSE`).

> ## ⚠️ Tested on Windows only
> The `.bat` files (flashing and building) were written and tested on **Windows 11**, not on macOS or Linux. To build the firmware yourself, read **[BUILDING.md](BUILDING.md)** first.

> Only flash a **C100 8K**. Never flash another Keychron board with these files.
> After flashing, the keyboard stops typing and becomes a MIDI device. To go back, flash the stock firmware (below).

---

## 1. I just want to use it (3 steps)

1. **Flash:** put the keyboard in flash mode (unplug, hold the **top-left key**, plug in, let go after 3 seconds), then double-click **`Flash C100.bat`** and pick `keychron_c100_8k_midi_v13.bin`.
2. **Ableton Live:** Preferences > Link / Tempo / MIDI. Switch **Track** (and **Remote**) *On* for "Keychron C100 8K". On a MIDI track set *MIDI From* = Keychron C100 8K and arm it.
3. **Learn the board:** open **`C100_guide.html`** (below). Each page has a labelled key map, because the keys have no printed labels.

If anything goes wrong, use the tiny **RESET** button inside the keyboard (hold it while plugging in), then flash again. Flash mode is in the chip and always works.

Firmware files (in `files/keymap-v13/`):

| File | What it is |
|---|---|
| `keychron_c100_8k_midi_v13.bin` | The custom MIDI firmware (v13) |
| `c100_8k_STOCK.bin` | The original Keychron firmware, to go back to normal typing |

---

## 2. The tools (all are single HTML files: double-click to open, no install)

They are all in `files/keymap-v13/`. They are generated from one layout file, so they always agree with each other and with the firmware.

| Tool | What it is for |
|---|---|
| **`C100_guide.html`** : the guide | Start here. Explains every layer and page with a **labelled key map** of all 100 keys, an animated demo you can play, pause and step through, and the MIDI each press sends. It also covers the arpeggiator, rolled chords, effects, the control keys, a MIDI message table, and step-by-step pages for **flashing (DFU)** and **compiling**. The animations run the same program as the keyboard, so they are not recordings. |
| **`C100_virtual_keyboard.html`** : the virtual keyboard | The whole board in your browser. Click or touch keys, hold keys for the "hold + arrows" settings, and watch the MIDI messages. It can send to a real MIDI output in a browser that supports it. **Use it to test a change before you flash.** |
| **`C100_keymap_planner.html`** : the planner | Design your own layout. Click a key, pick its job from the list (note, chord, knob, shortcut, sequencer step ...), or select a block and use **Fill**. Add notes to keys and pages (they appear in the guide). At the bottom is an **export text**: copy it into `c100-layout-v13.txt` and rebuild. The planner can only re-arrange jobs that already exist in the firmware. A brand-new behaviour needs new firmware code. |
| **`C100_keycap_designer.html`** : the keycap designer | Design printed keycap legends. Every key can be split into up to 4 sections (layer 1, layer 2, layer 3 first page; the 4th is left empty). Colour-coded per layer, and the colours match the LED colours on the keyboard (layer 1 amber, layer 2 blue, layer 3 green). |
| **`C100_keycaps_layout.svg`** (and `_dark.svg`) | The whole keyboard at real size, ready to print or send to a keycap shop. `_dark` is for dark keycaps. |
| **`keycap-labels-v13.txt`** | The same keycap legends as a plain text list. |
| **`c100-layout-v13.txt`** | **The layout file**: the single source of truth for what every key does. The planner reads and writes it; the build uses it to make the firmware. Keep a backup before you change it. |
| **`video scripts/`** | A series of 12 episode scripts (plus an overview) for making tutorial videos. |

---

## 3. The batch files (Windows)

They are in the main folder of this project. Double-click them.

| File | What it does |
|---|---|
| **`Flash C100.bat`** | Writes a `.bin` to the keyboard with dfu-util (included in `flash tool/`). Shows a list of firmware files (newest first), or drag a `.bin` onto it. Details: `How to flash the C100.txt`. |
| **`Set up building.bat`** | One time: checks QMK MSYS, Git and Node.js, and downloads the Keychron QMK source. See `BUILDING.md`. |
| **`Build C100.bat`** | Compiles the firmware on your PC (1-3 minutes, no GitHub needed). Makes `keymap.c` from the layout file, builds with QMK, and saves the `.bin` next to it. It refuses a file that lacks the 256 KB flash setting. Uses your own folders if you list them in `build-locations.txt` (copy `build-locations.example.txt`). |
| **`Build pages and guide.bat`** | Rebuilds the planner, the virtual keyboard, the guide and the keycap designer from the layout file. Run it after you change the layout. |

**One-time set-up for building** (only if you want to compile yourself): Node.js, the QMK MSYS tools in `C:\QMK_MSYS`, and the Keychron QMK source in `C:\Users\<you>\qmk_keychron`. The `.bat` files have these paths at the top; change them if yours are different. Flashing needs none of this.

**Windows USB driver:** if Windows does not see the keyboard in flash mode, install the **WinUSB** driver once with [Zadig](https://zadig.akeo.ie/). Select "DFU in FS Mode", check the USB ID is **2E3C : DF11**, and install WinUSB. Never do this for another device.

---

## 4. Changing what the keys do (the workflow)

1. Open the **planner**, change keys, copy the export text at the bottom.
2. Paste it into `files/keymap-v13/c100-layout-v13.txt` (back up the old one first).
3. Run **`Build pages and guide.bat`**, then try the change in the **virtual keyboard**.
4. Run **`Build C100.bat`** to make the new `.bin`.
5. Flash it with **`Flash C100.bat`**.

## 5. What is inside `files/keymap-v13/tools/`

For people who want to change the program itself.

| Folder / file | What it is |
|---|---|
| `core.js` | Key types, the layout file reader and writer |
| `engine.js` | The simulator used by the virtual keyboard and the guide |
| `keymap_template.c` | The firmware program (the same behaviour as `engine.js`, in C) |
| `gen_keymap.js` | Makes `keymap.c` from the layout file and the template |
| `build_layout_v13.js` | Builds the v13 layout from the v12 layout |
| `html/`, `guide/`, `keycaps/` | Generators for the planner / virtual keyboard, the guide and the keycap tools |
| `hosttest/` | A test that runs the simulator and the compiled firmware side by side and checks that they send exactly the same MIDI (about 70 scenarios) |
| `archive/` | Pages removed from layer 4, with instructions to restore them |

Rule: when you change a behaviour, change `engine.js` and `keymap_template.c` together, then run the test in `hosttest/` (`node hosttest.js`, needs Node.js and gcc).

---

## 6. The four layers in one minute

Hold **Shift** (R1C3) and tap the four arrow keys (top right): up / down = layer, left / right = page. Shift does nothing else.

| Layer | What it is |
|---|---|
| 1. Keyboards | Composer (drums + mini sequencer + 2 pianos), chromatic, in-key, chords, harmony, multi channel, microtonal |
| 2. Ableton control | Clip launcher, XY effects, macro faders, 32 knobs, shortcuts |
| 3. Sequencers | Step recorder, drum sequencer, Euclidean rhythms (8 steps), CC sequencer (4 lanes, 8 effect layers, learn) |
| 4. Generative (experimental) | Random walk, Pond, Constellation |

Many settings are keys you **hold while you tap the arrows** (scale, root, tempo, octave, channel ...).

---

## 7. Putting this on GitHub as your own project

In GitHub Desktop: **File > Add local repository**, choose this folder, and when it says it is not a repository click **create a repository**. Then **Commit to main** and **Publish repository** (untick "Keep this code private" only if you want it public).

The folder is about 22 MB, mostly the dfu-util tool in `flash tool/`. For a smaller upload, delete `flash tool/` first (then download dfu-util from its website, see the guide).
