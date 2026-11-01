# Episode 11: The planner: design your own layout

**Length:** about 5:00  **Status:** matches firmware v13
**Goal:** the viewer changes what keys do and saves a layout that the build tools can use.
**Prepare:** `C100_keymap_planner.html` open; the layout file `c100-layout-v13.txt` (in `files\keymap-v13`) in a text editor; the virtual keyboard open for comparison.

> **Keep it honest:** the planner lets you **re-arrange what already exists**: any key can be given any of the existing jobs (a note, a chord, a knob, a shortcut, a sequencer step, and so on). A **brand-new behaviour** (a new kind of sequencer, for example) needs new firmware code. Say that clearly in scene 9.

## Scenes

| # | Time | On screen | Voice-over | Notes |
|---|------|-----------|------------|-------|
| 1 | 0:00 | The planner: the board, with the layer and page tabs on top. | "The planner is where you decide what every key does." | |
| 2 | 0:12 | Click a layer tab and a page tab. | "At the top are the four layers and their pages, plus a tab for the control keys that every page shares." | Pills: Layer 1-4, Controls. |
| 3 | 0:35 | Click a key; the details appear. | "Click a key. You see what it does now, and a list of everything it could do, in groups: notes, chords, controllers, sequencers, transport and more." | Slow. Show the groups. |
| 4 | 1:10 | Pick a new job for the key (for example a knob key, or a different note). | "Pick a job from the list, and the key changes. Each job has its own number: a note number, a knob's C C number, a step number." | |
| 5 | 1:45 | Select a block of keys; use the **Fill** panel (for example "In key"). | "To change many keys at once, select a block and use Fill. It can lay out an in-key keyboard, chords, an X Y pad, a clip launcher, faders, a step sequencer, and more." | Show the result on the board. |
| 6 | 2:30 | Tick the "Controls Shift held" box (only the navigation keys change). | "Shift now only changes layer and page, so this view shows just the four navigation keys. Every other job lives on its own key." | Show the 32 knobs in the shift view. |
| 7 | 3:10 | Write a note on a key; set the page name, colours and purpose. | "Every key and every page can have a note. Write what it does. Those notes show up in the guide, so your layout documents itself." | |
| 8 | 3:40 | Scroll to the bottom: the export text; copy it. Paste into `c100-layout-v13.txt` and save. | "When you are done, copy the text at the bottom. Paste it into your layout file, replacing what is there, and save. That file is the single source of truth." | Make a copy of the old layout first: "keep a backup". |
| 9 | 4:05 | Show a key type that does not exist. | "The planner can only use jobs that already exist in the firmware. If you want something new, describe it, and the firmware has to be extended. That is a separate job." | |
| 10 | 4:30 | Double-click `Build pages and guide.bat`; open the guide: the new notes appear. | "Run Build pages and guide, and the virtual keyboard and the guide are rebuilt from your layout. Then the keyboard itself: that is the next episode." | |

## Closing

"Design in the planner, save the text, build, flash. One more episode to go: build, flash and recover."

## On-screen text

- "Click a key, pick a job"
- "Fill = many keys at once"
- "Shift view = layer / page keys only"
- "Copy the text at the bottom into the layout file"

## Narration only

The planner is where you decide what every key does.

At the top are the four layers and their pages, plus a tab for the control keys that every page shares.

Click a key. You see what it does now, and a list of everything it could do, in groups: notes, chords, controllers, sequencers, transport and more.

Pick a job from the list, and the key changes. Each job has its own number: a note number, a knob's C C number, a step number.

To change many keys at once, select a block and use Fill. It can lay out an in-key keyboard, chords, an X Y pad, a clip launcher, faders, a step sequencer, and more.

Shift now only changes layer and page, so this view shows just the four navigation keys. Every other job lives on its own key.

Every key and every page can have a note. Write what it does. Those notes show up in the guide, so your layout documents itself.

When you are done, copy the text at the bottom. Paste it into your layout file, replacing what is there, and save. That file is the single source of truth.

The planner can only use jobs that already exist in the firmware. If you want something new, describe it, and the firmware has to be extended. That is a separate job.

Run Build pages and guide, and the virtual keyboard and the guide are rebuilt from your layout. Then the keyboard itself: that is the next episode.

Design in the planner, save the text, build, flash. One more episode to go: build, flash and recover.
