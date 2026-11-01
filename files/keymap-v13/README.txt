C100 MIDI controller - v13 (work in progress)
=============================================

WHAT TO DO
1. Build the firmware on your PC:   double-click  "Build C100.bat"  (project folder). 1-3 minutes.
2. Flash it:                        double-click  "Flash C100.bat"   and pick keychron_c100_8k_midi_v13.bin
   (Unplug, hold the top-left key, plug in, let go after 3 seconds. If it ever does not start: use the RESET button.)
3. Open the pages (double-click):
   C100_guide.html             the guide: every layer and page, with animations   <- start here
   C100_virtual_keyboard.html  the board in your browser (test before flashing)
   C100_keymap_planner.html    design your own layout
   C100_keycap_designer.html   keycap legends: each key split in up to 4 sections (layer 1 / 2 / 3, the 4th left empty), colour-coded
   C100_keycaps_layout.svg     the whole keyboard at real size (print it or send it to a keycap shop); _dark = for dark caps
   keycap-labels-v13.txt       the same as a text list

WHAT IS NEW IN v13
- Layer 4 now has 3 pages: Random walk, Pond, Constellation. The other five pages (Dynamic macros, Turing machine,
  Bouncing balls, LFO test, MIDI Echo) are archived in tools\archive (see RESTORE.txt there).
- SHIFT ONLY NAVIGATES: hold Shift (R1C3) + the 4 arrows = layer / page. Every other job has its own key:
  Ableton record R4C9, Redo R4C10, Ableton Quantize R6C9, Clock source R6C10 (Auto / Internal only), Rolled chords R8C9
  (tap = on / off, hold + arrows = settings). Delete: double-tap = clear all. Copy: double-tap = paste.
  The default knob keys in columns 9-10 are gone (layer 2 page 4 has 32 knobs).
- Layer 2: page 1 (Launcher) has Undo / Redo, Ableton record / Quantize, launch selected, clip on / off on the side keys.
  Page 2 XY effects: effect 1-8 = channels 9-16. Page 4 = 32 knobs, always on (channel 15). Page 5 = Ableton shortcuts.
- Layer 3 page 1 (Step recorder): metronome R3C9, direction R3C10, rate R4C9, swing R4C10 (hold + arrows).
- Layer 3 page 3 (Euclid, 8 steps per lane): arrows up / down = pick the lane, left / right = start point. HOLD Length (R1C1),
  Hits (R2C1) or Variation (R1C2) first to change those.
- Layer 3 page 4 (CC sequencer): 4 lanes x 8 steps (rows 3-6). Not recording = pads are live faders. Record R7C9: tap a step,
  then a pad 1-8 for its value; double-tap a step = on / off. Mute R3C9-R6C9, Learn R3C10-R6C10 (move a knob on your synth).
  Row 9 = 8 effect layers (tap = select, tap again = on / off; every layer that is on plays). Default channel 14.
- Layer 4: Random walk and Pond settings are keys you HOLD while you tap the arrows. Pond has 3 new settings
  (reach, note length, max ripples). Layer 4 now has 3 pages; the old pages are archived (tools\archive).
- LED colours = keycap colours: layer 1 amber, layer 2 blue, layer 3 green (layer 4 keeps its own).
- Keycaps: C100_keycap_designer.html and C100_keycaps_layout.svg; each key has up to 4 sections (the 4th is left empty).
- Firmware build: chip flash is 256 KB (rules.mk has the lines for it). Size now about 122 KB.
- New: the guide (C100_guide.html) and the video scripts (folder "video scripts" in the project folder).

STILL OPEN: more Walker and Pond ideas,
the two-board build (postponed). The guide and the video scripts are updated after each change.

HOW TO REBUILD THE PAGES
Double-click "Build pages and guide.bat" in the project folder. It rebuilds the planner, the virtual keyboard
and the guide from the layout file (c100-layout-v13.txt) and the program files in the tools folder.

FILES
keymap.c, rules.mk, config.h     the firmware source (Build C100.bat uses these)
c100-layout-v13.txt              the layout (paste into the planner: "Load an earlier export")
keychron_c100_8k_midi_v13.bin    the built firmware (made by Build C100.bat)
tools\                           generators and tests. tools\guide = the guide, tools\archive = the archived pages
