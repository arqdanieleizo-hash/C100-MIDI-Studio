/* Keychron C100 8K -- MIDI controller, keymap v11: 4 main layers (1 keyboards, 2 Ableton, 3 sequencers, 4 macros + generative pages + LFO test),
 * Controls tables, palettes, step recorder, Polygene-style euclidean, effects key (R9C9).
 *
 * DO NOT EDIT THE TABLES BY HAND. The GENERATED section is made by gen_keymap.js from the layout text
 * (c100-layout-v11.txt, exported by the keymap planner). The rest is a port of engine.js (the simulator):
 * keep the two in step.
 *
 * HOW IT WORKS
 *   Navigation = the 4 top-right keys (R1C9, R1C10, R2C9, R2C10): arrows; with Controls Shift held: PG+, L+, PG-, L-.
 *   4 main layers: 7, 4, 3 and 1 pages. Each layer remembers its page. Sequencers only play on their own page.
 *   Control keys (rows 1-2, columns 9-10) come from the CONTROLS tables unless a page changes them (>C = Controls
 *   tables, >L = page 1 of the layer). Keys that change with the layer, the page or Controls Shift light cyan.
 *   Controls Shift (R1C3, hold): control keys use the Shift table (for example R2C4 = Ctrl+U, R1C5 = Ableton record).
 *   Hold a setting key (Scale, Root, Octave, Tempo, Channel, Volume, zone keys, polyrhythm and step recorder settings)
 *   and use the arrows: up / down = small step, right / left = big step. The value shows on the grid.
 *   ARP (R10C9): double-tap = arpeggiator on / off for everything you play; hold = arp settings on the top 4 grid rows.
 *   SUS (R10C10): hold = sustain (CC 64); double-tap = latch on / off.
 *   Ableton MIDI clock (Sync on for the C100 output) drives the sequencers when it is running.
 *
 * MIDI NUMBERS (map them in Ableton with MIDI Map, Remote on for the C100 input)
 *   Play CC 85, Stop CC 86, Record CC 87, Tap CC 88 (127 pressed / 0 released)
 *   Tempo CC 89 relative: 64 + change (map Ableton Tempo as Relative Binary Offset)
 *   Volume keys send CC 7 on their channel.
 *   Launcher (channel 16): clips = notes 0-63, track buttons 64-95, faders CC 40-79, macros CC 102-109.
 *   XY pad: CC 16-19. Shortcut page knobs: CC 20-35 on channel 15.
 *   Microtonal notes (Non-Western scales, layer 4 page 2) use MPE: channels 2-16 with pitch bend (BEND_RANGE semitones).
 */

#include QMK_KEYBOARD_H
#include "qmk_midi.h"
#include <stdlib.h>
#include <string.h>

/* ---------------- Settings you may want to change ---------------- */
#define KNOB_HOLD_MS    350     /* hold a knob / arrow key this long before it repeats */
#define KNOB_REPEAT_MS  50
#define SLOW_REPEAT_MS  100     /* repeat speed for tempo and arrow changes */
#define DOUBLE_TAP_MS   300     /* two presses this close = double-tap */
#define TEXT_MS         1500    /* how long a value stays on the grid after you let go */
#define PAGE_TEXT_MS    500     /* "P1".."P4" after a page change */
#define PB_STEP         1024
#define PB_MS           5
#define LFO_MS          10
#define XY_GLIDE_STEP   8
#define XY_GLIDE_MS     5
#define DIM_WHITE       60      /* "dim white" pads, 0-255 */
#define CTRL_WHITE      110     /* control keys at rest */
/*@ARCH mac #40@*/
#define BLINK_MS        250

/* ---------------- Fixed numbers (keep in step with the planner) ---------------- */
#define CC_PLAY 85
#define CC_STOP 86
#define CC_REC  87
#define CC_TAP  88
#define CC_TEMPO 89
#define GLOBAL_CH 255
#define DRUM_ZONE 19
#define MS_PAGE 0
#define KF(t, n, z, f) ((uint32_t)(((uint32_t)(f) << 24) | ((uint32_t)(t) << 16) | ((uint32_t)(z) << 8) | (n)))   /* f = page + 1, 0 = Controls */
#define CTRL_CYAN_R 0           /* control keys that change with the layer, page or Controls Shift */
#define CTRL_CYAN_G 190
#define CTRL_CYAN_B 255
/* step recorder (layer 3 page 1) */
#define SR_MAXN 6               /* notes per step */
#define SR_PREVIEW_MS 200
#define SR_CLICK 37             /* metronome note, on the drum channel */
#define SR_KICK 12              /* drum lane at power-up (R10C1) */
#define FX_TAP_MS 500           /* the effects key toggles on release if held less than this */
#define NUM_EL (24 + 4 + NUM_PAGES)   /* effects targets: zones 0-23, step recorder tracks 24-27, other pages 28 + page */
enum led_modes { LED_AUTO, LED_SOLID, LED_SCALE, LED_PIANO, LED_OFF };
#define K(t, n, z) ((uint32_t)(((uint32_t)(t) << 16) | ((uint32_t)(z) << 8) | (n)))
#define KTYPE(k) ((uint8_t)((k) >> 16))
#define KZONE(k) ((uint8_t)((k) >> 8))
#define KNUM(k)  ((uint8_t)((k) & 0xFF))

/*@@GENERATED@@*/

/* ---------------- Music tables ---------------- */
static const char note_text[12][3] = {"C ","C#","D ","D#","E ","F ","F#","G ","G#","A ","A#","B "};
#define NUM_CHORDS 13
static const char chord_code[NUM_CHORDS][3] = {"MJ","MN","D7","J7","N7","S2","S4","DM","AU","P5","A9","OC","IK"};
static const int8_t chord_iv[NUM_CHORDS][5] = {
    {0,4,7,-1,-1}, {0,3,7,-1,-1}, {0,4,7,10,-1}, {0,4,7,11,-1}, {0,3,7,10,-1}, {0,2,7,-1,-1}, {0,5,7,-1,-1},
    {0,3,6,-1,-1}, {0,4,8,-1,-1}, {0,7,12,-1,-1}, {0,4,7,14,-1}, {0,12,-1,-1,-1}, {-1,-1,-1,-1,-1}};
static const uint8_t harm_cnt[4] = {3, 4, 5, 3};
static const uint8_t harm_steps[4][5] = {{0,2,4}, {0,2,4,6}, {0,2,4,6,8}, {0,3,4}};
static const uint8_t harm_next[7] = {(1 << 3) | (1 << 4), 1 << 4, 1 << 5, (1 << 4) | 1, 1, (1 << 3) | (1 << 1), 1};   /* bit mask of likely next degrees */
static const uint8_t arp_num[8] = {2, 1, 2, 1, 1, 1, 1, 1};
static const uint8_t arp_den[8] = {1, 1, 3, 2, 3, 4, 6, 8};
static const uint8_t arp_gate[4] = {25, 50, 75, 100};
static const uint8_t fader_base[8] = {0, 0, 0, 0, 40, 48, 56, 72};
static const char sr_dir_code[4][3] = {"FW", "RV", "PP", "RN"};
static const char sr_rate_code[3][3] = {"8 ", "16", "32"};
static const char sr_mode_code[4][3] = {"  ", "VE", "PR", "RA"};
static const char eu_param_code[4][3] = {"LN", "HT", "SH", "VR"};
static const uint8_t sr_pp[6] = {12, 6, 3, 8, 4, 2};   /* clock pulses (24 per beat) per step: 1/8, 1/16, 1/32, then triplets */

/* ---- MIDI effects: 12 effects, 6 faders x 6 steps each ---- */
#define NUM_FX 12
static const uint8_t fx_nparams[NUM_FX] = {4, 3, 3, 3, 4, 5, 4, 3, 3, 3, 3, 3};
static const uint8_t fx_default[NUM_FX][6] = {
    {2,2,2,0}, {0,1,3}, {3,3,0}, {2,3,1}, {2,3,2,5}, {3,0,3,0,0}, {3,2,0,0}, {2,1,1}, {2,0,0}, {0,2,2}, {3,1,0}, {2,2,0}};
static const uint16_t rate_mb[6]  = {1000, 500, 333, 250, 167, 125};
static const uint16_t delay_mb[6] = {250, 333, 500, 750, 1000, 2000};
static const uint8_t dl_decay[6] = {90, 80, 70, 60, 50, 40};
static const int8_t  dl_shift[6] = {0, 12, -12, 7, 5, -5};
static const int8_t  ch_int[6]   = {12, -12, 7, 19, -24, 24};
static const uint8_t ch_off[6]   = {5, 10, 20, 30, 45, 60};
static const uint8_t ch_lvl[6]   = {30, 45, 60, 75, 90, 100};
static const uint8_t depth_p[6]  = {20, 35, 50, 65, 80, 100};
static const uint8_t rd_start[6] = {10, 20, 30, 40, 50, 60};
static const uint8_t width_p[6]  = {20, 36, 52, 68, 84, 100};
static const uint8_t ha_vel[6]   = {0, 40, 60, 80, 100, 127};
static const uint8_t gate_p[6]   = {20, 35, 50, 65, 80, 95};
static const uint8_t swing_p[6]  = {0, 8, 16, 25, 33, 42};
static const uint16_t ra_span[6] = {250, 500, 750, 1000, 1500, 2000};
static const uint8_t ra_decay[6] = {100, 90, 80, 70, 60, 50};
static const uint8_t st_speed[6] = {10, 20, 35, 50, 75, 100};
static const uint8_t ramp_p[6]   = {0, 5, 10, 15, 20, 25};
static const uint8_t fl_count[6] = {1, 1, 2, 2, 3, 3};
static const uint8_t fl_space[6] = {15, 25, 35, 50, 70, 100};
static const uint8_t fl_lvl[6]   = {20, 30, 40, 50, 60, 70};
static const uint8_t vb_depth[6] = {5, 10, 20, 35, 60, 100};
static const uint16_t vb_delay[6] = {0, 100, 200, 400, 700, 1000};
static const uint8_t hu_time[6]  = {0, 5, 10, 20, 30, 50};
static const uint8_t hu_vel[6]   = {0, 10, 20, 30, 45, 60};
static const uint8_t hu_note[6]  = {0, 5, 10, 20, 35, 50};
static const int8_t sine64[64] = {0,12,25,37,49,60,71,81,90,98,106,112,117,122,125,126,127,126,125,122,117,112,106,98,90,81,71,60,49,37,25,12,
    0,-12,-25,-37,-49,-60,-71,-81,-90,-98,-106,-112,-117,-122,-125,-126,-127,-126,-125,-122,-117,-112,-106,-98,-90,-81,-71,-60,-49,-37,-25,-12};

/* Position of every key, numbered 1-100 from the top-left, row by row. */
static const uint8_t key_pos[MATRIX_ROWS][MATRIX_COLS] = LAYOUT_tkl_ansi(
      1,   2,   3,   4,   5,   6,   7,   8,   9,  10,
     11,  12,  13,  14,  15,  16,  17,  18,  19,  20,
     21,  22,  23,  24,  25,  26,  27,  28,  29,  30,
     31,  32,  33,  34,  35,  36,  37,  38,  39,  40,
     41,  42,  43,  44,  45,  46,  47,  48,  49,  50,
     51,  52,  53,  54,  55,  56,  57,  58,  59,  60,
     61,  62,  63,  64,  65,  66,  67,  68,  69,  70,
     71,  72,  73,  74,  75,  76,  77,  78,  79,  80,
     81,  82,  83,  84,  85,  86,  87,  88,  89,  90,
     91,  92,  93,  94,  95,  96,  97,  98,  99, 100
);

enum { MIDIKEY = SAFE_RANGE };
const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
    [0] = LAYOUT_tkl_ansi(
        MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY,
        MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY,
        MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY,
        MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY,
        MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY,
        MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY,
        MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY,
        MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY,
        MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY,
        MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY, MIDIKEY
    ),
};

/* ---------------- State ---------------- */
typedef struct { bool held, locked; uint32_t last; } modkey_t;
static modkey_t m_lt;
static uint8_t  cur_layer = 0, cur_page = 0, slots[4];   /* page = layer * NUM_SLOTS + slot */
static int8_t   transpose = 0;
static bool     x_down = false, x_up = false;
static uint8_t  root = 0, scale = 0, bank_idx[2] = {0, 13}, gch = 0;
static bool     quant = false;
static uint8_t  vol[16];
static bool     cs_down = false, st_down = false, del_down = false;
static int8_t   sus_key = -1;

typedef struct { uint8_t ch; int8_t xp; bool chord; uint8_t ctype; bool fx; } zone_t;
static zone_t   zones[NUM_ZONES];
static uint8_t  kb_page = 0;

static bool     key_down[100];
static uint32_t held_key[100];
static uint8_t  held_ch[100];
static uint8_t  held_flags[100];        /* 1 arp, 2 fx, 4 arrow used, 8 quiet, 16 stop */
#define MAXKN 10
static uint8_t  key_notes[100][MAXKN];  /* notes each key is sounding, note + 1 */
static uint8_t  key_nch[100][MAXKN];
static bool     key_latched[100];
static uint8_t  lm_back[100];
static uint8_t  knob_val[128];
static uint8_t  fader_val[128];
static bool     cc_toggle[128];
static int8_t   rep_key = -1;
static uint8_t  rep_kind;               /* 0 knob, 1 tempo key, 2 arrow value, 3 step recorder cursor, 4 euclidean lane key, 5 generative setting key */
static int8_t   rep_dir;
static bool     rep_big, rep_on;
static uint32_t rep_t;

static int16_t  pb_val = 0, pb_tgt = 0;
static bool     pb_up = false, pb_dn = false;
static uint8_t  pb_ch = 0;
static uint32_t pb_t;

static uint8_t  bpm;
static uint32_t taps[5];
static uint8_t  ntaps = 0;
static bool     playing = false;
static uint8_t  step16 = 0;
static int8_t   last_step = -1;
static uint32_t clk_next, last_step_t;
static bool     ext_active = false, clk_internal = false;   /* clk_internal: clock source = Internal only (outside clock, start and stop are ignored) */
static uint32_t ext_last = 0, ext_iv = 0;   /* tick interval in 1/16 ms */
static uint16_t ext_ticks = 0;
typedef struct { uint8_t ch, n; uint32_t at; } pend_t;
#define NPEND 64
static pend_t   pend[NPEND];
static uint8_t  npend = 0;
static uint16_t seq_lanes[8], mseq[16];
static uint8_t  seq_page = 0, m_lane = 0;
/* euclidean */
typedef struct { uint8_t len, hits, shift, vari; int8_t pos; } eulane_t;
static eulane_t eu[8];
static uint8_t  eu_sel = 2, eu_view = 0, eu_held = 0, eu_lane = 0;   /* v13: LEN / HITS / VAR work while held; nothing held = start point (2) */
static uint32_t eu_tick = 0;
static uint8_t  sub_k = 5;              /* clock pulses 1-5 inside a 16th step (24 per beat) */
static uint32_t sub_t0 = 0, rnd_seed = 0x2545F491UL;
static int8_t   harm_oct[2] = {0, 0};   /* harmony page: chord / melody octave (semitones) */
static bool     fx_all = false, fx_el[NUM_EL], fx_used = false;
static int8_t   fx_last = -1, fx_key = -1, fx_target = -1;
static uint32_t fx_t = 0;
static uint8_t  held_el[100];           /* effects target of a held note key, 255 = none */
static uint32_t rnd_int(uint32_t n) { uint32_t x = rnd_seed; x ^= x << 13; x ^= x >> 17; x ^= x << 5; rnd_seed = x; return x % n; }   /* same as engine.js */
/* mini sequencer: melodic steps for the two pianos */
typedef struct { uint8_t n[4]; uint8_t cnt, len; } mstep_t;
static mstep_t  mel[2][16];
static uint8_t  ms_target = DRUM_ZONE;
static bool     ms_run = false, rec_mode = false, paste_armed = false;
static int8_t   ms_hold_step = -1, ms_hold_key = -1;
static bool     ms_hold_added = false;
static uint8_t  ms_hold_z = 0;
static uint8_t  last_note[2] = {60, 48};
static uint8_t  rec_z[100], rec_s[100];
static uint32_t rec_t[100];
static uint8_t  clip_kind = 0;           /* 0 empty, 1 drums, 2 melodic */
static uint16_t clip_d[16];
static mstep_t  clip_m[16];

typedef struct { uint8_t n, key; bool latched; } arpn_t;
static arpn_t   arp_notes[16];
static uint8_t  arp_count = 0, arp_rate = 5, arp_mode = 0, arp_oct = 1, arp_gt = 1, arp_mask = 0xFF, arp_ch = 0;
static bool     arp_on_flag = false;
static int8_t   ap_down = -1;
static uint32_t ap_last = 0, del_last = (uint32_t)-10000, cpy_last = (uint32_t)-10000;   /* double-tap Delete = clear all, double-tap Copy = paste */
static uint16_t arp_step = 0;
static uint32_t arp_next, arp_off_at;
static uint8_t  arp_on[16], arp_non = 0;
/* ---- v12 state: arp patterns, rolled chords, MIDI echo, CC sequencer, chord progression, Pond, Constellation ---- */
static uint8_t  arp_pat = 0, arp_cad = 2;                /* last pattern chosen, cadence stop bars */
static uint16_t arp_cstep = 0;
static uint32_t arp_t0 = 0;
static const char arp_code[15][3] = {"UP", "DN", "UD", "DU", "RN", "AS", "CH", "OF", "AL", "BA", "RO", "BE", "US", "CS", "IN"};
#define PT_ARP 250                                       /* param type of the ARP key (hold + arrows) */
static const uint16_t roll_ms[6] = {180, 110, 70, 40, 20, 10};
static const char roll_dir_c[3][3] = {"UP", "DN", "AL"}, roll_ramp_c[3][3] = {"FL", "CR", "DM"};
static struct { bool on, flip; uint8_t speed, dir, ramp; } roll = {false, false, 3, 0, 0};
typedef struct { uint32_t at; uint8_t p, ch, n, v; } rollq_t;
static rollq_t  rollq[24];
static uint8_t  nrollq = 0;
/*@ARCH ec #39@*/
typedef struct { uint8_t cc[4], on[4], v[4][8]; } cqy_t;                  /* one effect layer: per lane a CC number, an on mask and 8 step values */
static cqy_t    cqy[8];
static uint8_t  cq_len[4] = {8, 8, 8, 8}, cq_layer = 0, cq_lon = 1, cq_mute = 0;   /* cq_lon: bit k = effect layer k is on; cq_mute: bit l = lane l muted */
static uint8_t  cq_sel_l = 0, cq_sel_s = 0, cq_ch = 13, cq_ent_l = 0xFF, cq_ent_s = 0, cq_learn = 0;
static uint32_t cq_ent_t = 0, cq_pos = 0;
static bool     cq_run = false, cq_own = false, cq_rec = false;
static const uint8_t cq_lcol[8][3] = {{255, 90, 60}, {255, 160, 40}, {240, 220, 50}, {110, 230, 90}, {40, 220, 200}, {70, 150, 255}, {170, 100, 255}, {255, 90, 200}};
static int8_t   prog_slot[4] = {-1, -1, -1, -1}, prog_pend[4] = {-1, -1, -1, -1}, prog_sel = -1, prog_cur = -1;
static uint16_t prog_tick = 0;
static uint8_t  prog_on[5], prog_non = 0, prog_ch = 0;
typedef struct { uint8_t x, y; uint16_t front, age; uint32_t amp; } rip_t;
static rip_t    pd_rip[8];
static uint8_t  pd_nrip = 0, pd_speed = 2, pd_decay = 2, pd_thr = 3, pd_wl = 2, pd_cc = 74, pd_reach = 2, pd_nlen = 2, pd_maxr = 8;
static bool     pd_mode = false, pd_inited = false;
static int8_t   pd_oct = 0;
static int16_t  pd_h[64];
static int32_t  pd_last[64];
static uint32_t pd_next = 0;
typedef struct { int8_t x, y; } pt_t;
typedef struct { uint8_t x, y, a; } cell_t;
typedef struct { uint8_t start, len, non, onch, on[3]; uint16_t pos; int16_t last; } cnc_t;
static pt_t     cn_a[20];
static uint8_t  cn_na = 0, cn_maxd = 5, cn_vmax = 127, cn_nch = 0, cn_cell[64];
static cell_t   cn_cells[200];
static cnc_t    cn_ch[20];
static uint32_t nav_t = 0;                               /* the layer / page indicator flashes until this time */

static uint8_t  track_mode = 0;

static int8_t   held_xy[100];
static bool     xy_hold = false, xy_touch_on = false, xy_moving = false;
static uint8_t  xy_cur_x = 64, xy_cur_y = 64, xy_tgt_x = 64, xy_tgt_y = 64, xy_sent_x = 255, xy_sent_y = 255, xy_eff = 0;   /* v13: effect 1-8 sends X / Y / touch on channel 9-16 */
static uint32_t xy_timer;

/* hold + arrows */
static int8_t   param_key = -1;
static uint8_t  param_type, param_zone, param_ch, param_n;
static int8_t   param_side = -1;        /* harmony: OCT with a chord pad (0) or melody pad (1) held */
static bool     param_top, param_used;

/* LED text: 2 characters on the bottom (or top) 5 rows, plus a hundreds / minus row */
static char     text_s[2];
static bool     text_on = false, text_top = false, text_neg = false, text_hold = false;
static uint8_t  text_ind = 0;
static uint32_t text_until;

/* MIDI effects */
static bool     fx_on[NUM_FX];
static int8_t   fx_sel = -1, fx_last_key = -1;
static uint32_t fx_last_t = 0;
static uint8_t  fx_val[NUM_FX][6];
typedef struct { uint32_t at; uint8_t type, ch, n, v; int8_t key; } fxev_t;   /* type 0 on, 1 off, 2 cc, 3 on-held */
#define FXQ 160
static fxev_t   fxq[FXQ];
static uint8_t  nfxq = 0;
typedef struct { uint8_t n, v; uint16_t t; } hit_t;
#define MAXHITS 10
static bool     fx_held[100];
static uint8_t  fx_hn[100];
static hit_t    fx_hits[100][MAXHITS];
static uint8_t  fx_hch[100];
static bool     fx_roll[100];
static uint16_t fx_rollk[100];
static uint32_t fx_rollnext[100];
static uint8_t  fx_ch = 0, fx_cc11 = 127;
static int16_t  fx_pbv = 0;
static uint32_t fx_lfo_t, fx_first;
static bool     fx_stalt = false;

/* harmony page */
static int8_t   harm_deg = -1;
static uint8_t  harm_type = 0, harm_keys = 0;
/* microtonal */
static uint8_t  tuning = 0, mpe_next = 1;

/* step recorder: 4 tracks x 32 steps (16 per bar), 16 drum lanes */
typedef struct { uint8_t kind, vel, prob, rat, cnt; uint8_t n[SR_MAXN], ch[SR_MAXN]; } srstep_t;   /* kind 0 empty, 1 notes, 2 rest, 3 tie; vel / prob / rat 1-4 */
typedef struct { srstep_t steps[32]; uint8_t len, cursor, rate, swing, dir; bool mute, trip; int8_t ph, pos, pp; uint32_t ph_tick, rec_tick, cnt; } srtrack_t;
typedef struct { uint32_t at, dur; uint8_t ch, n, v, tr; } srq_t;
#define SRQ 48
static srq_t    srq[SRQ];
static uint8_t  nsrq = 0, sr_mode = 0;   /* edit mode 0 off, 1 velocity, 2 probability, 3 ratchet */
static uint32_t sr_pulse = 0;
static srtrack_t sr_tr[4];
static uint8_t  sr_target = 0, sr_half = 0, sr_bars = 1, sr_kb = 0, sr_lane = SR_KICK, sr_gtr = 0, sr_gstep = 0;
static bool     sr_metro = false, sr_group = false;
static uint32_t sr_dseq[16], sr_tick = 0, sr_sv_last;
static int8_t   sr_dph = -1;
static const uint8_t sr_vel_v[5] = {0, 25, 60, 100, 127};
static const uint8_t sr_drums[16] = {56, 51, 60, 54, 41, 45, 48, 49, 35, 37, 39, 70, 36, 38, 42, 46};   /* keyboard page 3 pads (GM) */
/* dynamic macros */
enum { EV_ON, EV_OFF, EV_CC, EV_PB, EV_PC, EV_KEY, EV_KEYUP };
typedef struct { uint32_t t; uint8_t type, ch, a, b; } mev_t;
/*@ARCH mac #38@*/

/* ---------------- Helpers ---------------- */
static inline uint32_t now(void) { return timer_read32(); }
static inline bool mod_active(modkey_t *m) { return m->held || m->locked; }
static inline bool is_pad(uint8_t p) { return p / 10 >= 2 && p % 10 <= 7; }
static inline uint8_t pad_c(uint8_t p) { return p % 10; }
static inline uint8_t pad_r(uint8_t p) { return 9 - p / 10; }
static inline uint8_t row_value(uint8_t r) { return (uint8_t)((r * 127 + 3) / 7); }
static inline int16_t clampi(int16_t v, int16_t lo, int16_t hi) { return v < lo ? lo : v > hi ? hi : v; }
static inline uint8_t ch_of(int8_t page) { if (page < 0) return gch; uint8_t c = pgm_read_byte(&page_chan[page]); return c == GLOBAL_CH ? gch : c; }
static inline uint8_t zone_of(uint8_t z) { return (z >= 4 && z <= 7) ? z + 4 * kb_page : ((z == 20 || z == 21) && sr_kb == 1) ? z + 2 : z; }
static inline uint8_t zone_ch(uint8_t z) { return zones[z].ch ? zones[z].ch - 1 : gch; }
static inline uint32_t beat_ms(void) { return 60000UL / bpm; }
static inline uint32_t per16(void) { return 15000UL / bpm; }
static inline uint8_t pcof(int16_t n) { return (uint8_t)(((n % 12) + 12) % 12); }
static inline bool blink(uint16_t ms) { return (now() / ms) % 2 == 0; }

/* What a key does now (resolveCell in the planner, worked out by gen_keymap). from = the page it came from, -1 = Controls tables. */
static uint32_t resolve_cell(uint8_t page, uint8_t p, bool shift, int8_t *from) {
    uint32_t k = pgm_read_dword(shift ? &res_shift[page][p] : &res_keys[page][p]);
    *from = (int8_t)(k >> 24) - 1;
    return k & 0xFFFFFFUL;
}
static inline bool page_varies(uint8_t page, uint8_t p) { return (pgm_read_byte(&page_vary[page][p >> 3]) >> (p & 7)) & 1; }
static uint32_t arp_overlay(uint8_t p) {
    uint8_t r = p / 10, x = p % 10;
    if (r == 2) return K(T_AR, x, 0);
    if (r == 3) return K(T_AM, x, 0);
    if (r == 4) return x < 4 ? K(T_AO, x + 1, 0) : K(T_AG, x - 4, 0);
    return K(T_AS, x, 0);
}
/* step recorder keyboard page 3: drum pads (left) and 16 drum steps (right) on rows R7-R10 */
static uint32_t sr_overlay(uint8_t p) { uint8_t r = p / 10 - 6, x = p % 10; return x < 4 ? K(T_ZN, sr_drums[r * 4 + x], DRUM_ZONE) : K(T_DS, r * 4 + x - 4, 0); }
static inline bool on_sr_page(void) { return (int8_t)cur_page == sr_page; }
static inline bool is_locked(uint8_t p) { return p == 8 || p == 9 || p == 18 || p == 19; }
/* effects key held: rows R3-R8 show the effects (columns 1-2) and the faders of the effect being edited (columns 3-8) */
static uint32_t fx_overlay(uint8_t p) { uint8_t r = p / 10 - 2, x = p % 10; return x == 0 ? K(T_FX, r, 0) : x == 1 ? K(T_FX, r + 6, 0) : K(T_FP, (5 - r) * 6 + x - 2, 0); }
static uint32_t resolve(uint8_t p, int8_t *from) {
    if (ap_down >= 0 && is_pad(p) && p / 10 <= 5) { *from = cur_page; return arp_overlay(p); }
    if (fx_key >= 0 && is_pad(p) && p / 10 <= 7) { *from = cur_page; return fx_overlay(p); }
    if (on_sr_page() && sr_kb == 2 && is_pad(p) && p / 10 >= 6) { *from = cur_page; return sr_overlay(p); }
    return resolve_cell(cur_page, p, cs_down && !(param_key >= 0 && is_locked(p)), from);   /* while a setting key is held the navigation keys stay arrows */
}

/*@ARCH mac #37@*/
static void raw_send(uint8_t type, uint8_t ch, uint8_t a, uint8_t b) {
    switch (type) {
        case EV_ON: midi_send_noteon(&midi_device, ch, a, b); break;
        case EV_OFF: midi_send_noteoff(&midi_device, ch, a, 0); break;
        case EV_CC: midi_send_cc(&midi_device, ch, a, b); break;
        case EV_PB: midi_send_pitchbend(&midi_device, ch, (int16_t)((a | ((uint16_t)b << 7)) - 8192)); break;
        case EV_PC: midi_send_programchange(&midi_device, ch, a); break;
        case EV_KEY: register_code16(a | ((uint16_t)b << 8)); break;
        case EV_KEYUP: unregister_code16(a | ((uint16_t)b << 8)); break;
    }
}
static void emit(uint8_t type, uint8_t ch, uint8_t a, uint8_t b) { /*@ARCH-INLINE mac: out_rec(type, ch, a, b); */ raw_send(type, ch, a, b); }
static void cc(uint8_t ch, uint8_t n, uint8_t v) { emit(EV_CC, ch, n, v); }
static void note_on(uint8_t ch, int16_t n, int16_t v) { if (n < 0 || n > 127) return; emit(EV_ON, ch, (uint8_t)n, (uint8_t)clampi(v, 1, 127)); }
static void note_off(uint8_t ch, int16_t n) { if (n < 0 || n > 127) return; emit(EV_OFF, ch, (uint8_t)n, 0); }
static void bend(uint8_t ch, int16_t v) { uint16_t u = (uint16_t)(clampi(v, -8192, 8191) + 8192); emit(EV_PB, ch, u & 0x7F, u >> 7); }
static void key_press16(uint16_t kc) { emit(EV_KEY, 0, kc & 0xFF, kc >> 8); }
static void key_release16(uint16_t kc) { emit(EV_KEYUP, 0, kc & 0xFF, kc >> 8); }

static void show_text_ms(const char *s, bool top, uint8_t ind, bool neg, bool hold, uint16_t ms) {
    text_s[0] = s[0]; text_s[1] = s[1] ? s[1] : ' ';
    text_top = top; text_ind = ind; text_neg = neg; text_hold = hold; text_on = true; text_until = now() + ms;
}
static void show_text(const char *s, bool top, uint8_t ind, bool neg, bool hold) { show_text_ms(s, top, ind, neg, hold, TEXT_MS); }
static void show_num_ind(int16_t v, bool top, bool sign, bool hold, int8_t ind) {
    uint16_t a = v < 0 ? -v : v;
    char s[2];
    if (a < 10) { s[0] = sign ? (v < 0 ? '-' : v > 0 ? '+' : ' ') : ' '; s[1] = '0' + a; }
    else { s[0] = '0' + (a % 100) / 10; s[1] = '0' + a % 10; }
    show_text(s, top, ind >= 0 ? ind : a / 100, v < 0 && a >= 10, hold);
}
static void show_num(int16_t v, bool top, bool sign, bool hold) { show_num_ind(v, top, sign, hold, -1); }

/* ---------------- Scales ---------------- */
static bool in_scale(int16_t n) {
    uint8_t rel = pcof(n - root);
    for (uint8_t k = 0; k < scale_len[scale]; k++) if (scale_iv[scale][k] == rel) return true;
    return false;
}
static int8_t scale_cents(int16_t n) {
    uint8_t rel = pcof(n - root);
    for (uint8_t k = 0; k < scale_len[scale]; k++) if (scale_iv[scale][k] == rel) return scale_dev[scale][k];
    return 0;
}
static int16_t snap(int16_t n) { for (uint8_t k = 0; k < 12 && !in_scale(n); k++) n--; return n; }
static int16_t step_up(int16_t n, uint8_t k) { int16_t m = snap(n); while (k > 0) { m++; if (in_scale(m)) k--; } return m; }
static int16_t degree_pitch(int16_t d, int16_t base) {
    int16_t L = scale_len[scale], o = d >= 0 ? d / L : -((-d + L - 1) / L), k = d - o * L;
    return base + 12 * o + scale_iv[scale][k];
}
static inline bool is_black(int16_t n) { uint8_t m = pcof(n); return m == 1 || m == 3 || m == 6 || m == 8 || m == 10; }
static inline int16_t playable(int16_t n) { return quant ? snap(n) : n; }
static inline int16_t harm_base(void) { return 48 + root + transpose; }

/* the notes a note key plays now. Returns how many (max 5) */
static uint8_t key_pitches(uint32_t k, int16_t *out) {
    uint8_t t = KTYPE(k), n = KNUM(k);
    if (t == T_N) { out[0] = n; return 1; }
    if (t == T_T || t == T_A) { out[0] = playable(n + transpose); return 1; }
    if (t == T_S) { out[0] = degree_pitch(n, 36 + root + transpose); return 1; }
    if (t == T_MK) { out[0] = degree_pitch(n, harm_base()) + harm_oct[1]; return 1; }
    if (t == T_CK) { uint8_t d = n >> 2, ty = n & 3; for (uint8_t j = 0; j < harm_cnt[ty]; j++) out[j] = degree_pitch(d + harm_steps[ty][j], harm_base()) + harm_oct[0]; return harm_cnt[ty]; }
    if (t == T_CH) {
        int16_t L = scale_len[scale], col = n % 8, row = n / 8, base = 48 + root + transpose;
        int16_t st[5]; uint8_t cnt = 3;
        switch (row) {
            case 0: st[0] = 0; st[1] = 2; st[2] = 4; break;
            case 1: st[0] = 2; st[1] = 4; st[2] = L; break;
            case 2: st[0] = 4; st[1] = L; st[2] = L + 2; break;
            case 3: st[0] = 0; st[1] = 2; st[2] = 4; st[3] = 6; cnt = 4; break;
            case 4: st[0] = 0; st[1] = 2; st[2] = 4; st[3] = 6; st[4] = 8; cnt = 5; break;
            case 5: st[0] = 0; st[1] = 1; st[2] = 4; break;
            case 6: st[0] = 0; st[1] = 3; st[2] = 4; break;
            default: st[0] = 0; st[1] = 4; st[2] = L; break;
        }
        for (uint8_t j = 0; j < cnt; j++) out[j] = degree_pitch(col + st[j], base);
        return cnt;
    }
    if (t == T_ZN) {
        uint8_t z = zone_of(KZONE(k));
        if (z == DRUM_ZONE) { out[0] = n + zones[z].xp; return 1; }
        int16_t b = playable(n + transpose + zones[z].xp);
        if (!zones[z].chord) { out[0] = b; return 1; }
        uint8_t ct = zones[z].ctype;
        if (chord_iv[ct][0] < 0) { int16_t r = snap(b); out[0] = r; out[1] = step_up(r, 2); out[2] = step_up(r, 4); return 3; }
        uint8_t c = 0;
        for (uint8_t j = 0; j < 5 && chord_iv[ct][j] >= 0; j++) out[c++] = b + chord_iv[ct][j];
        return c;
    }
    return 0;
}

/* ---------------- Notes held by keys ---------------- */
static void key_note_add(uint8_t p, uint8_t ch, int16_t n, int16_t v) {
    if (n < 0 || n > 127) return;
    for (uint8_t k = 0; k < MAXKN; k++) if (!key_notes[p][k]) { key_notes[p][k] = (uint8_t)n + 1; key_nch[p][k] = ch; note_on(ch, n, v); return; }
}
static bool key_sounding(uint8_t p) { for (uint8_t k = 0; k < MAXKN; k++) if (key_notes[p][k]) return true; return false; }
static void key_notes_off(uint8_t p) {
    { uint8_t w = 0; for (uint8_t k = 0; k < nrollq; k++) if (rollq[k].p != p) rollq[w++] = rollq[k]; nrollq = w; }
    for (uint8_t k = 0; k < MAXKN; k++) if (key_notes[p][k]) { note_off(key_nch[p][k], key_notes[p][k] - 1); key_notes[p][k] = 0; }
    key_latched[p] = false;
}
/* MPE: a note on its own channel (2-16) with a pitch bend for the microtone (cents) */
static void mpe_on(uint8_t p, int16_t n, int16_t cents, int16_t v) {
    if (n < 0 || n > 127) return;
    uint8_t ch = mpe_next; mpe_next = mpe_next >= 15 ? 1 : mpe_next + 1;
    int32_t num = (int32_t)cents * 8192, den = (int32_t)BEND_RANGE * 100;
    bend(ch, (int16_t)((num + (num >= 0 ? den / 2 : -den / 2)) / den));
    key_note_add(p, ch, n, v);
}

/* ---------------- Arpeggiator ---------------- */
static void arp_all_off(void) { for (uint8_t k = 0; k < arp_non; k++) note_off(arp_ch, arp_on[k]); arp_non = 0; }
static void arp_stop(void) { arp_all_off(); arp_step = 0; }
static void arp_remove(uint8_t idx) { for (uint8_t k = idx; k + 1 < arp_count; k++) arp_notes[k] = arp_notes[k + 1]; arp_count--; }
static void arp_add(uint8_t p, int16_t n, uint8_t ch) {
    if (n < 0 || n > 127) return;
    for (uint8_t k = 0; k < arp_count; k++) if (arp_notes[k].n == n) { arp_notes[k].key = p; arp_notes[k].latched = false; return; }
    if (arp_count >= 16) return;
    if (!arp_count) { arp_step = 0; arp_cstep = 0; arp_next = now(); arp_t0 = now(); }
    arp_ch = ch;
    arp_notes[arp_count].n = (uint8_t)n; arp_notes[arp_count].key = p; arp_notes[arp_count].latched = false; arp_count++;
}
static void arp_release(uint8_t p) {
    for (int8_t k = arp_count - 1; k >= 0; k--) {
        if (arp_notes[k].key != p) continue;
        if (mod_active(&m_lt)) arp_notes[k].latched = true; else arp_remove(k);
    }
    if (!arp_count) arp_stop();
}
static bool arp_take_latched(uint8_t p) {
    bool removed = false;
    for (int8_t j = arp_count - 1; j >= 0; j--) if (arp_notes[j].key == p && arp_notes[j].latched) { arp_remove(j); removed = true; }
    if (removed && !arp_count) arp_stop();
    return removed;
}
static uint32_t arp_period(void) { return (60000UL * arp_num[arp_rate]) / ((uint32_t)bpm * arp_den[arp_rate]); }
/* classical / jazz patterns (modes 8-12): element j of the whole figure (before the 0-127 filter); octaves wrap */
#define OCT_N(o, x) ((int16_t)s[x] + 12 * (o))
static uint16_t arp_pat_len(uint8_t mode, uint8_t n) {
    uint8_t span = arp_oct < 2 ? 2 : arp_oct; uint16_t U = (uint16_t)arp_oct * n;
    switch (mode) {
        case 8: case 12: return arp_oct * 4;
        case 9: return arp_oct * 7;
        case 10: return 2 * (span * n + 1) - 2;
        default: return 2 * (U > 2 ? 2 * U - 2 : U);
    }
}
static int16_t arp_elem(uint8_t mode, uint16_t j, const uint8_t *s, uint8_t n) {
    uint8_t span = arp_oct < 2 ? 2 : arp_oct;
    switch (mode) {
        case 8: { uint8_t o = j / 4, r = j % 4; return r == 0 ? OCT_N(o, 0) : r == 2 ? OCT_N(o, n > 2 ? (n - 1) >> 1 : 0) : OCT_N(o, n - 1); }
        case 9: {
            uint8_t o = j / 7, r = j % 7; if (r == 0) return OCT_N(o, 0);
            uint8_t k = 1 + (r - 1) % 3; if (k >= 2 * n) k = 2 * n - 1;
            return k < n ? OCT_N(o, k) : OCT_N(o + 1, k - n);
        }
        case 10: {
            uint16_t upl = (uint16_t)span * n + 1, k = j < upl ? j : 2 * upl - 2 - j;
            return k < (uint16_t)span * n ? OCT_N(k / n, k % n) : (int16_t)s[0] + 12 * span;
        }
        case 11: {
            uint16_t U = (uint16_t)arp_oct * n, L = U > 2 ? 2 * U - 2 : U, k = j / 2, k2 = (k + 1) % L;
            uint16_t a = U > 2 && k >= U ? 2 * U - 2 - k : k, b = U > 2 && k2 >= U ? 2 * U - 2 - k2 : k2;
            int16_t v = OCT_N(a / n, a % n), nx = OCT_N(b / n, b % n);
            return (j & 1) == 0 ? v : (nx > v ? nx - 1 : nx + 1);
        }
        default: { uint8_t o = j / 4, r = j % 4; return step_up(s[0], 2 + 2 * r) + 12 * o; }          /* 12: upper structure 3-5-7-9 */
    }
}
static uint8_t arp_pick(uint8_t *outn) {
    uint8_t sorted[16], base[16], exp[64], n = arp_count, ne = 0, m = arp_mode;
    if (m == 13) m = arp_pat;                                /* cadence stop plays the last pattern; intensity plays up */
    if (m == 14) m = 0;
    for (uint8_t k = 0; k < n; k++) { sorted[k] = arp_notes[k].n; base[k] = arp_notes[k].n; }
    for (uint8_t a = 1; a < n; a++) { uint8_t v = sorted[a]; int8_t b = a - 1; while (b >= 0 && sorted[b] > v) { sorted[b + 1] = sorted[b]; b--; } sorted[b + 1] = v; }
    if (m == 6) { for (uint8_t k = 0; k < n; k++) outn[k] = sorted[k]; return n; }
    if (m >= 8 && m <= 12) {
        uint16_t len = arp_pat_len(m, n), valid = 0, c = 0;
        for (uint16_t j = 0; j < len; j++) { int16_t v = arp_elem(m, j, sorted, n); if (v >= 0 && v <= 127) valid++; }
        if (valid) {
            uint16_t want = arp_step % valid;
            for (uint16_t j = 0; j < len; j++) { int16_t v = arp_elem(m, j, sorted, n); if (v >= 0 && v <= 127 && c++ == want) { outn[0] = (uint8_t)v; return 1; } }
        }
    }
    const uint8_t *src = m == 5 ? base : sorted;
    for (uint8_t o = 0; o < arp_oct; o++) for (uint8_t k = 0; k < n; k++) if (src[k] + 12 * o <= 127) exp[ne++] = src[k] + 12 * o;
    if (!ne) return 0;
    if (m == 4) { outn[0] = exp[rand() % ne]; return 1; }
    uint16_t len = ne, i;
    if ((m == 2 || m == 3) && ne > 2) len = 2 * ne - 2;
    i = arp_step % len;
    uint8_t idx;
    if (m == 1) idx = ne - 1 - i;
    else if (m == 2) idx = i < ne ? i : 2 * ne - 2 - i;
    else if (m == 3) idx = i < ne ? ne - 1 - i : i - ne + 1;
    else idx = i;
    outn[0] = exp[idx];
    return 1;
}
static void arp_task(void) {
    if (arp_non && (int32_t)(now() - arp_off_at) >= 0) arp_all_off();
    if (!arp_count || arp_mode == 7 || (int32_t)(now() - arp_next) < 0) return;
    uint32_t per = arp_period();
    arp_next += per;
    if ((int32_t)(arp_next - now()) <= 0) arp_next = now() + 1;
    arp_all_off();
    uint32_t g = per * arp_gate[arp_gt] / 100;
    if (arp_gt == 3 && g > 2) g -= 2;
    if (g < 5) g = 5;
    if (arp_mode == 13) {                                    /* cadence stop: after N bars one block chord, then the pattern starts again */
        uint32_t bp = (uint32_t)bpm * per, spb = (240000UL + bp / 2) / bp;
        if (!spb) spb = 1;
        if (arp_cstep >= (uint32_t)arp_cad * spb) {
            for (uint8_t k = 0; k < arp_count; k++) { note_on(arp_ch, arp_notes[k].n, 127); arp_on[arp_non++] = arp_notes[k].n; }
            arp_off_at = now() + (per * 2 > 7 ? per * 2 - 2 : 5);
            arp_cstep = 0; arp_step = 0; return;
        }
        arp_cstep++;
    }
    uint8_t vel = 127; bool play = (arp_mask & (1 << (arp_step % 8))) != 0;
    if (arp_mode == 14) {                                    /* intensity: the longer the chord is held, the denser and louder (keys have no velocity) */
        uint32_t held = now() - arp_t0, div = held < 1000 ? 4 : held < 2000 ? 2 : 1;
        play = arp_step % div == 0; vel = (uint8_t)(50 + held / 25 > 127 ? 127 : 50 + held / 25);
    }
    if (play) {
        uint8_t notes[16], cnt = arp_pick(notes);
        for (uint8_t k = 0; k < cnt; k++) { note_on(arp_ch, notes[k], vel); arp_on[arp_non++] = notes[k]; }
        arp_off_at = now() + g;
    }
    arp_step++;
}
static inline bool arp_active(void) { return arp_on_flag && arp_mode != 7; }

/* rolled chords: the notes of a chord key start one after another (speed, direction, velocity ramp); a key released early drops the notes not yet played */
static void roll_on(uint8_t p, uint8_t ch, int16_t *ns, uint8_t cnt) {
    int16_t o[5];
    for (uint8_t k = 0; k < cnt; k++) o[k] = ns[k];
    for (uint8_t a = 1; a < cnt; a++) { int16_t v = o[a]; int8_t b = a - 1; while (b >= 0 && o[b] > v) { o[b + 1] = o[b]; b--; } o[b + 1] = v; }
    bool rev = roll.dir == 1 || (roll.dir == 2 && roll.flip);
    if (roll.dir == 2) roll.flip = !roll.flip;
    if (rev) for (uint8_t a = 0; a < cnt / 2; a++) { int16_t t = o[a]; o[a] = o[cnt - 1 - a]; o[cnt - 1 - a] = t; }
    uint16_t ms = roll_ms[roll.speed]; uint8_t last = cnt > 1 ? cnt - 1 : 1;
    for (uint8_t k = 0; k < cnt; k++) {
        int16_t r = (57 * k + last / 2) / last, v = roll.ramp == 1 ? 70 + r : roll.ramp == 2 ? 127 - r : 127;
        if (k == 0) key_note_add(p, ch, o[k], v);
        else if (o[k] >= 0 && o[k] <= 127 && nrollq < 24) { rollq[nrollq].at = now() + (uint32_t)k * ms; rollq[nrollq].p = p; rollq[nrollq].ch = ch; rollq[nrollq].n = (uint8_t)o[k]; rollq[nrollq].v = (uint8_t)v; nrollq++; }
    }
}
static void roll_task(void) {
    if (!nrollq) return;
    uint32_t t = now(); uint8_t w = 0;
    for (uint8_t k = 0; k < nrollq; k++) {
        if ((int32_t)(t - rollq[k].at) >= 0) key_note_add(rollq[k].p, rollq[k].ch, rollq[k].n, rollq[k].v);
        else rollq[w++] = rollq[k];
    }
    nrollq = w;
}

/* play the notes of a key: arpeggiator, microtonal scale (MPE) or plain */
static void fx_note_on(uint8_t p, uint8_t ch, int16_t *ns, uint8_t cnt);
static inline bool fx_for(int8_t el) { return fx_all || (el >= 0 && fx_el[el]); }
static bool fx_any(void) { if (fx_all) return true; for (uint8_t k = 0; k < NUM_EL; k++) if (fx_el[k]) return true; return false; }
static void play_notes(uint8_t p, uint8_t ch, int16_t *ns, uint8_t cnt, uint8_t t, bool drum, int8_t el) {
    if (key_latched[p]) { key_notes_off(p); return; }
    key_notes_off(p);
    if (el >= 0) { fx_last = el; held_el[p] = el; }
    if (fx_for(el)) { fx_note_on(p, ch, ns, cnt); held_flags[p] |= 2; return; }
    bool arpable = t == T_T || t == T_S || t == T_CH || t == T_CK || t == T_MK || t == T_A || t == T_ZN;
    if (!drum && arp_active() && arpable) { for (uint8_t j = 0; j < cnt; j++) arp_add(p, ns[j], ch); held_flags[p] |= 1; return; }
    if (!drum && roll.on && cnt > 1 && (t == T_CH || t == T_CK || t == T_ZN)) { roll_on(p, ch, ns, cnt); return; }   /* rolled chord */
    bool retune = t == T_T || t == T_S || t == T_CH || t == T_CK || t == T_MK || t == T_ZN;
    if (!drum && scale_micro[scale] && retune) { for (uint8_t j = 0; j < cnt; j++) mpe_on(p, ns[j], scale_cents(ns[j]), 127); return; }
    for (uint8_t j = 0; j < cnt; j++) key_note_add(p, ch, ns[j], 127);
}

/* ---------------- MIDI effects queue ---------------- */
#define FXV(k, p) (fx_val[k][p])
static void fxq_add(uint32_t at, uint8_t type, uint8_t ch, int16_t n, int16_t v, int8_t key) {
    if (nfxq >= FXQ || n < 0 || n > 127) return;
    fxq[nfxq].at = at; fxq[nfxq].type = type; fxq[nfxq].ch = ch; fxq[nfxq].n = (uint8_t)n; fxq[nfxq].v = (uint8_t)clampi(v, 0, 127); fxq[nfxq].key = key; nfxq++;
}
static void fx_note(uint8_t ch, int16_t n, int16_t v, uint32_t at, uint32_t dur) {
    if (n < 0 || n > 127 || v < 1 || nfxq + 2 > FXQ) return;
    fxq_add(at, 0, ch, n, v, -1);
    fxq_add(at + (dur < 10 ? 10 : dur), 1, ch, n, 0, -1);
}

/* ---------------- Polyrhythm engine (layer 4 page 3) ---------------- */
static void fire(uint8_t ch, int16_t n, uint32_t dur, uint8_t v) {
    if (n < 0 || n > 127 || npend >= NPEND) return;
    note_on(ch, n, v); pend[npend].ch = ch; pend[npend].n = (uint8_t)n; pend[npend].at = now() + (dur < 10 ? 10 : dur); npend++;
}
static void pend_flush(bool all) {
    for (int8_t k = npend - 1; k >= 0; k--)
        if (all || (int32_t)(now() - pend[k].at) >= 0) { note_off(pend[k].ch, pend[k].n); pend[k] = pend[--npend]; }
}
static void sr_step(void);
static void sr_pulse_task(void);
static bool eu_hit(uint8_t l, uint8_t s) {
    eulane_t *L = &eu[l];
    if (s >= L->len || !L->hits) return false;
    uint8_t j = (uint8_t)(((int16_t)s - L->shift + 32 * L->len) % L->len);
    return (uint16_t)j * L->hits % L->len < L->hits;
}
/* Euclidean (Polygene style): every lane loops its own length on the 1/16 clock, only on its own page */
static void eu_step(void) {
    uint32_t k = eu_tick++, per = per16();
    bool on = (int8_t)cur_page == eu_page;
    uint8_t ch = ch_of(eu_page);
    for (uint8_t l = 0; l < 8; l++) {
        eulane_t *L = &eu[l];
        L->pos = (int8_t)(k % L->len);
        if (!on) continue;
        bool hit = eu_hit(l, L->pos); uint8_t v = 127;
        if (L->vari && rnd_int(100) < (uint32_t)L->vari * 10) { hit = !hit; v = 60; }   /* variation: a hit drops or a rest plays a ghost hit */
        if (hit) fire(ch, SEQ_NOTE + l, per / 2, v);
    }
}
/* ---------------- Generative pages (layer 4 pages 2-5): same logic as engine.js ---------------- */
static const uint8_t  gen_rates[5] = {8, 4, 3, 2, 1}, gen_gate[4] = {25, 50, 75, 100}; /*@ARCH-INLINE tm: , tm_locks[8] = {0, 15, 30, 45, 60, 75, 90, 100} (was part of the line above) */
/*@ARCH lfo #36@*/
typedef struct { int8_t x, y; uint8_t tx[3], ty[3], ntr, ch; bool on; } rwk_t;      /* one walker: ch 0 = board channel */
typedef struct { uint8_t rate, step, pull, ymode, cc; int8_t oct; uint8_t gate; bool run; uint8_t sel; rwk_t w[4]; } rwalk_t;
/*@ARCH tm #35@*/
/*@ARCH bb #34@*/
/*@ARCH lfo #33@*/
static rwalk_t  rw = {.rate = 3, .step = 1, .pull = 2, .cc = 74, .gate = 1, .run = true, .w = {{.x = 3, .y = 3, .on = true}, {.x = 4, .y = 4}, {.x = 1, .y = 6}, {.x = 6, .y = 1}}};
/*@ARCH tm #32@*/
/*@ARCH bb #31@*/
/*@ARCH lfo #30@*/
static uint32_t gen_tick = 0;   /*@ARCH-INLINE lfo: , lfo_lp = 0 */
#define SNUM(v)  show_num((v), false, false, false)
#define SNUMS(v) show_num((v), false, true, false)
#define STXT(s)  show_text((s), false, 0, false, false)
static inline int16_t gen_base(int8_t oct) { return 48 + root + transpose + 12 * oct; }
static inline uint32_t gen_dur(uint8_t rate, uint8_t gate) { return per16() * gen_rates[rate] * gen_gate[gate] / 100; }
static void rw_tick(uint8_t pch) {                           /* random walk, up to 4 walkers: X = scale degree, Y = velocity or a CC */
    for (uint8_t k = 0; k < 4; k++) {
        rwk_t *W = &rw.w[k]; if (!W->on) continue;
        uint8_t ch = W->ch ? W->ch - 1 : pch;
        for (uint8_t j = 2; j > 0; j--) { W->tx[j] = W->tx[j - 1]; W->ty[j] = W->ty[j - 1]; }
        W->tx[0] = (uint8_t)W->x; W->ty[0] = (uint8_t)W->y; if (W->ntr < 3) W->ntr++;
        if (rnd_int(100) < (uint32_t)rw.pull * 10) { W->x += W->x < 3 ? 1 : W->x > 4 ? -1 : 0; W->y += W->y < 3 ? 1 : W->y > 4 ? -1 : 0; }
        else {
            W->x = (int8_t)clampi(W->x + ((int16_t)rnd_int(3) - 1) * rw.step, 0, 7);
            W->y = (int8_t)clampi(W->y + ((int16_t)rnd_int(3) - 1) * rw.step, 0, 7);
        }
        int16_t n = degree_pitch(W->x, gen_base(rw.oct)); uint32_t dur = gen_dur(rw.rate, rw.gate);
        if (rw.ymode) { cc(ch, rw.cc, (uint8_t)(W->y * 127 / 7)); fire(ch, n, dur, 100); }
        else fire(ch, n, dur, (uint8_t)(20 + W->y * 15));
    }
}
static void wk_show(uint8_t ch) { if (ch) SNUM(ch); else STXT("GL"); }
static void wk_param(uint8_t n) {                            /* channel of the selected walker: key 8 = down, 9 = up */
    rwk_t *W = &rw.w[rw.sel];
    W->ch = (uint8_t)clampi(W->ch + (n == 9 ? 1 : -1), 0, 16); wk_show(W->ch);
}
/*@ARCH tm #29@*/
/*@ARCH bb #28@*/
static void gen_step(void) {
    uint32_t k = gen_tick++; int8_t p = (int8_t)cur_page;
    if (p == rw_page) { if (rw.run && k % gen_rates[rw.rate] == 0) rw_tick(ch_of(p)); }
    /*@ARCH tm #27@*/
    /*@ARCH bb #26@*/
}
/*@ARCH lfo #25@*/
static void gs_param(uint8_t n) {                            /* a setting key of a generative page: row = setting, even = down, odd = up */
    uint8_t r = n >> 1; int8_t d = (n & 1) ? 1 : -1; int8_t p = (int8_t)cur_page;
    if (p == rw_page) {
        switch (r) {
            case 0: rw.rate = (uint8_t)clampi(rw.rate + d, 0, 4); SNUM(gen_rates[rw.rate]); break;
            case 1: rw.step = (uint8_t)clampi(rw.step + d, 1, 3); SNUM(rw.step); break;
            case 2: rw.pull = (uint8_t)clampi(rw.pull + d, 0, 10); SNUM(rw.pull * 10); break;
            case 3: rw.ymode = d > 0; STXT(rw.ymode ? "CC" : "VE"); break;
            case 4: rw.cc = (uint8_t)clampi(rw.cc + d, 0, 127); SNUM(rw.cc); break;
            case 5: rw.oct = (int8_t)clampi(rw.oct + d, -2, 2); SNUMS(rw.oct); break;
            case 6: rw.gate = (uint8_t)clampi(rw.gate + d, 0, 3); SNUM(gen_gate[rw.gate]); break;
            case 7: rw.run = d > 0; STXT(rw.run ? "ON" : "OF"); break;
        }
    /*@ARCH tm #24@*/
    /*@ARCH bb #23@*/
    /*@ARCH lfo #22@*/
    }
}
static void cq_step(void);
static void prog_step(void);
static void cn_step(void);
static void prog_off(void);
static void cn_chords_off(void);
static void clock_step(void) {
    uint32_t per = per16(), t = now();
    uint8_t st = step16;
    if ((int8_t)cur_page == sq_page) for (uint8_t l = 0; l < 8; l++) if (seq_lanes[l] & (1 << st)) fire(ch_of(sq_page), SEQ_NOTE + l, per / 2, 127);
    if (ms_run) {
        uint8_t dch = zone_ch(DRUM_ZONE);
        for (uint8_t l = 0; l < 16; l++) if (mseq[l] & (1 << st)) fire(dch, SEQ_NOTE + l, per / 2, 127);
        for (uint8_t z = 0; z < 2; z++) { mstep_t *s = &mel[z][st]; for (uint8_t j = 0; j < s->cnt; j++) fire(zone_ch(z), s->n[j], s->len * per - 5, 110); }
    }
    eu_step();
    gen_step();
    cq_step(); prog_step(); cn_step();
    sr_step();
    sub_t0 = t; sub_k = 0; sr_pulse_task();                  /* pulse 0 of the 6 in this step */
    last_step = st; last_step_t = t; step16 = (st + 1) % 16;
}
static void start_clock(void) {
    cq_pos = 0; prog_tick = 0; prog_cur = -1;
    playing = true; step16 = 0; clk_next = now(); eu_tick = 0; sub_k = 5; gen_tick = 0; /*@ARCH-INLINE lfo: lfo_lp = 0; bb: memset(bb.ph, 0, 8); */
    sr_tick = 0; sr_pulse = 0; sr_group = false; nsrq = 0;
    for (uint8_t i = 0; i < 4; i++) { sr_tr[i].pos = -1; sr_tr[i].pp = 1; sr_tr[i].cnt = 0; }
}
static void stop_clock(void) {
    prog_off(); prog_cur = -1; cn_chords_off(); cq_run = false;
    playing = false; last_step = -1; pend_flush(true); nsrq = 0;
    for (uint8_t l = 0; l < 8; l++) eu[l].pos = -1;
    for (uint8_t i = 0; i < 4; i++) sr_tr[i].ph = -1;
    sr_dph = -1;
}
static bool sr_queue_task(void);
static void clock_task(void) {
    pend_flush(false);
    if (ext_active && now() - ext_last > 500) ext_active = false;
    if (playing && !ext_active && (int32_t)(now() - clk_next) >= 0) {
        clk_next += per16();
        if ((int32_t)(clk_next - now()) <= 0) clk_next = now() + 1;
        clock_step();
    }
    while (playing && !ext_active && sub_k < 5 && (int32_t)(now() - (sub_t0 + per16() * (sub_k + 1) / 6)) >= 0) { sub_k++; sr_pulse_task(); }
    sr_queue_task();
}
/* MIDI clock from the computer: 0xF8 tick (24 per beat), 0xFA start, 0xFB continue, 0xFC stop */
static void midi_cc_cb(MidiDevice *device, uint8_t chan, uint8_t num, uint8_t val) {   /* learn: the next CC that arrives is this lane's number */
    if (cq_learn) { cqy[cq_layer].cc[cq_learn - 1] = num; cq_learn = 0; SNUM(num); }
}
static void midi_realtime_cb(MidiDevice *device, uint8_t b) {
    if (clk_internal) return;
    uint32_t t = now();
    if (b == 0xF8) {
        if (ext_active && t - ext_last < 500) {
            uint32_t d = (t - ext_last) * 16;
            ext_iv = ext_iv ? (ext_iv * 9 + d) / 10 : d;
            uint32_t v = (60000UL * 16 + ext_iv * 12) / (ext_iv * 24);
            bpm = v < 40 ? 40 : v > 240 ? 240 : (uint8_t)v;
        }
        ext_active = true; ext_last = t;
        if (playing) { if (ext_ticks % 6 == 0) clock_step(); else sr_pulse_task(); ext_ticks++; }
    } else if (b == 0xFA) { start_clock(); ext_ticks = 0; ms_run = cur_page == MS_PAGE; }
    else if (b == 0xFB) playing = true;
    else if (b == 0xFC) stop_clock();
}

/* ---------------- Step recorder (layer 3 page 1): 4 tracks, step record (stopped) and live record (playing) ---------------- */
#define SR_T (&sr_tr[sr_target])
static bool sr_held(void) { for (uint8_t p = 0; p < 100; p++) if (key_down[p] && (held_flags[p] & 32)) return true; return false; }
static void sr_cursor(uint8_t t, uint8_t k) { sr_tr[t].cursor = k; if (t == sr_target) sr_half = k >> 3; }
static void sr_add(srstep_t *s, int16_t n, uint8_t ch) {
    for (uint8_t j = 0; j < s->cnt; j++) if (s->n[j] == n && s->ch[j] == ch) return;
    if (s->cnt < SR_MAXN) { s->n[s->cnt] = (uint8_t)n; s->ch[s->cnt] = ch; s->cnt++; }
}
static void sr_new(srstep_t *s, uint8_t kind) { memset(s, 0, sizeof(srstep_t)); s->kind = kind; s->vel = 3; s->prob = 4; s->rat = 1; }
static void sr_set_bars(uint8_t b) {
    if (b == sr_bars) return;
    sr_bars = b;
    for (uint8_t i = 0; i < 4; i++) { sr_tr[i].len = 16 * b; if (sr_tr[i].cursor > sr_tr[i].len - 1) sr_tr[i].cursor = sr_tr[i].len - 1; }
    if (sr_half > 2 * b - 1) sr_half = 2 * b - 1;
}
static void sr_set_kb(uint8_t k) { sr_kb = k; if (k == 2) sr_mode = 0; }
static void sr_play(srstep_t *s, uint32_t dur) { if (s->kind == 1) for (uint8_t j = 0; j < s->cnt; j++) fire(s->ch[j], s->n[j], dur, sr_vel_v[s->vel]); }
static void fx_seq_note(uint8_t ch, int16_t n, int16_t v, uint32_t dur);
/* a note key was pressed on the step recorder page: record it when Board REC is on */
static void sr_note(uint8_t p, int16_t *ns, uint8_t cnt, uint8_t ch) {
    uint8_t ok = 0;
    for (uint8_t j = 0; j < cnt; j++) if (ns[j] >= 0 && ns[j] <= 127) ok++;
    if (!rec_mode || !ok) return;
    held_flags[p] |= 32;
    srstep_t *s;
    if (playing) {                                            /* live record into the step that is playing */
        srtrack_t *t = SR_T; uint8_t k = t->ph < 0 ? 0 : t->ph;
        s = &t->steps[k];
        if (t->rec_tick != t->ph_tick || s->kind != 1) { sr_new(s, 1); t->rec_tick = t->ph_tick; }
        sr_cursor(sr_target, k);
    } else {
        if (!sr_group) { srtrack_t *t = SR_T; sr_group = true; sr_gtr = sr_target; sr_gstep = t->cursor; sr_new(&t->steps[t->cursor], 1); }
        s = &sr_tr[sr_gtr].steps[sr_gstep];                   /* keys held together = one step */
    }
    for (uint8_t j = 0; j < cnt; j++) if (ns[j] >= 0 && ns[j] <= 127) sr_add(s, ns[j], ch);
}
static void sr_key_up(void) {                                 /* step record: move on when every recorded key is up */
    if (!sr_group || sr_held()) return;
    sr_group = false;
    srtrack_t *t = &sr_tr[sr_gtr];
    sr_cursor(sr_gtr, (t->cursor + 1) % t->len);
}
static void sr_arrow(int8_t d, bool big) {                    /* right / left = step, up / down = track */
    srtrack_t *t = SR_T;
    sr_group = false;
    if (big) { sr_cursor(sr_target, (uint8_t)((t->cursor + d + t->len) % t->len)); return; }
    uint8_t nt = (uint8_t)((sr_target - d + 4) % 4);
    sr_target = nt; sr_cursor(nt, t->cursor < sr_tr[nt].len - 1 ? t->cursor : sr_tr[nt].len - 1);
}
static void sr_press(uint8_t n) {
    uint8_t col = n & 7, row = n >> 3, k = sr_half * 8 + col;
    fx_last = 24 + (sr_mode ? sr_target : row);
    if (sr_mode) {                                            /* edit mode: the 4 rows are 4 levels (velocity, probability or ratchet) of the target track */
        srtrack_t *t = SR_T; srstep_t *s = &t->steps[k];
        if (k >= t->len) return;
        sr_cursor(sr_target, k); sr_group = false;
        if (s->kind == 1 && s->cnt) { uint8_t lv = 4 - row; if (sr_mode == 1) s->vel = lv; else if (sr_mode == 2) s->prob = lv; else s->rat = lv; sr_play(s, SR_PREVIEW_MS); }
        return;
    }
    srtrack_t *t = &sr_tr[row];
    if (k >= t->len) return;
    if (del_down) { memset(&t->steps[k], 0, sizeof(srstep_t)); return; }
    sr_target = row; sr_cursor(row, k); sr_group = false; sr_play(&t->steps[k], SR_PREVIEW_MS);
}
static void sr_step(void) {                                   /* one 16th step: metronome and drum steps */
    uint32_t per = per16(), k = sr_tick++;
    uint8_t dch = zone_ch(DRUM_ZONE), si = k % (16 * sr_bars);
    sr_dph = si;
    if (!on_sr_page()) return;
    if (sr_metro && k % 4 == 0) fire(dch, SR_CLICK, per / 2, k % 16 == 0 ? 127 : 70);
    for (uint8_t l = 0; l < 16; l++) if ((sr_dseq[l] >> si) & 1) fire(dch, sr_drums[l], per / 2, 127);
}
static void sr_advance(srtrack_t *t) {
    uint8_t L = t->len;
    if (t->dir == 0) t->pos = (int8_t)((t->pos + 1) % L);
    else if (t->dir == 1) t->pos = (t->pos <= 0 || t->pos > L - 1) ? L - 1 : t->pos - 1;
    else if (t->dir == 2) {
        if (L < 2 || t->pos < 0) { t->pos = 0; t->pp = 1; }
        else { int8_t q = t->pos + t->pp; if (q >= L || q < 0) { t->pp = -t->pp; q = t->pos + t->pp; } t->pos = (int8_t)clampi(q, 0, L - 1); }
    } else t->pos = (int8_t)rnd_int(L);
}
static void sr_out(uint32_t at, uint8_t ch, uint8_t n, uint8_t v, uint32_t dur, uint8_t tr) {
    if ((int32_t)(at - now()) > 0) { if (nsrq < SRQ) { srq_t *e = &srq[nsrq++]; e->at = at; e->ch = ch; e->n = n; e->v = v; e->dur = dur; e->tr = tr; } return; }
    if (fx_for(24 + tr)) fx_seq_note(ch, n, v, dur); else fire(ch, n, dur, v);
}
static bool sr_queue_task(void) {                             /* swing and ratchet notes that are due (in the order they were queued) */
    bool did = false; uint8_t j = 0;
    srq_t due[SRQ]; uint8_t nd = 0;
    for (uint8_t k = 0; k < nsrq; k++) { if ((int32_t)(now() - srq[k].at) >= 0) due[nd++] = srq[k]; else srq[j++] = srq[k]; }
    nsrq = j;
    for (uint8_t k = 0; k < nd; k++) { sr_out(now(), due[k].ch, due[k].n, due[k].v, due[k].dur, due[k].tr); did = true; }
    return did;
}
static void sr_pulse_task(void) {                             /* one clock pulse (24 per beat): tracks step at their own rate */
    /*@ARCH lfo #21@*/
    uint32_t p = sr_pulse++, per = per16();
    bool on = on_sr_page();
    for (uint8_t n = 0; n < 4; n++) {
        srtrack_t *t = &sr_tr[n];
        uint8_t pp = sr_pp[t->trip ? 3 + t->rate : t->rate];
        if (p % pp) continue;
        sr_advance(t);
        uint8_t i = (uint8_t)t->pos;
        t->ph = (int8_t)i; t->ph_tick = t->cnt; t->cnt++;
        if (rec_mode && n == sr_target && !sr_held()) sr_half = i >> 3;   /* the step page follows the playhead while recording */
        srstep_t *s = &t->steps[i];
        if (!on || t->mute || s->kind != 1) continue;
        if (s->prob < 4 && rnd_int(100) >= (uint32_t)s->prob * 25) continue;
        uint32_t ms = per * pp / 6, sw = (t->ph_tick % 2) ? ms * t->swing / 10 : 0, dur;
        uint8_t r = s->rat ? s->rat : 1, len = 1;
        if (t->dir == 0) for (uint8_t j = i + 1; j < t->len && t->steps[j].kind == 3; j++) len++;
        dur = r > 1 ? (ms / r) * 4 / 5 : (len - 1) * ms + ms * 4 / 5;
        for (uint8_t k = 0; k < r; k++) for (uint8_t j = 0; j < s->cnt; j++) sr_out(now() + sw + k * ms / r, s->ch[j], s->n[j], sr_vel_v[s->vel], dur, n);
    }
}

/* ---------------- Mini sequencer (layer 1 page 1): drums or a piano ---------------- */
static inline bool mel_target(void) { return ms_target == 0 || ms_target == 1; }
static uint8_t nearest_step(void) { return (playing && now() - last_step_t > per16() / 2) ? (last_step + 1) % 16 : (last_step < 0 ? 0 : last_step); }
static void ms_clear_step(uint8_t s) {
    if (mel_target()) { mel[ms_target][s].cnt = 0; mel[ms_target][s].len = 1; }
    else for (uint8_t l = 0; l < 16; l++) mseq[l] &= ~(1 << s);
}
static void ms_clear_all(void) {
    if (mel_target()) for (uint8_t s = 0; s < 16; s++) { mel[ms_target][s].cnt = 0; mel[ms_target][s].len = 1; }
    else memset(mseq, 0, sizeof(mseq));
    show_text("CL", false, 0, false, false);
}
static void ms_copy(void) {
    if (mel_target()) { memcpy(clip_m, mel[ms_target], sizeof(clip_m)); clip_kind = 2; }
    else { memcpy(clip_d, mseq, sizeof(clip_d)); clip_kind = 1; }
    show_text("CP", false, 0, false, false);
}
static void ms_paste(uint8_t s) {
    paste_armed = false;
    if (!clip_kind || (clip_kind == 2) != mel_target()) { show_text("--", false, 0, false, false); return; }
    if (clip_kind == 1) for (uint8_t l = 0; l < 16; l++) { uint32_t b = clip_d[l]; mseq[l] = (uint16_t)(((b << s) | (b >> (16 - s))) & 0xFFFF); }
    else for (uint8_t k = 0; k < 16; k++) mel[ms_target][(k + s) % 16] = clip_m[k];
    show_text("PS", false, 0, false, false);
}

/* ---------------- MIDI effects (layer 3 page 4) ---------------- */
static void fx_echoes(uint8_t ch, int16_t n, int16_t v, uint32_t at) {
    uint32_t b = beat_ms();
    if (fx_on[0]) {
        uint32_t T = b * delay_mb[FXV(0, 0)] / 1000; uint8_t reps = FXV(0, 1) + 1; int16_t vv = v;
        for (uint8_t k = 1; k <= reps; k++) { vv = vv * dl_decay[FXV(0, 2)] / 100; fx_note(ch, n + dl_shift[FXV(0, 3)] * k, vv, at + T * k, T * 8 / 10); }
    }
    if (fx_on[3]) {
        uint32_t T = b * delay_mb[FXV(3, 0)] / 1000; uint8_t reps = FXV(3, 1) + 1, st = rd_start[FXV(3, 2)];
        for (uint8_t k = 1; k <= reps; k++) fx_note(ch, n, v * (st + (100 - st) * (k - 1) / reps) / 100, at + T * k, T * 8 / 10);
    }
    if (fx_on[4]) {
        uint32_t T = b * delay_mb[FXV(4, 0)] / 1000; uint8_t reps = FXV(4, 1) + 1, w = 63 * width_p[FXV(4, 3)] / 100; int16_t vv = v;
        for (uint8_t k = 1; k <= reps; k++) {
            fxq_add(at + T * k - 1, 2, ch, 10, (k % 2) ? 64 - w : 64 + w, -1);
            vv = vv * dl_decay[FXV(4, 2)] / 100;
            fx_note(ch, n, vv, at + T * k, T * 8 / 10);
        }
        fxq_add(at + T * (reps + 1), 2, ch, 10, 64, -1);
    }
}
static void fx_emit(uint8_t ch, int16_t n, int16_t v, uint32_t at, uint32_t dur) {
    uint8_t cnt = 1; uint32_t sp = 0; uint8_t dec = 100;
    if (fx_on[7]) { cnt = FXV(7, 0) + 2; sp = beat_ms() * ra_span[FXV(7, 1)] / 1000 / cnt; dur = sp * 6 / 10; dec = ra_decay[FXV(7, 2)]; }
    int16_t vv = v;
    for (uint8_t k = 0; k < cnt; k++) {
        uint32_t t = at + sp * k;
        fx_note(ch, n, vv, t, dur);
        if (fx_on[1]) fx_note(ch, n + ch_int[FXV(1, 0)], vv * ch_lvl[FXV(1, 2)] / 100, t + ch_off[FXV(1, 1)], dur);
        fx_echoes(ch, n, vv, t);
        vv = vv * dec / 100;
    }
}
/* a note from a step recorder track that has effects on (no held key): harmonizer, then fx_emit (ratchet, chorus, echoes) */
static void fx_seq_note(uint8_t ch, int16_t n, int16_t v, uint32_t dur) {
    fx_ch = ch;
    uint32_t t = now();
    fx_emit(ch, n, v, t, dur);
    if (fx_on[5]) {
        bool ik = in_scale(n);
        int16_t ints[5] = {n + 12, n - 12, n + 7, ik ? step_up(n, 6) : n + 10, ik ? step_up(n, 2) : n + 4};
        for (uint8_t q = 0; q < 5; q++) if (FXV(5, q)) fx_emit(ch, ints[q], ha_vel[FXV(5, q)], t, dur);
    }
}
static void fx_all_off(void) {                                /* effects off on every keyboard and track */
    fx_all = false; memset(fx_el, 0, sizeof(fx_el));
    if (fx_cc11 != 127) { fx_cc11 = 127; cc(fx_ch, 11, 127); }
    if (fx_pbv != 0) { fx_pbv = 0; bend(fx_ch, 0); }
}
static void fx_note_on(uint8_t p, uint8_t ch, int16_t *ns, uint8_t cnt) {
    hit_t *h = fx_hits[p]; uint8_t nh = 0;
    fx_ch = ch;
    for (uint8_t j = 0; j < cnt && nh < MAXHITS; j++) { h[nh].n = ns[j]; h[nh].v = 127; h[nh].t = 0; nh++; }
    if (fx_on[5]) {
        for (uint8_t j = 0; j < cnt; j++) {
            int16_t n = ns[j]; bool ik = in_scale(n);
            int16_t ints[5] = {n + 12, n - 12, n + 7, ik ? step_up(n, 6) : n + 10, ik ? step_up(n, 2) : n + 4};
            for (uint8_t q = 0; q < 5 && nh < MAXHITS; q++) if (FXV(5, q) && ints[q] >= 0 && ints[q] <= 127) { h[nh].n = ints[q]; h[nh].v = ha_vel[FXV(5, q)]; h[nh].t = 0; nh++; }
        }
    }
    if (fx_on[8] && nh > 1) {
        uint8_t d = FXV(8, 1);
        for (uint8_t a = 1; a < nh; a++) { hit_t x = h[a]; int8_t b = a - 1; while (b >= 0 && h[b].n > x.n) { h[b + 1] = h[b]; b--; } h[b + 1] = x; }
        bool rev = (d >= 2 && d <= 3) || (d >= 4 && fx_stalt);
        if (d >= 4) fx_stalt = !fx_stalt;
        if (rev) for (uint8_t a = 0; a < nh / 2; a++) { hit_t x = h[a]; h[a] = h[nh - 1 - a]; h[nh - 1 - a] = x; }
        for (uint8_t k = 0; k < nh; k++) {
            h[k].t += k * st_speed[FXV(8, 0)];
            int16_t pc = 100 - k * ramp_p[FXV(8, 2)]; if (pc < 10) pc = 10;
            h[k].v = h[k].v * pc / 100;
        }
    }
    if (fx_on[11]) {
        for (uint8_t k = 0; k < nh; k++) {
            if (hu_time[FXV(11, 0)]) h[k].t += rand() % (hu_time[FXV(11, 0)] + 1);
            if (hu_vel[FXV(11, 1)]) h[k].v = clampi(h[k].v + (rand() % (2 * hu_vel[FXV(11, 1)] + 1)) - hu_vel[FXV(11, 1)], 1, 127);
            if ((rand() % 100) < hu_note[FXV(11, 2)]) h[k].n = clampi(snap(h[k].n + (rand() % 15) - 7), 0, 127);
        }
    }
    if (fx_on[9]) {
        uint8_t gc = fl_count[FXV(9, 0)], sp = fl_space[FXV(9, 1)], gl = fl_lvl[FXV(9, 2)];
        for (uint8_t k = 0; k < nh; k++) {
            for (uint8_t g = 0; g < gc; g++) fx_note(ch, h[k].n, h[k].v * gl / 100, now() + h[k].t + g * sp, sp * 8 / 10);
            h[k].t += gc * sp;
        }
    }
    if (fx_on[1] && !fx_on[6] && !fx_on[7]) {
        uint8_t n0 = nh;
        for (uint8_t k = 0; k < n0 && nh < MAXHITS; k++) {
            int16_t m = h[k].n + ch_int[FXV(1, 0)];
            if (m < 0 || m > 127) continue;
            h[nh].n = m; h[nh].v = h[k].v * ch_lvl[FXV(1, 2)] / 100; h[nh].t = h[k].t + ch_off[FXV(1, 1)]; nh++;
        }
    }
    bool any = false;
    for (uint8_t q = 0; q < 100; q++) if (fx_held[q]) any = true;
    if (!any) fx_first = now();
    fx_held[p] = true; fx_hn[p] = nh; fx_hch[p] = ch; fx_roll[p] = fx_on[6]; fx_rollk[p] = 0; fx_rollnext[p] = now();
    if (fx_roll[p]) return;
    if (fx_on[7]) { for (uint8_t k = 0; k < nh; k++) fx_emit(ch, h[k].n, h[k].v, now() + h[k].t, 60); return; }
    for (uint8_t k = 0; k < nh; k++) {
        if (h[k].t == 0) key_note_add(p, ch, h[k].n, h[k].v);
        else fxq_add(now() + h[k].t, 3, ch, h[k].n, h[k].v, p);
        fx_echoes(ch, h[k].n, h[k].v, now() + h[k].t);
    }
}
static void fx_note_off(uint8_t p) { if (!fx_held[p]) return; key_notes_off(p); fx_held[p] = false; fx_roll[p] = false; }
static void fx_task(void) {
    uint32_t t = now(), b = beat_ms();
    for (uint8_t p = 0; p < 100; p++) {
        if (!fx_roll[p] || (int32_t)(t - fx_rollnext[p]) < 0) continue;
        uint32_t per = b * rate_mb[FXV(6, 0)] / 1000;
        uint8_t shape = FXV(6, 2); uint16_t k = fx_rollk[p]++;
        int16_t lvl = shape <= 1 ? 100 : shape <= 3 ? (40 + 10 * k > 100 ? 100 : 40 + 10 * k) : (100 - 10 * (int16_t)k < 20 ? 20 : 100 - 10 * k);
        for (uint8_t j = 0; j < fx_hn[p]; j++) fx_emit(fx_hch[p], fx_hits[p][j].n, fx_hits[p][j].v * lvl / 100, t + fx_hits[p][j].t, per * gate_p[FXV(6, 1)] / 100);
        int32_t sw = (int32_t)per * swing_p[FXV(6, 3)] / 100;
        fx_rollnext[p] += per + ((k % 2 == 0) ? sw : -sw);
        if ((int32_t)(fx_rollnext[p] - t) <= 0) fx_rollnext[p] = t + per;
    }
    for (uint8_t pass = 0; pass < 2; pass++) {
        for (int16_t i = 0; i < nfxq; i++) {
            fxev_t *e = &fxq[i];
            if ((int32_t)(t - e->at) < 0) continue;
            if ((pass == 0) != (e->type == 1)) continue;
            switch (e->type) {
                case 0: note_on(e->ch, e->n, e->v); break;
                case 1: note_off(e->ch, e->n); break;
                case 2: cc(e->ch, e->n, e->v); break;
                case 3:
                    if (e->key >= 0 && fx_held[e->key]) key_note_add(e->key, e->ch, e->n, e->v);
                    else { note_on(e->ch, e->n, e->v); fxq_add(t + 60, 1, e->ch, e->n, 0, -1); }
                    break;
            }
            fxq[i] = fxq[--nfxq]; i--;
        }
    }
    if (t - fx_lfo_t < LFO_MS) return;
    fx_lfo_t = t;
    if (fx_on[2] && fx_any()) {
        uint32_t per = b * rate_mb[FXV(2, 0)] * 2 / 1000; if (!per) per = 1;
        uint8_t ph = (uint8_t)((t % per) * 64 / per), d = depth_p[FXV(2, 1)], sh = FXV(2, 2);
        int16_t w = sh <= 1 ? (127 + sine64[(ph + 16) % 64]) / 2 : sh <= 3 ? (ph < 32 ? 127 : 0) : 127 - ph * 2;
        uint8_t v = (uint8_t)(127 - (int32_t)127 * d / 100 + (int32_t)w * d / 100);
        if (v != fx_cc11) { fx_cc11 = v; cc(fx_ch, 11, v); }
    } else if (fx_cc11 != 127) { fx_cc11 = 127; cc(fx_ch, 11, 127); }
    bool any = false;
    for (uint8_t q = 0; q < 100; q++) if (fx_held[q]) any = true;
    if (fx_on[10] && any && t - fx_first >= vb_delay[FXV(10, 2)]) {
        uint32_t per = b * rate_mb[FXV(10, 0)] / 1000; if (!per) per = 1;
        int16_t v = (int32_t)8191 * vb_depth[FXV(10, 1)] / 100 * sine64[(t % per) * 64 / per] / 127;
        if (v != fx_pbv) { fx_pbv = v; bend(fx_ch, v); }
    } else if (fx_pbv != 0) { fx_pbv = 0; bend(fx_ch, 0); }
}
static void fx_off(uint8_t k) {
    fx_on[k] = false;
    if (k == 2 && fx_cc11 != 127) { fx_cc11 = 127; cc(fx_ch, 11, 127); }
    if (k == 4) cc(fx_ch, 10, 64);
}
/* tap = edit this effect's faders; double-tap = switch it on / off */
static void fx_press(uint8_t k) {
    if (fx_last_key == (int8_t)k && timer_elapsed32(fx_last_t) < DOUBLE_TAP_MS) { if (fx_on[k]) fx_off(k); else fx_on[k] = true; fx_last_t = now() - 10000; }
    else fx_last_t = now();
    fx_last_key = k; fx_sel = k;
}

/*@ARCH mac #20@*/

/* ---------------- XY pad ---------------- */
static bool xy_any_held(void) { for (uint8_t p = 0; p < 100; p++) if (held_xy[p] >= 0) return true; return false; }
static void xy_send(void) {
    if (xy_cur_x != xy_sent_x) { cc(8 + xy_eff, 16, xy_cur_x); xy_sent_x = xy_cur_x; }
    if (xy_cur_y != xy_sent_y) { cc(8 + xy_eff, 17, xy_cur_y); xy_sent_y = xy_cur_y; }
}
static void xy_touch(bool on) { if (xy_touch_on == on) return; xy_touch_on = on; cc(8 + xy_eff, 18, on ? 127 : 0); }
static void xy_update(bool jump) {
    uint16_t n = 0, sx = 0, sy = 0;
    for (uint8_t p = 0; p < 100; p++) if (held_xy[p] >= 0) { sx += held_xy[p] % 8; sy += held_xy[p] / 8; n++; }
    if (!n) return;
    xy_tgt_x = ((uint32_t)2 * sx * 127 + 7 * n) / (14 * n);
    xy_tgt_y = ((uint32_t)2 * sy * 127 + 7 * n) / (14 * n);
    if (jump || XY_GLIDE_STEP == 0) { xy_cur_x = xy_tgt_x; xy_cur_y = xy_tgt_y; xy_moving = false; xy_send(); }
    else { xy_moving = true; xy_timer = now(); }
}
static uint8_t step_toward(uint8_t c, uint8_t t) {
    if (c < t) return (t - c <= XY_GLIDE_STEP) ? t : c + XY_GLIDE_STEP;
    if (c > t) return (c - t <= XY_GLIDE_STEP) ? t : c - XY_GLIDE_STEP;
    return c;
}
static void xy_task(void) {
    if (!xy_moving || timer_elapsed32(xy_timer) < XY_GLIDE_MS) return;
    xy_timer = now();
    xy_cur_x = step_toward(xy_cur_x, xy_tgt_x); xy_cur_y = step_toward(xy_cur_y, xy_tgt_y);
    xy_send();
    if (xy_cur_x == xy_tgt_x && xy_cur_y == xy_tgt_y) xy_moving = false;
}
static bool page_has_xy(uint8_t page) {
    int8_t f;
    for (uint8_t p = 0; p < 100; p++) if (KTYPE(resolve_cell(page, p, false, &f)) == T_XY) return true;
    return false;
}
static void xy_leave(void) { xy_hold = false; if (!xy_any_held()) xy_touch(false); }
static void page_check(void) {
    uint8_t p = cur_layer * NUM_SLOTS + slots[cur_layer];
    if (p == cur_page) return;
    if (page_has_xy(cur_page) && !page_has_xy(p)) xy_leave();
    if (p != MS_PAGE) { ms_run = false; ms_hold_step = -1; }
    if ((int8_t)p != sr_page) sr_group = false;
    cur_page = p; nav_t = now() + 1000;                  /* the layer / page indicator flashes for 1 s */
}
static void set_slot(int8_t s) {
    int8_t n = layer_pages[cur_layer];
    slots[cur_layer] = (uint8_t)(((s % n) + n) % n); page_check();
    char t[2] = {'P', (char)('1' + slots[cur_layer])};
    show_text_ms(t, false, 0, false, false, PAGE_TEXT_MS);
}

/* ---------------- Knobs, tempo, hold + arrows ---------------- */
static void knob(uint8_t ch, uint8_t n, int8_t dir) {
#if KNOB_RELATIVE
    cc(ch, n, dir > 0 ? 65 : 63);
#else
    knob_val[n] = (uint8_t)clampi((int16_t)knob_val[n] + dir * KNOB_STEP, 0, 127);
    cc(ch, n, knob_val[n]);
#endif
}
static void tempo_by(uint8_t ch, int16_t d) {
    int16_t nb = clampi((int16_t)bpm + d, 40, 240), real = nb - bpm;
    bpm = (uint8_t)nb;
    if (real) cc(ch, CC_TEMPO, (uint8_t)clampi(64 + real, 1, 127));
}
static void gh_param(uint8_t n, int8_t d, bool big);
/* d = 0 shows the value; +1 / -1 changes it; big = right / left arrow */
static void param(int8_t d, bool big) {
    bool top = param_top;
    int16_t lim = TRANSPOSE_LIMIT;
    if (d) param_used = true;
    switch (param_type) {
        case T_SCALE: {
            uint8_t bank = scale_bank[scale];
            if (d && big) { uint8_t nb = (bank + 1) % 2; bank_idx[bank] = scale; scale = bank_idx[nb]; }
            else if (d) { uint8_t f = bank_first[bank], n = bank_size[bank]; scale = f + (uint8_t)((scale - f + d + n) % n); bank_idx[bank] = scale; }
            show_text(scale_code[scale], top, scale_bank[scale] ? 2 : 0, false, true); break;
        }
        case T_ROOT: root = (uint8_t)((root + d * (big ? 7 : 1) + 84) % 12); show_text(note_text[root], top, 0, false, true); break;
        case T_OCT:
            if (param_side >= 0) { harm_oct[param_side] = (int8_t)clampi(harm_oct[param_side] + 12 * d, -36, 36); show_num(harm_oct[param_side] / 12, top, true, true); break; }   /* harmony: one half */
            transpose = (int8_t)clampi(transpose + d * (big ? 12 : 1), -lim, lim); show_num(transpose, top, true, true); break;
        case T_TEMPO: if (d) tempo_by(param_ch, d * (big ? 10 : 1)); show_num(bpm, top, false, true); break;
        case T_CHAN: gch = (uint8_t)clampi(gch + d * (big ? 4 : 1), 0, 15); show_num(gch + 1, top, false, true); break;
        case T_VOL: case T_ZV: {
            uint8_t ch = param_type == T_VOL ? gch : zone_ch(param_zone);
            if (d) { vol[ch] = (uint8_t)clampi(vol[ch] + d * (big ? 10 : 1), 0, 127); cc(ch, 7, vol[ch]); }
            show_num(vol[ch], top, false, true); break;
        }
        case T_ZC: {
            zone_t *z = &zones[param_zone];
            z->ch = (uint8_t)clampi(z->ch + d * (big ? 4 : 1), (param_zone < 4 || param_zone == DRUM_ZONE) ? 0 : 1, 16);
            if (z->ch) show_num(z->ch, top, false, true); else show_text("G ", top, 0, false, true);
            break;
        }
        case T_ZO: zones[param_zone].xp = (int8_t)clampi(zones[param_zone].xp + d * (big ? 12 : 1), -lim, lim); show_num(zones[param_zone].xp, top, true, true); break;
        case T_ZT: case T_ZK:
            if (param_type == T_ZK && !d) break;
            zones[param_zone].ctype = (uint8_t)((zones[param_zone].ctype + d * (big ? 4 : 1) + NUM_CHORDS * 4) % NUM_CHORDS);
            show_text(chord_code[zones[param_zone].ctype], top, 0, false, true); break;
        case PT_ARP: {                                           /* up / down = next / previous pattern, left / right = cadence stop bars (1-8) */
            if (d && big) { arp_cad = (uint8_t)clampi(arp_cad + d, 1, 8); char s2[2] = {'C', (char)('0' + arp_cad)}; show_text(s2, top, 0, false, true); break; }
            if (d) { do { arp_mode = (uint8_t)((arp_mode + d + 15) % 15); } while (arp_mode == 7); if (arp_mode != 13) arp_pat = arp_mode; arp_cstep = 0; }
            show_text(arp_code[arp_mode], top, 0, false, true); break;
        }
        case T_RL: {                                             /* up / down = speed, right = direction, left = velocity ramp */
            if (d && big) { if (d > 0) { roll.dir = (uint8_t)((roll.dir + 1) % 3); show_text(roll_dir_c[roll.dir], top, 0, false, true); } else { roll.ramp = (uint8_t)((roll.ramp + 1) % 3); show_text(roll_ramp_c[roll.ramp], top, 0, false, true); } break; }
            if (d) roll.speed = (uint8_t)clampi(roll.speed + d, 0, 5);
            show_num(roll_ms[roll.speed], top, false, true); break;
        }
        case T_BARS: { if (d) sr_set_bars((uint8_t)clampi(sr_bars + d, 1, 2)); char s[2] = {'B', (char)('0' + sr_bars)}; show_text(s, top, 0, false, true); break; }
        case T_SK: { if (d) sr_set_kb((uint8_t)clampi(sr_kb + d, 0, 2)); char s[2] = {'K', (char)('1' + sr_kb)}; show_text(s, top, 0, false, true); break; }
        case T_LN: {
            srtrack_t *t = SR_T;
            if (d) { t->len = (uint8_t)clampi(t->len + d * (big ? 4 : 1), 1, 16 * sr_bars); if (t->cursor > t->len - 1) t->cursor = t->len - 1; }
            show_num(t->len, top, false, true); break;
        }
        case T_GH: gh_param(param_n, d, big); break;
        case T_SRT: { srtrack_t *t = SR_T; if (d) { if (big) t->trip = d > 0; else t->rate = (uint8_t)clampi(t->rate + d, 0, 2); } show_text(sr_rate_code[t->rate], top, t->trip ? 3 : 0, false, true); break; }
        case T_SSW: { srtrack_t *t = SR_T; if (d) t->swing = (uint8_t)clampi(t->swing + d, 0, 5); show_num(t->swing * 10, top, false, true); break; }
        case T_SDR: { srtrack_t *t = SR_T; if (d) t->dir = (uint8_t)((t->dir + d + 4) % 4); show_text(sr_dir_code[t->dir], top, 0, false, true); break; }
    }
}
static void mod_press(modkey_t *m) {
    if (m->locked) m->locked = false;
    else if (timer_elapsed32(m->last) < DOUBLE_TAP_MS) m->locked = true;
    m->last = now(); m->held = true;
}
static void release_latched(void) {
    for (uint8_t p = 0; p < 100; p++) if (key_latched[p] && !key_down[p]) key_notes_off(p);
    for (int8_t k = arp_count - 1; k >= 0; k--) if (arp_notes[k].latched) arp_remove(k);
    if (!arp_count) arp_stop();
}
static void eu_param(uint8_t l, int8_t d);
static void eu_arrow_do(int8_t d, bool big);
static void gh_param(uint8_t n, int8_t d, bool big);
static void gt_press(uint8_t n);
/* ======== v12 pages: MIDI echo, CC sequencer, chord progression, Pond, Constellation ======== */
/*@ARCH ec #19@*/
/* ---- CC step sequencer (layer 3 page 4): 4 lanes x 8 steps, each step a CC value, 16th-note steps ---- */
static inline uint8_t cq_level(uint8_t s) { return (uint8_t)((s * 127) / 7); }   /* lane key 1-8 -> value 0 ... 127 */
static void cq_key(uint8_t n, int8_t p) {                    /* p = -1: called by the key repeat */
    cqy_t *Y = &cqy[cq_layer]; uint8_t l = cq_sel_l, *V = &Y->v[l][cq_sel_s];
    static const int8_t vd[4] = {-8, 8, -1, 1};
    if (n <= 3) { *V = (uint8_t)clampi(*V + vd[n], 0, 127); cc(cq_ch, Y->cc[l], *V); SNUM(*V); }
    else if (n <= 5) { tempo_by(cq_ch, n == 4 ? -5 : 5); SNUM(bpm); }
    else if (n <= 7) { cq_len[l] = (uint8_t)clampi(cq_len[l] + (n == 6 ? -1 : 1), 1, 8); SNUM(cq_len[l]); }
    else if (n <= 9) { Y->cc[l] = (uint8_t)clampi(Y->cc[l] + (n == 8 ? -1 : 1), 0, 127); SNUM(Y->cc[l]); }
    else if (n <= 11) { cq_ch = (uint8_t)clampi(cq_ch + (n == 10 ? -1 : 1), 0, 15); SNUM(cq_ch + 1); }
    else if (n == 12) {                                      /* play / stop of this sequencer */
        if (cq_run) { cq_run = false; if (cq_own && playing) stop_clock(); cq_own = false; STXT("OF"); }
        else { cq_run = true; cq_pos = 0; if (!playing) { start_clock(); cq_own = true; } STXT("ON"); }
    }
    else if (n == 13) { cq_pos = 0; STXT("RS"); }
    else if (n == 14) { Y->on[l] = 0xFF; STXT("FL"); }
    else if (n == 15) { Y->on[l] = 0; for (uint8_t s = 0; s < 8; s++) Y->v[l][s] = 64; STXT("CL"); }
    else if (n >= 19 && n <= 22) { cq_mute ^= (uint8_t)(1 << (n - 19)); STXT((cq_mute >> (n - 19)) & 1 ? "MU" : "ON"); }
    else if (n == 23) { cq_rec = !cq_rec; cq_ent_l = 0xFF; STXT(cq_rec ? "RC" : "OF"); }   /* record: tap a step, then a key 1-8 for its value */
    if (n <= 11 && p >= 0) { rep_key = p; rep_kind = 8; rep_on = false; rep_t = now(); }
}
static void cq_cell(uint8_t n) {
    cqy_t *Y = &cqy[cq_layer]; uint8_t l = n >> 3, s = n & 7;
    cq_sel_l = l;
    if (!cq_rec) { uint8_t v = cq_level(s); cc(cq_ch, Y->cc[l], v); SNUM(v); return; }                 /* not recording: the lane is a fader (live) */
    if (cq_ent_l == l) {
        if (s == cq_ent_s && timer_elapsed32(cq_ent_t) < DOUBLE_TAP_MS) { Y->on[l] ^= (uint8_t)(1 << s); cq_ent_l = 0xFF; STXT((Y->on[l] >> s) & 1 ? "ON" : "OF"); return; }   /* double-tap a step = on / off */
        Y->v[l][cq_ent_s] = cq_level(s); Y->on[l] |= (uint8_t)(1 << cq_ent_s); cc(cq_ch, Y->cc[l], Y->v[l][cq_ent_s]); cq_sel_s = cq_ent_s; cq_ent_l = 0xFF; SNUM(Y->v[l][cq_sel_s]); return;   /* a key 1-8 sets the value */
    }
    cq_ent_l = l; cq_ent_s = s; cq_ent_t = now(); cq_sel_s = s; SNUM(Y->v[l][s]);                       /* tap a step: the lane's 8 keys flash */
}
static void cq_layer_key(uint8_t n) {
    cq_ent_l = 0xFF;
    if (cq_layer == n) { cq_lon ^= (uint8_t)(1 << n); STXT((cq_lon >> n) & 1 ? "ON" : "OF"); }
    else { cq_layer = n; char s[3] = {'L', (char)('1' + n), 0}; show_text(s, false, 0, false, false); }
}
static void cq_learn_key(uint8_t n) { cq_learn = cq_learn == n + 1 ? 0 : (uint8_t)(n + 1); cq_sel_l = n; STXT(cq_learn ? "LR" : "OF"); }
static void cq_step(void) {
    if (!cq_run) return;
    uint32_t k = cq_pos++;
    for (uint8_t l = 0; l < 4; l++) {
        if ((cq_mute >> l) & 1) continue;
        uint8_t s = k % cq_len[l];
        for (uint8_t a = 0; a < 8; a++) { if (!((cq_lon >> a) & 1)) continue; if ((cqy[a].on[l] >> s) & 1) cc(cq_ch, cqy[a].cc[l], cqy[a].v[l][s]); }
    }
}/* ---- chord progression (Harmony page, chord keys): 4 slots, loop length = the step recorder BARS ---- */
static void prog_off(void) { for (uint8_t k = 0; k < prog_non; k++) note_off(prog_ch, prog_on[k]); prog_non = 0; }
static void prog_key(uint8_t n) {
    if (del_down) { prog_slot[n] = -1; prog_pend[n] = -1; if (prog_cur == (int8_t)n) prog_off(); STXT("--"); return; }
    prog_sel = n; SNUM(n + 1);
}
static void prog_chord(uint8_t cn) {                         /* a chord key was pressed on the Harmony page */
    if (prog_sel < 0) return;
    if (!playing) prog_slot[prog_sel] = cn; else if (rec_mode) prog_pend[prog_sel] = cn;   /* stopped: set now. playing + record: at the next loop. playing only: just loops */
}
static void prog_step(void) {
    if ((int8_t)cur_page != prog_page) { prog_off(); prog_cur = -1; return; }
    uint16_t len = 16 * sr_bars, spc = len / 4, k = prog_tick++ % len;
    if (k == 0) for (uint8_t s = 0; s < 4; s++) if (prog_pend[s] >= 0) { prog_slot[s] = prog_pend[s]; prog_pend[s] = -1; }
    if (k % spc == 0) {
        uint8_t s = k / spc; prog_cur = s; prog_off(); prog_ch = ch_of(cur_page);
        if (prog_slot[s] >= 0) {
            uint8_t d = prog_slot[s] >> 2, ty = prog_slot[s] & 3;
            for (uint8_t j = 0; j < harm_cnt[ty]; j++) {
                int16_t x = degree_pitch(d + harm_steps[ty][j], harm_base()) + harm_oct[0];
                if (x >= 0 && x <= 127) { note_on(prog_ch, x, 100); prog_on[prog_non++] = (uint8_t)x; }
            }
        }
    }
}
/* ---- Pond (layer 4): ripples add up; where the height passes the threshold the cell's note plays. Integer math only ---- */
static const uint8_t  pd_sp[6] = {4, 6, 8, 12, 16, 24};
static const uint16_t pd_reach_v[5] = {150, 250, 400, 700, 1200}, pd_nlen_v[5] = {60, 120, 200, 400, 800};   /* v13: how far a ripple carries, note length in ms */
static const uint16_t pd_wlen[5] = {150, 200, 300, 400, 600}, pd_dec[5] = {62966, 64238, 64668, 65014, 65209}, pd_life[5] = {150, 250, 350, 550, 850};
static const int16_t  sine32[32] = {0, 50, 98, 142, 181, 213, 237, 251, 256, 251, 237, 213, 181, 142, 98, 50, 0, -50, -98, -142, -181, -213, -237, -251, -256, -251, -237, -213, -181, -142, -98, -50};
static uint16_t isqrt32(uint32_t n) { uint32_t r = 0, b = 1UL << 30; while (b > n) b >>= 2; while (b) { if (n >= r + b) { n -= r + b; r = (r >> 1) + b; } else r >>= 1; b >>= 2; } return (uint16_t)r; }
static inline int16_t pd_thrv(void) { return (int16_t)((pd_thr + 1) * 256 / 10); }
static int16_t pd_height(uint8_t x, uint8_t y) {
    int32_t h = 0;
    for (uint8_t k = 0; k < pd_nrip; k++) {
        rip_t *r = &pd_rip[k];
        int32_t dx = (int32_t)x - r->x, dy = (int32_t)y - r->y;
        uint16_t dc = isqrt32((uint32_t)(10000L * (dx * dx + dy * dy)));
        if (dc > r->front) continue;
        int32_t wave = sine32[((uint32_t)(r->front - dc) * 32 / pd_wlen[pd_wl]) % 32], att = 256L * pd_reach_v[pd_reach] / (pd_reach_v[pd_reach] + dc);
        h += ((((int32_t)(r->amp >> 8) * att) >> 8) * wave) >> 8;
    }
    return (int16_t)h;
}
static void pd_play(uint8_t x, uint8_t y, int16_t h) {
    uint8_t ch = ch_of(cur_page);
    int16_t v = clampi(30 + (70 * h) / 256, 1, 127), n;
    if (pd_mode) n = 36 + clampi(((h - pd_thrv()) * 6) / 256, 0, 7);
    else n = degree_pitch(x + 3 * y, 36 + root + transpose + 12 * pd_oct);
    cc(ch, pd_cc, (uint8_t)clampi(20 + (90 * (h < 307 ? h : 307)) / 256, 0, 127));        /* big wave = bright, fading ripple = muffled */
    fire(ch, n, pd_nlen_v[pd_nlen], (uint8_t)v);
}
static void pd_press(uint8_t n) {
    uint8_t x = n & 7, y = n >> 3;
    while (pd_nrip >= pd_maxr) { for (uint8_t k = 1; k < pd_nrip; k++) pd_rip[k - 1] = pd_rip[k]; pd_nrip--; }
    rip_t *r = &pd_rip[pd_nrip++]; r->x = x; r->y = y; r->front = 0; r->amp = 65536; r->age = 0;
    pd_play(x, y, 256);
}
static void pd_param(uint8_t n) {
    int8_t d = (n & 1) ? 1 : -1;
    switch (n >> 1) {
        case 0: pd_speed = (uint8_t)clampi(pd_speed + d, 0, 5); SNUM(pd_speed + 1); break;
        case 1: pd_decay = (uint8_t)clampi(pd_decay + d, 0, 4); SNUM(pd_decay + 1); break;
        case 2: pd_thr = (uint8_t)clampi(pd_thr + d, 0, 8); SNUM(pd_thr + 1); break;
        case 3: pd_wl = (uint8_t)clampi(pd_wl + d, 0, 4); SNUM(pd_wl + 1); break;
        case 5: pd_oct = (int8_t)clampi(pd_oct + d, -2, 2); SNUMS(pd_oct); break;
        case 6: pd_cc = (uint8_t)clampi(pd_cc + d, 0, 127); SNUM(pd_cc); break;
    }
}
/* v13: generative pages: HOLD a setting key and use the arrows (up / right = more, down / left = less) */
#define HNUM(v)  show_num((v), param_top, false, true)
#define HTXT(s)  show_text((s), param_top, 0, false, true)
static void gh_param(uint8_t n, int8_t d, bool big) {
    int8_t p = (int8_t)cur_page;
    if (p == rw_page) {
        switch (n) {
            case 0: if (d) rw.rate = (uint8_t)clampi(rw.rate + d, 0, 4); HNUM(gen_rates[rw.rate]); break;
            case 1: if (d) rw.step = (uint8_t)clampi(rw.step + d, 1, 3); HNUM(rw.step); break;
            case 2: if (d) rw.pull = (uint8_t)clampi(rw.pull + d, 0, 10); HNUM(rw.pull * 10); break;
            case 3: if (d && big) rw.cc = (uint8_t)clampi(rw.cc + d, 0, 127); else if (d) rw.ymode = d > 0; if (big) HNUM(rw.cc); else HTXT(rw.ymode ? "CC" : "VE"); break;
            case 4: if (d) rw.oct = (int8_t)clampi(rw.oct + d, -2, 2); show_num(rw.oct, param_top, true, true); break;
            case 5: if (d) rw.gate = (uint8_t)clampi(rw.gate + d, 0, 3); HNUM(gen_gate[rw.gate]); break;
            case 6: { rwk_t *W = &rw.w[rw.sel]; if (d) W->ch = (uint8_t)clampi(W->ch + d, 0, 16); if (W->ch) HNUM(W->ch); else HTXT("GL"); break; }
        }
    } else if (p == pd_page) {
        switch (n) {
            case 0: if (d) pd_speed = (uint8_t)clampi(pd_speed + d, 0, 5); HNUM(pd_speed + 1); break;
            case 1: if (d) pd_decay = (uint8_t)clampi(pd_decay + d, 0, 4); HNUM(pd_decay + 1); break;
            case 2: if (d) pd_thr = (uint8_t)clampi(pd_thr + d, 0, 8); HNUM(pd_thr + 1); break;
            case 3: if (d) pd_wl = (uint8_t)clampi(pd_wl + d, 0, 4); HNUM(pd_wl + 1); break;
            case 4: if (d) pd_oct = (int8_t)clampi(pd_oct + d, -2, 2); show_num(pd_oct, param_top, true, true); break;
            case 5: if (d) pd_cc = (uint8_t)clampi(pd_cc + d, 0, 127); HNUM(pd_cc); break;
            case 6: if (d) pd_reach = (uint8_t)clampi(pd_reach + d, 0, 4); HNUM(pd_reach + 1); break;
            case 7: if (d) pd_nlen = (uint8_t)clampi(pd_nlen + d, 0, 4); HNUM(pd_nlen + 1); break;
            case 8: if (d) { pd_maxr = (uint8_t)clampi(pd_maxr + d, 1, 8); while (pd_nrip > pd_maxr) { for (uint8_t k = 1; k < pd_nrip; k++) pd_rip[k - 1] = pd_rip[k]; pd_nrip--; } } HNUM(pd_maxr); break;
        }
    }
}
static void gt_press(uint8_t n) {
    if ((int8_t)cur_page == rw_page) { if (n == 0) { rw.run = !rw.run; STXT(rw.run ? "ON" : "OF"); } return; }
    if ((int8_t)cur_page == pd_page) { if (n == 0) { pd_mode = !pd_mode; STXT(pd_mode ? "DR" : "ME"); } else { pd_nrip = 0; STXT("CL"); } }
}
static void pd_key(uint8_t n, uint8_t p) {
    if (n == 8) { pd_mode = !pd_mode; STXT(pd_mode ? "DR" : "ME"); return; }
    if (n == 9) { pd_nrip = 0; STXT("CL"); return; }
    rep_key = p; rep_kind = 9; rep_on = false; rep_t = now(); pd_param(n);
}
static void pd_tick(void) {
    if (!pd_inited) { for (uint8_t c = 0; c < 64; c++) pd_last[c] = -1000000000L; pd_inited = true; }
    if ((int8_t)cur_page != pd_page) { if (pd_nrip) memset(pd_h, 0, sizeof(pd_h)); return; }
    uint32_t t = now(); if ((int32_t)(t - pd_next) < 0) return; pd_next = t + 40;
    uint8_t w = 0;
    for (uint8_t k = 0; k < pd_nrip; k++) {
        rip_t *r = &pd_rip[k];
        r->front += pd_sp[pd_speed]; r->amp = (uint32_t)(((uint64_t)r->amp * pd_dec[pd_decay]) >> 16); r->age++;
        if (r->age <= pd_life[pd_decay]) pd_rip[w++] = *r;
    }
    pd_nrip = w;
    int16_t thr = pd_thrv();
    for (uint8_t c = 0; c < 64; c++) {
        uint8_t x = c & 7, y = c >> 3; int16_t h = pd_nrip ? pd_height(x, y) : 0;
        if (h >= thr && pd_h[c] < thr && (int32_t)t - pd_last[c] > 150) { pd_last[c] = (int32_t)t; pd_play(x, y, h); }
        pd_h[c] = h;
    }
}
/* ---- Constellation (layer 4): anchors joined by a nearest-neighbour path; a playhead runs along it ---- */
static void cn_chord_off(cnc_t *c) { for (uint8_t k = 0; k < c->non; k++) note_off(c->onch, c->on[k]); c->non = 0; }
static void cn_chords_off(void) { for (uint8_t k = 0; k < cn_nch; k++) cn_chord_off(&cn_ch[k]); }
static void cn_rebuild(void) {
    pt_t left[20]; uint8_t nl = cn_na, order[20][2], no = 0, ncell = 0, nch = 0;
    for (uint8_t k = 0; k < cn_na; k++) left[k] = cn_a[k];
    cnc_t nc[20];
    while (nl) {
        pt_t cur = left[0]; for (uint8_t k = 1; k < nl; k++) left[k - 1] = left[k]; nl--;
        cnc_t *c = &nc[nch]; memset(c, 0, sizeof(*c)); c->start = ncell; c->last = -1;
        cn_cells[ncell].x = cur.x; cn_cells[ncell].y = cur.y; cn_cells[ncell].a = 1; ncell++;
        order[no][0] = cur.x; order[no][1] = cur.y; no++;
        for (;;) {
            int8_t best = -1; int32_t bd = 1 << 30;
            for (uint8_t k = 0; k < nl; k++) { int32_t dx = left[k].x - cur.x, dy = left[k].y - cur.y, d = dx * dx + dy * dy; if (d <= (int32_t)cn_maxd * cn_maxd && d < bd) { bd = d; best = k; } }
            if (best < 0) break;
            pt_t q = left[best]; for (uint8_t k = best + 1; k < nl; k++) left[k - 1] = left[k]; nl--;
            int8_t adx = q.x > cur.x ? q.x - cur.x : cur.x - q.x, ady = q.y > cur.y ? q.y - cur.y : cur.y - q.y;
            int8_t st = adx > ady ? adx : ady;
            for (int8_t s = 1; s <= st; s++) {
                int32_t nx = (int32_t)cur.x * st + (int32_t)(q.x - cur.x) * s, ny = (int32_t)cur.y * st + (int32_t)(q.y - cur.y) * s;
                cn_cells[ncell].x = (uint8_t)((2 * nx + st) / (2 * st)); cn_cells[ncell].y = (uint8_t)((2 * ny + st) / (2 * st)); cn_cells[ncell].a = s == st; ncell++;
            }
            order[no][0] = q.x; order[no][1] = q.y; no++; cur = q;
        }
        c->len = ncell - c->start;
        if (nch < cn_nch) { c->pos = cn_ch[nch].pos; c->non = cn_ch[nch].non; c->onch = cn_ch[nch].onch; for (uint8_t j = 0; j < 3; j++) c->on[j] = cn_ch[nch].on[j]; }
        nch++;
    }
    for (uint8_t k = nch; k < cn_nch; k++) cn_chord_off(&cn_ch[k]);
    for (uint8_t k = 0; k < nch; k++) cn_ch[k] = nc[k];
    cn_nch = nch;
    memset(cn_cell, 0, 64);
    for (uint8_t k = 0; k < ncell; k++) { uint8_t i = cn_cells[k].y * 8 + cn_cells[k].x, v = cn_cells[k].a ? 2 : 1; if (v > cn_cell[i]) cn_cell[i] = v; }
    int32_t area = 0, per = 0; uint8_t n = no;
    for (uint8_t k = 0; k < n; k++) {
        int32_t px = order[k][0], py = order[k][1], qx = order[(k + 1) % n][0], qy = order[(k + 1) % n][1];
        area += px * qy - qx * py; per += isqrt32((uint32_t)(10000L * ((qx - px) * (qx - px) + (qy - py) * (qy - py))));
    }
    if (n > 2) { if (area < 0) area = -area; } else area = 0;
    if (n < 2) per = 0; else if (n == 2) per /= 2;
    int32_t empty = 64; for (uint8_t k = 0; k < 64; k++) if (cn_cell[k]) empty--;
    int32_t a = area < 80 ? area : 80, pp = per < 3000 ? per : 3000;
    uint8_t cutoff = (uint8_t)clampi((127L * (225 * a + 4 * pp) + 15000) / 30000, 0, 127);
    uint8_t send = n ? (uint8_t)clampi((127 * empty + 32) / 64, 0, 127) : 0;
    cn_vmax = n ? (uint8_t)clampi(40 + (87 * n + 10) / 20, 1, 127) : 127;
    uint8_t ch = ch_of(cn_page);
    if (n) { cc(ch, 74, cutoff); cc(ch, 91, send); }
}
static void cn_press(uint8_t n) {
    uint8_t x = n & 7, y = n >> 3; int8_t k = -1;
    for (uint8_t j = 0; j < cn_na; j++) if (cn_a[j].x == x && cn_a[j].y == y) k = j;
    if (k >= 0) { for (uint8_t j = k + 1; j < cn_na; j++) cn_a[j - 1] = cn_a[j]; cn_na--; }
    else if (cn_na < 20) { cn_a[cn_na].x = x; cn_a[cn_na].y = y; cn_na++; }
    else return;
    cn_rebuild();
}
static void cn_clear(void) { cn_chords_off(); cn_na = 0; cn_nch = 0; memset(cn_cell, 0, 64); STXT("CL"); }
static void cn_arrow_do(int8_t d, bool big) {
    if (big) { cn_maxd = (uint8_t)clampi(cn_maxd + d, 1, 11); cn_rebuild(); SNUM(cn_maxd); }
    else { tempo_by(ch_of(cn_page), d); SNUM(bpm); }
}
static void cn_step(void) {
    if ((int8_t)cur_page != cn_page) return;
    uint8_t ch = ch_of(cur_page); uint32_t per = per16();
    for (uint8_t k = 0; k < cn_nch; k++) {
        cnc_t *c = &cn_ch[k];
        uint16_t period = c->len > 4 ? c->len : 4, idx = c->pos++ % period;
        c->last = idx < c->len ? (int16_t)idx : -1;
        if (c->last < 0) continue;
        cell_t *p = &cn_cells[c->start + idx]; int16_t deg = p->x + 3 * p->y;
        if (p->a) {                                          /* anchor: a sustained chord, held until the next anchor of this chain */
            cn_chord_off(c);
            for (uint8_t s = 0; s < 3; s++) { int16_t m = degree_pitch(deg + 2 * s, 36 + root + transpose); if (m >= 0 && m <= 127) { note_on(ch, m, cn_vmax); c->on[c->non++] = (uint8_t)m; c->onch = ch; } }
        } else fire(ch, degree_pitch(deg, 48 + root + transpose), per / 2, (uint8_t)((cn_vmax * 7 + 5) / 10));   /* between anchors: short notes */
    }
}

static void rep_task(void) {
    if (rep_key < 0) return;
    uint16_t need = rep_on ? (rep_kind == 0 ? KNOB_REPEAT_MS : SLOW_REPEAT_MS) : KNOB_HOLD_MS;
    if (timer_elapsed32(rep_t) < need) return;
    rep_t = now(); rep_on = true;
    uint32_t k = held_key[rep_key];
    if (rep_kind == 0) knob(held_ch[rep_key], KNUM(k), rep_dir);
    else if (rep_kind == 1) tempo_by(held_ch[rep_key], rep_dir);
    else if (rep_kind == 3) sr_arrow(rep_dir, rep_big);
    else if (rep_kind == 4) eu_arrow_do(rep_dir, rep_big);
    else if (rep_kind == 5) gs_param(KNUM(k));
    else if (rep_kind == 6) wk_param(KNUM(k));
    /*@ARCH ec #18@*/
    else if (rep_kind == 8) cq_key(KNUM(k), -1);
    else if (rep_kind == 9) pd_param(KNUM(k));
    else if (rep_kind == 10) cn_arrow_do(rep_dir, rep_big);
    else if (param_key >= 0) param(rep_dir, rep_big);
}
static void pb_task(void) {
    if (pb_val == pb_tgt || timer_elapsed32(pb_t) < PB_MS) return;
    pb_t = now();
    int16_t d = pb_tgt - pb_val;
    if (d > PB_STEP) pb_val += PB_STEP; else if (d < -PB_STEP) pb_val -= PB_STEP; else pb_val = pb_tgt;
    bend(pb_ch, pb_val);
}
static void pb_set_target(void) { pb_tgt = (pb_up && !pb_dn) ? 8191 : (pb_dn && !pb_up) ? -8192 : 0; }

static void kill_all(void) {
    for (uint8_t p = 0; p < 100; p++) { key_notes_off(p); fx_held[p] = false; fx_roll[p] = false; }
    arp_count = 0; arp_stop(); stop_clock(); /*@ARCH-INLINE ec: necq = 0; */ pd_nrip = 0;
    m_lt.locked = false; m_lt.held = false;
    nfxq = 0;
    for (uint8_t k = 0; k < NUM_FX; k++) fx_on[k] = false;
    /*@ARCH mac #17@*/
    for (uint8_t ch = 0; ch < 16; ch++) { cc(ch, 123, 0); cc(ch, 64, 0); }
    cc(fx_ch, 11, 127); cc(fx_ch, 10, 64); bend(fx_ch, 0);
    fx_cc11 = 127; fx_pbv = 0; pb_val = pb_tgt = 0;
    show_text("--", false, 0, false, false);
}

/* ---------------- Key press / release ---------------- */
static bool is_arrow(uint8_t idx, int8_t *dir, bool *big) {   /* kb_codes 0-3 are RIGHT, UP, LEFT, DOWN */
    if (idx == 1) { *dir = 1;  *big = false; return true; }
    if (idx == 3) { *dir = -1; *big = false; return true; }
    if (idx == 0) { *dir = 1;  *big = true;  return true; }
    if (idx == 2) { *dir = -1; *big = true;  return true; }
    return false;
}

static void eu_arrow_do(int8_t d, bool big) {                /* v13: arrows on the Euclidean page */
    if (!big) { eu_lane = (uint8_t)clampi(eu_lane + d, 0, 7); char s[2] = {'L', (char)('1' + eu_lane)}; show_text(s, false, 0, false, false); }
    else eu_param(eu_lane, d);
}
static void eu_param(uint8_t l, int8_t d) {                  /* change the selected euclidean setting of lane l */
    eulane_t *L = &eu[l];
    switch (eu_sel) {
        case 0: L->len = (uint8_t)clampi(L->len + d, 1, 8); if (L->hits > L->len) L->hits = L->len; L->shift %= L->len; show_num(L->len, false, false, false); break;
        case 1: L->hits = (uint8_t)clampi(L->hits + d, 0, L->len); show_num(L->hits, false, false, false); break;
        case 2: L->shift = (uint8_t)((L->shift + d + L->len) % L->len); show_num(L->shift, false, false, false); break;
        case 3: L->vari = (uint8_t)clampi(L->vari + d, 0, 10); show_num(L->vari * 10, false, false, false); break;
    }
}
static int8_t fx_held_el(void) {                              /* the held note (or track step) the effects key acts on, -1 = everything */
    for (uint8_t k = 0; k < 100; k++) if (key_down[k] && held_el[k] != 255) return (int8_t)held_el[k];
    return -1;
}
static void engine_press(uint8_t p) {
    if (key_down[p]) return;
    key_down[p] = true;
    if (fx_key >= 0) fx_used = true;
    held_el[p] = 255;
    int8_t def;
    uint32_t k = resolve(p, &def);
    uint8_t t = KTYPE(k), n = KNUM(k), ch = ch_of(def);
    int16_t ns[5]; uint8_t cnt;
    held_key[p] = k; held_ch[p] = ch; held_flags[p] = 0;
    switch (t) {
        case T_N: case T_T: case T_S: case T_CH: case T_MK:
            cnt = key_pitches(k, ns); play_notes(p, ch, ns, cnt, t, false, 28 + cur_page);
            /*@ARCH ec #16@*/
            break;
        case T_CK:
            if ((int8_t)cur_page == prog_page) prog_chord(n);
            harm_deg = n >> 2; harm_type = n & 3; harm_keys++;
            cnt = key_pitches(k, ns); play_notes(p, ch, ns, cnt, t, false, 28 + cur_page); break;
        case T_ZN: {
            uint8_t z = zone_of(KZONE(k)), zc = zone_ch(z);
            bool drum = z == DRUM_ZONE;
            held_ch[p] = zc;
            cnt = key_pitches(k, ns);
            if (st_down && (drum || z <= 1)) { ms_target = z; show_text(drum ? "DR" : z == 0 ? "UP" : "LO", false, 0, false, false); held_key[p] = K(T_NONE, 0, 0); break; }
            if (on_sr_page()) {
                if (drum && sr_kb == 2 && p / 10 >= 6 && p % 10 < 4) sr_lane = (p / 10 - 6) * 4 + p % 10;
                if (!drum) sr_note(p, ns, cnt, zc);
                else if (rec_mode && playing && sr_dph >= 0) sr_dseq[sr_lane] |= 1UL << sr_dph;   /* drums record only into the drum steps */
            }
            if (drum) {
                int16_t lane = n - SEQ_NOTE;
                if (def == MS_PAGE && lane >= 0 && lane < 16) { m_lane = lane; if (rec_mode && ms_run && playing) mseq[lane] |= 1 << nearest_step(); }
                play_notes(p, zc, ns, cnt, T_N, true, z); break;
            }
            if (z <= 1) {
                last_note[z] = ns[0];
                if (ms_hold_step >= 0 && ms_hold_z == z) {
                    mstep_t *s = &mel[z][ms_hold_step]; ms_hold_added = true;
                    for (uint8_t j = 0; j < cnt; j++) {
                        int8_t f = -1;
                        for (uint8_t q = 0; q < s->cnt; q++) if (s->n[q] == ns[j]) f = q;
                        if (f >= 0) { for (uint8_t q = f; q + 1 < s->cnt; q++) s->n[q] = s->n[q + 1]; s->cnt--; }
                        else if (s->cnt < 4) s->n[s->cnt++] = ns[j];
                    }
                } else if (rec_mode && ms_run && playing) {
                    uint8_t sidx = nearest_step(); mstep_t *s = &mel[z][sidx];
                    for (uint8_t j = 0; j < cnt; j++) { bool has = false; for (uint8_t q = 0; q < s->cnt; q++) if (s->n[q] == ns[j]) has = true; if (!has && s->cnt < 4) s->n[s->cnt++] = ns[j]; }
                    s->len = 1; rec_z[p] = z; rec_s[p] = sidx; rec_t[p] = now();
                }
            }
            if (arp_active() && arp_take_latched(p)) { held_key[p] = K(T_NONE, 0, 0); break; }
            play_notes(p, zc, ns, cnt, T_ZN, false, z);
            break;
        }
        case T_A:
            if (arp_active() && arp_take_latched(p)) { held_key[p] = K(T_NONE, 0, 0); break; }
            cnt = key_pitches(k, ns); play_notes(p, ch, ns, cnt, T_A, false, 28 + cur_page); break;
        case T_MT: {
            int32_t total = (int32_t)(tuning_base[tuning] + root + transpose) * 400 + pgm_read_word(&tuning_q[tuning][n]);
            int16_t nn = (int16_t)((total + 200) / 400);
            if (key_latched[p]) { key_notes_off(p); break; }
            key_notes_off(p); mpe_on(p, nn, (int16_t)((total - (int32_t)nn * 400) / 4), 127); break;
        }
        case T_TUD: case T_TUU: tuning = (tuning + (t == T_TUU ? 1 : NUM_TUNINGS - 1)) % NUM_TUNINGS; show_text(tuning_code[tuning], false, 0, false, false); break;
        case T_LT: mod_press(&m_lt); break;
        case T_SL:
            if (timer_elapsed32(m_lt.last) < DOUBLE_TAP_MS) { m_lt.locked = !m_lt.locked; m_lt.last = now() - 10000; if (!m_lt.locked) release_latched(); }
            else { m_lt.last = now(); sus_key = p; cc(ch, 64, 127); }
            break;
        case T_AP:
            if (timer_elapsed32(ap_last) < DOUBLE_TAP_MS) {
                arp_on_flag = !arp_on_flag; ap_last = now() - 10000;
                if (arp_on_flag && arp_mode == 7) arp_mode = 0;
                if (!arp_on_flag) { arp_count = 0; arp_stop(); }
            } else ap_last = now();
            ap_down = p;
            param_key = p; param_type = PT_ARP; param_ch = ch; param_n = 0; param_top = false; param_used = false; param_zone = 0; param_side = -1;   /* hold ARP + arrows = pattern */
            param(0, false); break;
        case T_PGU: set_slot(slots[cur_layer] + 1); break;
        case T_PGD: set_slot((int8_t)slots[cur_layer] - 1); break;
        case T_CS: { cs_down = true; char t2[2] = {'P', (char)('1' + slots[cur_layer])}; show_text(t2, false, 0, false, true); break; }   /* Shift: page label on the pads (test) */
        case T_PBU: pb_up = true; pb_ch = ch; pb_set_target(); break;
        case T_PBD: pb_dn = true; pb_ch = ch; pb_set_target(); break;
        case T_SCU: scale = (scale + 1) % NUM_SCALES; show_text(scale_code[scale], false, 0, false, false); break;
        case T_SCD: scale = (scale + NUM_SCALES - 1) % NUM_SCALES; show_text(scale_code[scale], false, 0, false, false); break;
        case T_RTU: root = (root + 1) % 12; show_text(note_text[root], false, 0, false, false); break;
        case T_RTD: root = (root + 11) % 12; show_text(note_text[root], false, 0, false, false); break;
        case T_QZ: quant = !quant; break;
        case T_CC: cc(ch, n, 127); break;
        case T_CT: cc_toggle[n] = !cc_toggle[n]; cc(ch, n, cc_toggle[n] ? 127 : 0); break;
        case T_KU: case T_KD: rep_key = p; rep_kind = 0; rep_dir = t == T_KU ? 1 : -1; rep_on = false; rep_t = now(); knob(ch, n, rep_dir); break;
        case T_FD: fader_val[n] = row_value(pad_r(p)); cc(ch, n, fader_val[n]); break;
        case T_PC: emit(EV_PC, ch, n, 0); break;
        case T_KB: {
            int8_t dir; bool big;
            if (param_key >= 0 && is_arrow(n, &dir, &big)) {
                held_flags[p] |= 4;
                rep_key = p; rep_kind = 2; rep_dir = dir; rep_big = big; rep_on = false; rep_t = now();
                param(dir, big);
                break;
            }
            if (ms_hold_step >= 0 && is_arrow(n, &dir, &big)) {
                held_flags[p] |= 4;
                if (big) { mstep_t *s = &mel[ms_hold_z][ms_hold_step]; s->len = clampi(s->len + dir, 1, 16); ms_hold_added = true; show_num(s->len, false, false, false); }
                break;
            }
            if ((int8_t)cur_page == cn_page && is_arrow(n, &dir, &big)) {   /* constellation: up / down = BPM, left / right = max distance */
                held_flags[p] |= 4; cn_arrow_do(dir, big);
                rep_key = p; rep_kind = 10; rep_dir = dir; rep_big = big; rep_on = false; rep_t = now(); break;
            }
            if ((int8_t)cur_page == eu_page && is_arrow(n, &dir, &big)) {   /* euclidean: up / down = pick the lane, left / right = change the setting (start point; hold Length / Hits / Variation for those) */
                held_flags[p] |= 4; eu_arrow_do(dir, big);
                rep_key = p; rep_kind = 4; rep_dir = dir; rep_big = big; rep_on = false; rep_t = now(); break;
            }
            if (on_sr_page() && is_arrow(n, &dir, &big)) {   /* step recorder: the arrows move the step cursor */
                held_flags[p] |= 4;
                rep_key = p; rep_kind = 3; rep_dir = dir; rep_big = big; rep_on = false; rep_t = now();
                sr_arrow(dir, big);
                break;
            }
            key_press16(pgm_read_word(&kb_codes[n]));
            break;
        }
        case T_SCALE: case T_ROOT: case T_OCT: case T_TEMPO: case T_CHAN: case T_VOL:
        case T_ZC: case T_ZO: case T_ZV: case T_ZT: case T_ZK: case T_BARS: case T_SK: case T_LN: case T_SRT: case T_SSW: case T_SDR: case T_RL: case T_GH:
            param_key = p; param_type = t; param_ch = ch; param_n = n; param_top = (p / 10) >= 6; param_used = false;
            param_zone = (t == T_ZC || t == T_ZO || t == T_ZV || t == T_ZT || t == T_ZK) ? zone_of(n) : 0;
            param_side = -1;
            if (t == T_OCT) for (uint8_t q = 0; q < 100; q++) if (key_down[q]) { uint8_t ht = KTYPE(held_key[q]); if (ht == T_CK) param_side = 0; else if (ht == T_MK) param_side = 1; }
            param(0, false);
            break;
        case T_CP: prog_key(n); break;
        case T_CQ: cq_cell(n); break;
        case T_CR: cq_key(n, p); break;
        case T_CE: cq_layer_key(n); break;
        case T_CY: cq_learn_key(n); break;
        /*@ARCH ec #15@*/
        case T_PD: pd_press(n); break;
        case T_PN: pd_key(n, p); break;
        case T_GT: gt_press(n); break;
        case T_EV: eu_view = n; break;
        case T_CN: cn_press(n); break;
        case T_CX: cn_clear(); break;
        case T_KP: { kb_page = n; char s[2] = {'B', (char)('1' + n)}; show_text(s, false, 0, false, false); break; }
        case T_KPU: case T_KPD: { kb_page = (kb_page + (t == T_KPU ? 1 : 3)) % 4; char s[2] = {'B', (char)('1' + kb_page)}; show_text(s, false, 0, false, false); break; }
        case T_PS:
            if (!playing) { cc(ch, CC_PLAY, 127); start_clock(); ms_run = cur_page == MS_PAGE; }
            else if (cur_page == MS_PAGE && !ms_run) { ms_run = true; held_flags[p] |= 8; }
            else { cc(ch, CC_STOP, 127); stop_clock(); held_flags[p] |= 16; }
            break;
        case T_PLAY: cc(ch, CC_PLAY, 127); start_clock(); ms_run = cur_page == MS_PAGE; break;
        case T_STOP: cc(ch, CC_STOP, 127); stop_clock(); break;
        case T_BREC: rec_mode = !rec_mode; break;
        case T_REC: cc(ch, CC_REC, 127); break;
        case T_TAP: {
            cc(ch, CC_TAP, 127);
            uint32_t tn = now();
            if (ntaps && tn - taps[ntaps - 1] > 2000) ntaps = 0;
            if (ntaps == 5) { for (uint8_t j = 0; j < 4; j++) taps[j] = taps[j + 1]; ntaps = 4; }
            taps[ntaps++] = tn;
            if (ntaps >= 2) { uint32_t v = (60000UL * (ntaps - 1) + (tn - taps[0]) / 2) / (tn - taps[0]); bpm = v < 40 ? 40 : v > 240 ? 240 : (uint8_t)v; }
            break;
        }
        case T_BPMU: case T_BPMD: rep_key = p; rep_kind = 1; rep_dir = t == T_BPMU ? 1 : -1; rep_on = false; rep_t = now(); tempo_by(ch, rep_dir); break;
        case T_KILL: kill_all(); break;
        case T_LU: cur_layer = (cur_layer + 1) % 4; page_check(); break;
        case T_LD: cur_layer = (cur_layer + 3) % 4; page_check(); break;
        case T_LG: if (n >= 1 && n <= 4) { cur_layer = n - 1; page_check(); } break;
        case T_LM: if (n >= 1 && n <= 4) { lm_back[p] = cur_layer; cur_layer = n - 1; page_check(); } break;
        case T_XU: case T_XD:
            if (t == T_XD) x_down = true; else x_up = true;
            if (x_down && x_up) transpose = 0;
            else if (t == T_XU && transpose + TRANSPOSE_STEP <= TRANSPOSE_LIMIT) transpose += TRANSPOSE_STEP;
            else if (t == T_XD && transpose - TRANSPOSE_STEP >= -TRANSPOSE_LIMIT) transpose -= TRANSPOSE_STEP;
            show_num(transpose, false, true, false);
            break;
        case T_XR: transpose = 0; break;
        case T_CL:
            if (track_mode >= 4) { uint8_t c2 = fader_base[track_mode] + pad_c(p); fader_val[c2] = row_value(pad_r(p)); cc(ch, c2, fader_val[c2]); }
            else key_note_add(p, ch, n, 127);
            break;
        case T_TR: key_note_add(p, 15, 64 + (track_mode <= 3 ? track_mode : 0) * 8 + n - 1, 127); break;
        case T_TM: track_mode = (track_mode == n) ? 0 : n; break;
        case T_XY:
            held_xy[p] = n;
            if (!xy_touch_on) { xy_update(true); xy_touch(true); } else xy_update(false);
            break;
        case T_XF: if (xy_touch_on) xy_touch(false); xy_hold = false; xy_eff = n; xy_sent_x = 255; xy_sent_y = 255; cc(ch, 19, n * 16 + 8); break;   /* new effect: touch off on the old channel, X / Y go out again on the new one */
        case T_XH: xy_hold = !xy_hold; if (!xy_hold && !xy_any_held()) xy_touch(false); break;
        case T_AR: arp_rate = n; break;
        case T_AM: arp_mode = n; if (n != 13) arp_pat = n == 7 ? arp_pat : n; if (n == 7) { arp_on_flag = false; arp_count = 0; arp_stop(); } break;
        case T_AO: arp_oct = n; break;
        case T_AG: arp_gt = n; break;
        case T_AS: arp_mask ^= (1 << n); break;
        case T_SQ: seq_lanes[n >> 3] ^= (uint16_t)1 << (seq_page * 8 + (n & 7)); break;
        case T_SP: seq_page = n; break;
        case T_EU: {                                          /* tap a step = lane length up to that step */
            eulane_t *L = &eu[n >> 3]; L->len = (n & 7) + 8 * eu_view + 1; if (L->hits > L->len) L->hits = L->len; L->shift %= L->len; show_num(L->len, false, false, false); break;
        }
        case T_EP: eu_held |= 1 << n; eu_sel = n; show_text(eu_param_code[n], false, 0, false, false); break;
        case T_CLK: clk_internal = !clk_internal; ext_active = false; ext_iv = 0; ext_ticks = 0; show_text(clk_internal ? "IN" : "AU", false, 0, false, false); break;
        case T_RW: { rwk_t *W = &rw.w[rw.sel]; W->x = (int8_t)(n & 7); W->y = (int8_t)(n >> 3); W->ntr = 0; W->on = true; break; }
        case T_WK:
            if (n < 4) { rw.sel = n; wk_show(rw.w[n].ch); }
            else if (n < 8) { rw.sel = n - 4; rwk_t *W = &rw.w[rw.sel]; W->on = !W->on; W->ntr = 0; STXT(W->on ? "ON" : "OF"); }
            else { rep_key = p; rep_kind = 6; rep_dir = (n & 1) ? 1 : -1; rep_on = false; rep_t = now(); wk_param(n); }
            break;
        /*@ARCH tm #14@*/
        /*@ARCH bb #13@*/
        /*@ARCH lfo #12@*/
        case T_GS: rep_key = p; rep_kind = 5; rep_dir = (n & 1) ? 1 : -1; rep_on = false; rep_t = now(); gs_param(n); break;
        case T_EK: rep_key = p; rep_kind = 4; rep_dir = (n & 1) ? 1 : -1; rep_on = false; rep_t = now(); eu_param(n >> 1, rep_dir); break;
        case T_FXK: fx_key = p; fx_used = false; fx_t = now(); fx_target = fx_held_el(); break;
        case T_FXO: if (fx_key >= 0) kill_all(); else fx_all_off(); break;
        case T_MS:
            if (del_down) { ms_clear_step(n); break; }
            if (paste_armed) { ms_paste(n); break; }
            if (mel_target()) { ms_hold_step = n; ms_hold_key = p; ms_hold_added = false; ms_hold_z = ms_target; break; }
            mseq[m_lane] ^= (uint16_t)1 << n; break;
        case T_ST: st_down = true; break;
        case T_DEL: {
            bool dbl = timer_elapsed32(del_last) < DOUBLE_TAP_MS; del_last = dbl ? now() - 10000 : now();   /* v13: double-tap = clear all (it was Controls Shift + Delete) */
            del_down = true;
            if (on_sr_page()) {                               /* step recorder: clear the cursor step (double-tap: the whole track) */
                srtrack_t *t = SR_T; sr_group = false;
                if (dbl) { memset(t->steps, 0, sizeof(t->steps)); sr_cursor(sr_target, 0); show_text("CL", false, 0, false, false); }
                else memset(&t->steps[t->cursor], 0, sizeof(srstep_t));
                break;
            }
            if (dbl) ms_clear_all();
            break;
        }
        case T_CPY: {
            bool dbl = timer_elapsed32(cpy_last) < DOUBLE_TAP_MS; cpy_last = dbl ? now() - 10000 : now();   /* v13: tap = copy, double-tap = paste (it was Controls Shift + Copy) */
            if (dbl) { if (clip_kind) { paste_armed = !paste_armed; show_text(paste_armed ? "PS" : "  ", false, 0, false, false); } else show_text("--", false, 0, false, false); }
            else ms_copy();
            break;
        }
        /*@ARCH mac #11@*/
        case T_FX: fx_press(n); break;
        case T_FP: if (fx_sel >= 0 && n % 6 < fx_nparams[fx_sel]) fx_val[fx_sel][n % 6] = n / 6; break;
        case T_SS: sr_press(n); held_el[p] = 24 + (sr_mode ? sr_target : n >> 3); break;
        case T_DS: {
            uint8_t k2 = n + 16 * (sr_half >> 1);
            if (k2 >= 16 * sr_bars) break;
            sr_dseq[sr_lane] ^= 1UL << k2;
            if ((sr_dseq[sr_lane] >> k2) & 1) fire(zone_ch(DRUM_ZONE), sr_drums[sr_lane], SR_PREVIEW_MS, 127);
            break;
        }
        case T_SM: SR_T->mute = !SR_T->mute; break;
        case T_SR: case T_TI:
            if (rec_mode && !playing) { srtrack_t *tr = SR_T; sr_new(&tr->steps[tr->cursor], t == T_SR ? 2 : 3); sr_group = false; sr_cursor(sr_target, (tr->cursor + 1) % tr->len); }
            break;
        case T_SV:                                            /* double-tap = edit modes on / off; single tap in a mode = next mode */
            if (sr_kb == 2) break;
            if (timer_elapsed32(sr_sv_last) < DOUBLE_TAP_MS) { sr_mode = sr_mode ? 0 : 1; sr_sv_last = now() - 10000; if (sr_mode) show_text("VE", false, 0, false, false); }
            else { if (sr_mode) { sr_mode = sr_mode % 3 + 1; show_text(sr_mode_code[sr_mode], false, 0, false, false); } sr_sv_last = now(); }
            break;
        case T_SG: sr_half = (sr_half + 1) % (2 * sr_bars); break;
        case T_MET: sr_metro = !sr_metro; break;
    }
}

static void engine_release(uint8_t p) {
    if (!key_down[p]) return;
    key_down[p] = false;
    uint32_t k = held_key[p];
    uint8_t t = KTYPE(k), n = KNUM(k), ch = held_ch[p], fl = held_flags[p];
    held_key[p] = K(T_NONE, 0, 0);
    if (rep_key == (int8_t)p) rep_key = -1;
    if (held_xy[p] >= 0) { held_xy[p] = -1; if (xy_any_held()) xy_update(false); else if (!xy_hold) xy_touch(false); }
    if (fl & 2) fx_note_off(p);
    else if (key_sounding(p)) {
        bool latchable = t == T_N || t == T_T || t == T_S || t == T_CH || t == T_CK || t == T_MK || t == T_A || t == T_ZN || t == T_MT;
        if (mod_active(&m_lt) && latchable) key_latched[p] = true; else key_notes_off(p);
    }
    if (rec_z[p] != 0xFF) { uint32_t l = (now() - rec_t[p] + per16() / 2) / per16(); mel[rec_z[p]][rec_s[p]].len = l < 1 ? 1 : l > 16 ? 16 : l; rec_z[p] = 0xFF; }
    if (t == T_CK && harm_keys) { harm_keys--; if (!harm_keys) harm_deg = -1; }
    if (fl & 32) sr_key_up();
    if (fl & 1) arp_release(p);
    if (param_key == (int8_t)p) {
        if (param_type == T_ZK && !param_used) zones[param_zone].chord = !zones[param_zone].chord;
        if (param_type == T_RL && !param_used) { roll.on = !roll.on; STXT(roll.on ? "ON" : "OF"); }
        if (param_type == T_SK && !param_used) { sr_set_kb((sr_kb + 1) % 3); char s[2] = {'K', (char)('1' + sr_kb)}; show_text(s, false, 0, false, false); }   /* a tap = next keyboard page */
        param_key = -1; text_hold = false; text_until = now() + TEXT_MS;
    }
    switch (t) {
        case T_LT: m_lt.held = false; if (!mod_active(&m_lt)) release_latched(); break;
        case T_SL: if (sus_key == (int8_t)p) { cc(ch, 64, 0); sus_key = -1; } break;
        case T_AP: if (ap_down == (int8_t)p) ap_down = -1; break;
        case T_CS: cs_down = false; if (text_on && text_hold) { text_hold = false; text_until = now() + 150; } break;
        case T_ST: st_down = false; break;
        case T_DEL: del_down = false; break;
        case T_EP: { eu_held &= (uint8_t)~(1 << n); uint8_t s = 2; for (int8_t k = 3; k >= 0; k--) if (eu_held & (1 << k)) s = (uint8_t)k; eu_sel = s; break; }
        case T_FXK:
            if (fx_key == (int8_t)p) {
                fx_key = -1;
                if (!fx_used && timer_elapsed32(fx_t) < FX_TAP_MS) { if (fx_target < 0) fx_all = !fx_all; else { fx_el[fx_target] = !fx_el[fx_target]; fx_last = fx_target; } }
            }
            break;
        /*@ARCH mac #10@*/
        case T_MS:
            if (ms_hold_key == (int8_t)p && ms_hold_step >= 0) {
                mstep_t *s = &mel[ms_hold_z][ms_hold_step];
                if (!ms_hold_added) { if (s->cnt) { s->cnt = 0; s->len = 1; } else { s->n[0] = last_note[ms_hold_z]; s->cnt = 1; } }
                ms_hold_step = -1; ms_hold_key = -1;
            }
            break;
        case T_PBU: pb_up = false; pb_set_target(); break;
        case T_PBD: pb_dn = false; pb_set_target(); break;
        case T_CC: cc(ch, n, 0); break;
        case T_PS: if (!(fl & 8)) cc(ch, (fl & 16) ? CC_STOP : CC_PLAY, 0); break;
        case T_PLAY: cc(ch, CC_PLAY, 0); break;
        case T_STOP: cc(ch, CC_STOP, 0); break;
        case T_REC: cc(ch, CC_REC, 0); break;
        case T_TAP: cc(ch, CC_TAP, 0); break;
        case T_KB: if (!(fl & 4)) key_release16(pgm_read_word(&kb_codes[n])); break;
        case T_XD: x_down = false; break;
        case T_XU: x_up = false; break;
        case T_LM: if (lm_back[p] != 255) { cur_layer = lm_back[p]; lm_back[p] = 255; page_check(); } break;
    }
}

void keyboard_post_init_user(void) {
    for (uint8_t p = 0; p < 100; p++) { held_xy[p] = -1; lm_back[p] = 255; held_el[p] = 255; held_key[p] = K(T_NONE, 0, 0); rec_z[p] = 0xFF; }
    for (uint8_t n = 0; n < 128; n++) knob_val[n] = 64;
    knob_val[1] = 0;
    for (uint8_t c = 0; c < 16; c++) vol[c] = 100;
    /* zone channels: layer 4 keyboards 1-16, drums 10, step recorder pianos 1-4; chord pianos 21 (in key) and 23 (major) */
    for (uint8_t z = 0; z < NUM_ZONES; z++) { zones[z].ch = (z >= 4 && z < DRUM_ZONE) ? z - 3 : z == DRUM_ZONE ? 10 : z > DRUM_ZONE ? z - 19 : 0; zones[z].fx = zone_fx[z]; }
    zones[21].chord = zones[23].chord = true; zones[21].ctype = NUM_CHORDS - 1;
    for (uint8_t l = 0; l < 8; l++) { eu[l].len = 8; eu[l].pos = -1; }
    for (uint8_t k = 0; k < 8; k++) for (uint8_t l = 0; l < 4; l++) { cqy[k].cc[l] = (uint8_t)(20 + 4 * k + l); for (uint8_t s = 0; s < 8; s++) cqy[k].v[l][s] = 64; }
    for (uint8_t i = 0; i < 4; i++) { sr_tr[i].len = 16; sr_tr[i].ph = -1; sr_tr[i].pos = -1; sr_tr[i].pp = 1; sr_tr[i].rate = 1; sr_tr[i].ph_tick = 0xFFFFFFFFUL; sr_tr[i].rec_tick = 0xFFFFFFFEUL; }
    for (uint8_t f = 0; f < NUM_FX; f++) for (uint8_t q = 0; q < 6; q++) fx_val[f][q] = fx_default[f][q];
    for (uint8_t z = 0; z < 2; z++) for (uint8_t s = 0; s < 16; s++) mel[z][s].len = 1;
    /*@ARCH mac #9@*/
    bpm = START_BPM;
    m_lt.last = ap_last = fx_last_t = sr_sv_last = now() - 10000;   /* no double-tap right after power-up */
    midi_register_realtime_callback(&midi_device, midi_realtime_cb);
    midi_register_cc_callback(&midi_device, midi_cc_cb);
}

void housekeeping_task_user(void) {
    rep_task();
    xy_task();
    pb_task();
    arp_task();
    roll_task();
    clock_task();
    fx_task();
    /*@ARCH mac #8@*/
    /*@ARCH ec #7@*/
    pd_tick();
    if (text_on && !text_hold && (int32_t)(now() - text_until) >= 0) text_on = false;
}

bool process_record_user(uint16_t keycode, keyrecord_t *record) {
    uint8_t row = record->event.key.row, col = record->event.key.col;
    if (row >= MATRIX_ROWS || col >= MATRIX_COLS) return true;
    uint8_t pos = key_pos[row][col];
    if (pos == 0) return true;
    if (record->event.pressed) engine_press(pos - 1); else engine_release(pos - 1);
    return false;
}

/* ---------------- Lights ---------------- */
#ifdef RGB_MATRIX_ENABLE
static bool is_on(uint32_t k) {
    uint8_t t = KTYPE(k), n = KNUM(k);
    switch (t) {
        case T_LT: case T_SL: return mod_active(&m_lt);
        case T_QZ: return quant;
        case T_PLAY: case T_PS: return playing;
        case T_XH: return xy_hold;
        case T_XF: return xy_eff == n;
        case T_TM: return n && track_mode == n;
        case T_SP: return seq_page == n;
        case T_KP: return kb_page == n;
        case T_CT: return cc_toggle[n];
        case T_ZK: return zones[zone_of(n)].chord;
        case T_RL: return roll.on;
        /*@ARCH ec #6@*/
        case T_PN: return n == 8 && pd_mode;
        case T_GT: return ((int8_t)cur_page == pd_page && n == 0 && pd_mode) || ((int8_t)cur_page == rw_page && n == 0 && rw.run);
        case T_EV: return eu_view == n;
        case T_CR: return (n == 12 && cq_run) || (n >= 19 && n <= 22 && ((cq_mute >> (n - 19)) & 1)) || (n == 23 && cq_rec);
        case T_CY: return cq_learn == n + 1;
        case T_AP: return arp_on_flag;
        case T_CS: return cs_down;
        case T_CPY: return paste_armed;
        case T_ST: return st_down;
        case T_DEL: return del_down;
        case T_EP: return (eu_held >> n) & 1;
        case T_CLK: return ext_active && !clk_internal;
        /*@ARCH lfo #5@*/
        case T_SM: return SR_T->mute;
        case T_MET: return sr_metro;
        case T_SV: return sr_mode > 0;
    }
    return false;
}
static void pal(uint8_t i, uint8_t *o) { o[0] = pgm_read_byte(&page_pal[cur_page][i][0]); o[1] = pgm_read_byte(&page_pal[cur_page][i][1]); o[2] = pgm_read_byte(&page_pal[cur_page][i][2]); }

static bool led_for(uint8_t p, uint8_t *rgb) {
    int8_t def;
    uint32_t k = resolve(p, &def);
    uint8_t t = KTYPE(k), n = KNUM(k);
    uint8_t col[3], c2[3];
    pal(0, col);
#define SET(r, g, b) do { rgb[0] = (r); rgb[1] = (g); rgb[2] = (b); return true; } while (0)
#define SETV(v) SET((v)[0], (v)[1], (v)[2])
#define SETD(v, d) SET((v)[0] / (d), (v)[1] / (d), (v)[2] / (d))
#define SETC()  SETV(col)
#define SETW()  SET(255, 255, 255)
#define SETDW() SET(DIM_WHITE, DIM_WHITE, DIM_WHITE)
#define SETOFF() SET(0, 0, 0)
#define SETOR() SET(255, 90, 0)
#define SETPAL(i) do { pal((i), c2); SETV(c2); } while (0)
#define SETPALD(i, d) do { pal((i), c2); SETD(c2, d); } while (0)
    if (!is_pad(p)) {
        if (t == T_NONE) SETOFF();
        if (t == T_BREC && rec_mode) { if (blink(BLINK_MS)) SET(255, 0, 0); SET(64, 0, 0); }
        if (t == T_FXK && !key_down[p] && fx_for(fx_last)) SET(160, 60, 255);   /* effects on for what you played last */
        if (t == T_WK) {                                   /* walker keys: select / on-off in the walker's color */
            uint8_t wk = n & 3, wc[3];
            if (n >= 8) { if (key_down[p]) SETOR(); pal(rw.sel, wc); SETD(wc, 3); }
            pal(wk, wc);
            if (n < 4) { if (rw.sel == wk) SETW(); SETD(wc, 6); }
            if (rw.w[wk].on) SETV(wc);
            SETD(wc, 14);
        }
        if (t == T_CP) {                                   /* chord progression step: filled = page color, playhead white, selected blinks, waiting chord blinks color 2 */
            if (playing && prog_cur == (int8_t)n && (int8_t)cur_page == prog_page) SETW();
            if (prog_pend[n] >= 0 && blink(BLINK_MS)) SETPAL(1);
            if (prog_sel == (int8_t)n && blink(BLINK_MS)) SETW();
            if (prog_slot[n] >= 0) SETC();
            SETOFF();
        }
        if (cs_down || (int32_t)(now() - nav_t) < 0) {      /* Shift navigation display: column 9 = layer, column 10 = page, filled from the bottom; dim dots = unused */
            uint8_t r = p / 10, x = p % 10, k2 = 9 - r;
            if (r >= 2 && x == 8) { if (k2 < cur_layer + 1) SET(255, 80, 0); if (k2 < 4) SET(21, 7, 0); SETOFF(); }
            if (r >= 2 && x == 9) { if (k2 < slots[cur_layer] + 1) SET(255, 205, 0); if (k2 < layer_pages[cur_layer]) SET(21, 17, 0); SETOFF(); }
            if (cs_down) {
                if (p == 8 || p == 9 || p == 18 || p == 19) { if (key_down[p]) SETW(); SET(255, 60, 0); }
                if (key_down[p]) SETW();
                SET(255, 120, 0);
            }
        }
        if (key_down[p] || is_on(k)) SETOR();
        if (page_varies(cur_page, p)) SET(CTRL_CYAN_R, CTRL_CYAN_G, CTRL_CYAN_B);   /* cyan = changes with the layer, page or Controls Shift */
        SET(CTRL_WHITE, CTRL_WHITE, CTRL_WHITE);
    }
    uint8_t x = pad_c(p), y = pad_r(p);
    if (text_on) {
        uint8_t y0 = text_top ? 3 : 0, yi = text_top ? 2 : 5;
        if (y >= y0 && y <= y0 + 4) {
            int8_t c = x < 3 ? 0 : (x >= 4 && x < 7) ? 1 : -1;
            if (c < 0) SETOFF();
            const char *f = strchr(FONT_CHARS, text_s[c]);
            uint16_t g = f ? pgm_read_word(&font_glyphs[f - FONT_CHARS]) : 0;
            uint8_t bit = 14 - ((y0 + 4 - y) * 3 + (x - c * 4));
            if (g & (1 << bit)) SETW(); else SETOFF();
        }
        if (y == yi && (text_ind || text_neg)) {
            if (x < text_ind) SETW();
            if (x == 7 && text_neg) SET(255, 0, 0);
            SETOFF();
        }
    }
    if (type_ctrl[t]) { if (key_down[p] || is_on(k)) SETOR(); SETOFF(); }
    if (key_down[p] || key_sounding(p)) SETW();
    for (uint8_t j = 0; j < arp_count; j++) if (arp_notes[j].key == p) SETW();
    uint8_t mode = pgm_read_byte(&page_led[cur_page]);
    if (mode == LED_OFF || t == T_NONE) SETOFF();
    if (mode == LED_SOLID) SETC();
    switch (t) {
        case T_N:
            if (mode == LED_PIANO) { if (is_black(n)) SETPAL(1); SETC(); }
            if (mode == LED_SCALE) goto scale_light;
            SETC();
        case T_T:
            if (mode == LED_PIANO) { if (is_black(n + transpose)) SETPAL(1); SETC(); }
            goto scale_light;
        case T_A:
            if (mode == LED_SCALE) goto scale_light;
            if (is_black(n + transpose)) SETPAL(1);
            SETC();
        case T_ZN: {
            uint8_t z = zone_of(KZONE(k)), s = zone_slot[KZONE(k)];
            if (z == DRUM_ZONE && on_sr_page() && sr_kb == 2) { if ((p / 10 - 6) * 4 + x == sr_lane) SETPAL(3); SETPAL(s); }
            if (z == DRUM_ZONE) { if (cur_page == MS_PAGE && ms_target == DRUM_ZONE && n - SEQ_NOTE == m_lane) SETPAL(3); SETPAL(s); }
            if (is_black(n)) SETPALD(s, 4);
            SETPAL(s);
        }
        case T_S: if (n % scale_len[scale] == 0) SETC(); SETPAL(1);
        case T_CH: if (n % 8 == 0 || n % 8 == 7) SETC(); SETPAL(1);
        case T_CK: {
            uint8_t deg = n >> 2;
            if (harm_deg >= 0 && (harm_next[harm_deg % 7] >> (deg % 7) & 1) && blink(200)) SETPAL(2);
            if (deg % 7 == 0) SETC();
            SETD(col, 3);
        }
        case T_MK: {
            int16_t nn = degree_pitch(n, harm_base());
            uint8_t pc = pcof(nn);
            if (harm_deg < 0) { if (pcof(nn - root) == 0) SETC(); SETPALD(1, 2); }
            uint8_t cn[5], cnt = harm_cnt[harm_type];
            for (uint8_t j = 0; j < cnt; j++) cn[j] = pcof(degree_pitch(harm_deg + harm_steps[harm_type][j], harm_base()));
            if (pc == cn[0]) SETC();
            for (uint8_t j = 1; j < cnt; j++) if (pc == cn[j]) SETPAL(1);
            for (uint8_t j = 0; j < cnt; j++) if (pcof(pc - cn[j]) == 1) SETPALD(3, 2);
            SETPAL(2);
        }
        case T_MT: {
            uint16_t q = pgm_read_word(&tuning_q[tuning][n]);
            if (tuning == 4) {
                uint8_t h = 1 + n;
                if ((h & (h - 1)) == 0) SETC();
                while (h % 2 == 0) h /= 2;
                if (h == 3) SETPAL(3);
            } else {
                uint16_t rel = tuning == 5 ? q % 7608 : q % 4800, top = tuning == 5 ? 7604 : 4796;
                if (rel < 4 || rel > top) SETC();
                if (rel > 2768 && rel < 2848) SETPAL(3);
            }
            uint16_t dv = q % 400;
            if (dv <= 24 || dv >= 376) SETPAL(1);
            SETPAL(2);
        }
        case T_XY:
            if (xy_touch_on && x == (xy_tgt_x * 7 + 63) / 127 && y == (xy_tgt_y * 7 + 63) / 127) SETW();
            SETC();
        case T_FD: if (row_value(y) <= fader_val[n]) SETC(); SETOFF();
        case T_CL:
            if (track_mode >= 4) { if (row_value(y) <= fader_val[fader_base[track_mode] + x]) SETC(); SETOFF(); }
            SETD(col, 5);
        case T_SS: {                                          /* step recorder: track steps, or 4 velocity levels in velocity mode */
            uint8_t k2 = sr_half * 8 + (n & 7);
            if (sr_mode) {                                    /* edit modes: velocity (track color, accent gold), probability violet, ratchet lime */
                srtrack_t *T = SR_T; srstep_t *s = &T->steps[k2]; uint8_t lv = 4 - (n >> 3);
                uint8_t mc[3]; if (sr_mode == 1) pal(sr_target, mc); else if (sr_mode == 2) { mc[0] = 160; mc[1] = 60; mc[2] = 255; } else { mc[0] = 150; mc[1] = 255; mc[2] = 0; }
                if (k2 >= T->len) SETOFF();
                if (lv == 1 && k2 == T->cursor && blink(BLINK_MS)) SETW();
                if (s->kind != 1 || !s->cnt) SETOFF();
                uint8_t val = sr_mode == 1 ? s->vel : sr_mode == 2 ? s->prob : s->rat;
                if (lv > val) SETD(mc, 10);
                if (playing && (int8_t)k2 == T->ph && !T->mute) SETW();
                if (sr_mode == 1 && lv == 4) SET(255, 200, 40);
                SETV(mc);
            }
            uint8_t tn = n >> 3; srtrack_t *T = &sr_tr[tn]; srstep_t *s = &T->steps[k2];
            if (k2 >= T->len) SETOFF();
            if (tn == sr_target && k2 == T->cursor && blink(BLINK_MS)) SETW();
            if (playing && (int8_t)k2 == T->ph && !T->mute) SETW();
            uint8_t d = s->kind == 0 ? 12 : s->kind == 1 ? (s->vel == 1 ? 4 : s->vel == 2 ? 2 : 1) : s->kind == 3 ? 3 : 0;
            if (T->mute) d = d ? d * 4 : 0;
            if (!d) { uint8_t w = T->mute ? DIM_WHITE / 8 : DIM_WHITE / 2; SET(w, w, w); }   /* rest */
            SETPALD(tn, d);
        }
        case T_DS: {
            uint8_t k2 = n + 16 * (sr_half >> 1);
            if (k2 >= 16 * sr_bars) SETOFF();
            bool on = (sr_dseq[sr_lane] >> k2) & 1, ph = playing && (int8_t)k2 == sr_dph;
            if (on && ph) SETW();
            if (on) SETPAL(3);
            if (ph) SETDW();
            SETD(col, (n >> 2) & 1 ? 12 : 6);
        }
        case T_SQ: {
            uint8_t l = n >> 3, s = n & 7;
            bool on = (seq_lanes[l] >> (seq_page * 8 + s)) & 1, ph = last_step >= 0 && last_step == seq_page * 8 + s;
            if (on && ph) SETW();
            if (on) SETC();
            if (ph) SETPAL(2);
            SETOFF();
        }
        case T_EU: {
            uint8_t l = n >> 3, s = (n & 7) + 8 * eu_view; eulane_t *L = &eu[l];
            uint8_t lc[3]; pal(l % 2 ? 1 : 0, lc);
            if (s >= L->len) SETOFF();
            if (playing && L->pos == (int8_t)s) SETW();
            if (s == L->shift) { uint8_t sc[3]; pal(3, sc); if (eu_hit(l, s)) SETV(sc); SETD(sc, 6); }   /* the lane's start point has its own colour */
            if (eu_hit(l, s)) SETV(lc);
            SETD(lc, l == eu_lane ? 8 : 16);
        }
        case T_CQ: {
            cqy_t *Y = &cqy[cq_layer]; uint8_t l = n >> 3, sx = n & 7, lc[3], b[3]; pal(l, lc);
            if (sx >= cq_len[l]) SETOFF();
            if (cq_run && cq_pos > 0 && (cq_pos - 1) % cq_len[l] == sx) SETW();
            if (cq_ent_l == l) {                              /* value entry: the lane's 8 keys flash, brighter to the right */
                if (blink(BLINK_MS)) { uint16_t f = 51 + (205UL * (sx + 1)) / 8; for (uint8_t q = 0; q < 3; q++) b[q] = (uint8_t)(lc[q] * f / 256); SETV(b); }
                SETD(lc, 14);
            }
            if (cq_rec && cq_sel_l == l && cq_sel_s == sx && blink(BLINK_MS)) SETW();
            if ((Y->on[l] >> sx) & 1) { uint16_t f = 77 + (179UL * Y->v[l][sx]) / 127; for (uint8_t q = 0; q < 3; q++) b[q] = (uint8_t)(lc[q] * f / 256); }
            else for (uint8_t q = 0; q < 3; q++) b[q] = lc[q] / 14;
            if ((cq_mute >> l) & 1) SETD(b, 4);
            SETV(b);
        }
        case T_CE: {                                          /* effect layers: bright = on, dim = off, white blink = selected */
            uint8_t col3[3] = {cq_lcol[n][0], cq_lcol[n][1], cq_lcol[n][2]};
            if (cq_layer == n && blink(BLINK_MS)) SETW();
            if ((cq_lon >> n) & 1) SETV(col3);
            SETD(col3, 12);
        }
        case T_CR: {
            uint8_t gc[3];
            if (n == 12) { if (cq_run) SET(0, 255, 40); SET(0, 42, 6); }
            if (n <= 11) { pal(n <= 3 ? 1 : n <= 5 ? 2 : n <= 7 ? 3 : n <= 9 ? 0 : 1, gc); SETD(gc, 3); }
            SETDW();
        }        case T_PD: {
            int16_t h = pd_h[n]; uint8_t x = n & 7, y = n >> 3, c3[3];
            for (uint8_t q = 0; q < pd_nrip; q++) if (pd_rip[q].x == x && pd_rip[q].y == y && pd_rip[q].age < 4) SETW();
            if (h > 10) { pal(0, c3); uint16_t f = 31 + (225L * (h > 256 ? 256 : h)) / 256; for (uint8_t q = 0; q < 3; q++) c3[q] = (uint8_t)(c3[q] * f / 256); SETV(c3); }
            if (h < -10) { pal(1, c3); int16_t f = -h / 2; if (f < 13) f = 13; if (f > 128) f = 128; for (uint8_t q = 0; q < 3; q++) c3[q] = (uint8_t)(c3[q] * f / 256); SETV(c3); }
            pal(0, c3); SETD(c3, 30);
        }
        case T_CN: {
            uint8_t x = n & 7, y = n >> 3, v = cn_cell[n], c3[3];
            if (playing) for (uint8_t q = 0; q < cn_nch; q++) { cnc_t *cc_ = &cn_ch[q]; if (cc_->last >= 0 && cn_cells[cc_->start + cc_->last].x == x && cn_cells[cc_->start + cc_->last].y == y) SETW(); }
            if (v == 2) SETC();
            pal(1, c3); if (v == 1) SETD(c3, 6);
            SETD(c3, 40);
        }
        case T_RW: {
            uint8_t px = n & 7, py = n >> 3, wc[3];                /* each walker has its own palette color */
            for (uint8_t k = 0; k < 4; k++) if (rw.w[k].on && rw.w[k].x == px && rw.w[k].y == py) { pal(k, wc); SETV(wc); }
            for (uint8_t k = 0; k < 4; k++) {
                if (!rw.w[k].on) continue;
                for (uint8_t j = 0; j < rw.w[k].ntr; j++) if (rw.w[k].tx[j] == px && rw.w[k].ty[j] == py) { pal(k, wc); SETD(wc, 2 + 2 * j); }
            }
            SET(DIM_WHITE / 2, DIM_WHITE / 2, DIM_WHITE / 2);
        }
        /*@ARCH tm #4@*/
        /*@ARCH bb #3@*/
        /*@ARCH lfo #2@*/
        case T_MS: {
            bool ph = ms_run && last_step == (int8_t)n;
            if (ms_hold_step == (int8_t)n) SETW();
            if (mel_target()) {
                mstep_t *m = mel[ms_target];
                bool on = m[n].cnt > 0, tail = false;
                for (uint8_t j = 1; j < 16 && !tail; j++) { mstep_t *s = &m[(n + 16 - j) % 16]; if (s->cnt && s->len > j) tail = true; }
                uint8_t sl = zone_slot[ms_target];
                if (on && ph) SETW();
                if (on) SETPAL(sl);
                if (ph) SETDW();
                if (tail) SETPALD(sl, 4);
                SETOFF();
            }
            bool on = (mseq[m_lane] >> n) & 1;
            if (on && ph) SETW();
            if (on) SETPAL(3);
            if (ph) SETDW();
            SETOFF();
        }
        case T_AR: if (arp_rate == n) SETC(); SETD(col, 5);
        case T_AM: if (arp_mode == n) SETC(); SETD(col, 5);
        case T_AO: if (arp_oct == n) SETC(); SETD(col, 5);
        case T_AG: if (arp_gt == n) SETC(); SETD(col, 5);
        case T_AS: if (arp_mask & (1 << n)) SETC(); SETD(col, 5);
        case T_FX: if (fx_sel == n) { if (fx_on[n]) SET(255, 200, 40); SETW(); } if (fx_on[n]) SETC(); SETD(col, 5);   /* selected + on gold, selected white, on main color */
        case T_FP: {
            uint8_t pc = n % 6, pr = n / 6;
            if (fx_sel < 0 || pc >= fx_nparams[fx_sel]) SETOFF();
            if (pr <= fx_val[fx_sel][pc]) SETC();
            SETD(col, 8);
        }
        /*@ARCH mac #1@*/
        default: SETC();
    }
scale_light: {
        int16_t v = (t == T_N) ? n : n + transpose;
        if (pcof(v - root) == 0) SETC();
        if (!in_scale(v)) SETOFF();
        SETPAL(1);
    }
}

bool rgb_matrix_indicators_advanced_user(uint8_t led_min, uint8_t led_max) {
    uint16_t v = rgb_matrix_get_val();
    uint8_t rgb[3];
    for (uint8_t row = 0; row < MATRIX_ROWS; row++) {
        for (uint8_t col = 0; col < MATRIX_COLS; col++) {
            uint8_t pos = key_pos[row][col];
            if (pos == 0) continue;
            uint8_t led = g_led_config.matrix_co[row][col];
            if (led == NO_LED || led < led_min || led >= led_max) continue;
            if (!led_for(pos - 1, rgb)) continue;
            rgb_matrix_set_color(led, (uint16_t)rgb[0] * v / 255, (uint16_t)rgb[1] * v / 255, (uint16_t)rgb[2] * v / 255);
        }
    }
    return true;
}
#endif
