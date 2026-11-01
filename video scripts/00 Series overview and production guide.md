# C100 MIDI Controller: video series

**Working title:** *Turn a giant keyboard into a MIDI instrument*
**Format:** 12 episodes, 3 to 6 minutes each (about 55 minutes in total), plus short clips for social media.
**Matches:** firmware v13 with "step one" done: Shift only changes layer and page, every other job has its own key (see "What will change" at the end).
**Audience:** musicians who use Ableton Live (or another DAW) and are **not programmers**. They know what a note and a clip are, but not what firmware or a CC is. Every technical word is explained the first time it appears.
**Tone:** friendly, calm, practical. Short sentences. No jargon without a one-line explanation. Never say "simply" or "just".

---

## The episodes

| # | Title | Length | What the viewer can do afterwards |
|---|-------|--------|-----------------------------------|
| 01 | Meet the C100 MIDI controller | 3:30 | Explain what the board is and how it is organised |
| 02 | Get connected: flash it and set up Ableton | 4:30 | Put the firmware on the keyboard and see MIDI in Ableton |
| 03 | Navigation and the control keys | 4:00 | Move between layers and pages, change scale, root, tempo, octave |
| 04 | Layer 1, part 1: Composer, Chromatic, In key, Chords | 5:00 | Play drums, a melody and chords from the first four pages |
| 05 | Layer 1, part 2: Harmony, Multi channel, Microtonal | 4:30 | Use the three more advanced keyboards |
| 06 | Playing tools: arpeggiator, rolled chords, effects, latch | 4:30 | Add movement and effects to anything they play |
| 07 | Layer 2: control Ableton | 6:00 | Launch clips, ride faders, run an XY pad, use shortcuts and knobs |
| 08 | Layer 3: sequencers | 6:00 | Record a melody, build a drum loop, make Euclidean rhythms, sequence a synth parameter |
| 09 | Layer 4: music that plays itself | 4:00 | Use the three generative pages |
| 10 | The virtual keyboard and the guide | 3:00 | Try everything in the browser before flashing |
| 11 | The planner: design your own layout | 5:00 | Change what any key does |
| 12 | Build, flash and recover | 5:00 | Go from a new layout to a working keyboard, and fix a keyboard that will not start |

Every episode file contains: goal, what to prepare, a scene table (what is on screen, what the voice says, notes), a closing, on-screen text, and the **narration only** (for text-to-speech or a quick read-through).

## How the animations in the guide are used

`C100_guide.html` (in `files\keymap-v13`) runs the **real keyboard program** in the browser. For video:

1. Open the guide, jump to the page for the episode (the left menu).
2. Use **Step ▶** to move from caption to caption. Each step is one idea, so one step is usually one beat of the voice-over.
3. For smooth shots use **Play** at 1x. Use **0.5x** for fast things (arpeggios, sequencers).
4. Record the board area plus the caption bar and the "What the keyboard sends" box. They tell the story on their own.

In every scene table, "**Guide: L1P1**" means: use the demo with that id (Layer 1 Page 1). Other ids: `board`, `nav`, `controls`, `arp`, `roll`, `fx` (the intro sections).

Hardware shots (the real keyboard, hands) alternate with the animation: **real hands for feel, the animation for clarity**.

## Recording setup

- **Screen:** 1920x1080, 60 fps (OBS Studio is free). Browser zoom 100%, dark theme (the board lights read best on dark). Hide bookmarks and tabs.
- **Hardware camera:** top-down view of the keyboard (phone on a tripod or a desk arm), soft light from the side, no glare on the keycaps. A second angle from the front for hand shots.
- **Audio:** record the voice-over in a quiet room, close to the microphone, one take per scene so edits are easy. Record the keyboard's MIDI sounds **from the DAW** (clean), never from the room.
- **Ableton:** use a clean Live set with one instrument per demo (drum rack, an electric piano, a pad, a bass). Same set for the whole series so the sounds are consistent.
- **Music:** one soft instrumental loop under the intro and outro only. Voice-over scenes have no music (the instruments are the music).

## Visual style

- **Lower thirds:** key name in a white pill ("R1C3 Shift"), then a short label. Keep them on screen 2 seconds.
- **Colours** (match the guide): orange = control keys, blue = side keys, cyan = this key changes with the page.
- **Zoom:** when a caption says "R7C10", punch in on that key for 1 second.
- **Chapter markers** at every scene heading. Titles: sentence case, no clickbait.
- **Captions:** burn in or upload an SRT. The "Narration only" section in each file is the base for the subtitles.

## Pronunciation guide (for the voice-over)

| Word | Say |
|------|-----|
| MIDI | "MID-ee" |
| CC | "see-see" ("control change") |
| C100 | "see one hundred" |
| Ableton | "AB-el-ton" |
| MPE | "em-pee-ee" |
| Euclidean | "you-KLID-ee-an" |
| EDO | "ee-dee-oh" ("equal divisions of the octave") |
| BPM | "B-P-M" or "beats per minute" |
| DFU | not needed: say "flash mode" |
| Alberti | "al-BAIR-tee" |

## Short clips (30 to 60 seconds, vertical)

1. "Press a pad, hear a drum": the board lighting up (episode 01 cold open).
2. "One key, a whole chord": Chords page (episode 04).
3. "Hold ARP and twist": arpeggiator patterns (episode 06).
4. "Thirty-two knobs, always on": layer 2 page 4 (episode 07).
5. "Drop a pebble in the pond": Pond (episode 09).
6. "Flash it in 1 minute": Build and Flash (episode 12).

## Checklist before recording an episode

- [ ] The guide opens and the demo for the episode plays (use `Build pages and guide.bat` if you changed the layout).
- [ ] The keyboard has the **same firmware** as the guide (flash `keychron_c100_8k_midi_v13.bin`).
- [ ] Ableton is open with the demo set and the C100 is in the MIDI ports list with **Track** and **Remote** on.
- [ ] Voice-over script printed or on a second screen.
- [ ] Everything not needed is closed (chat, notifications).

## What will change (keep these episodes in sync)

The firmware work is not finished. After each item, re-run `Build pages and guide.bat` and update the matching episode:

| Change | Episodes to update |
|--------|--------------------|
| Euclidean: hold Length / Hits, start point (**done**, in episode 08) | 08 (done) |
| MIDI clock: Auto / Internal only (**done**, in episodes 03 and 08) | 03, 08 (done) |
| CC sequencer redesign (effect layers, learn, record; **done**, in episode 08; synth presets dropped) | 08 (done) |
| Walker and Pond live controls (list being agreed) | 09 |
| Two-board build (**postponed**) | 01, 12 (only when it comes back) |

Scenes that depend on those pages carry the mark **⚠ will change**.
