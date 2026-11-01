/* hosttest: runs keymap.c on the PC. Reads a script (ms press|release|clock key) and prints the MIDI it sends. */
#include "qmk_stub.h"
MidiDevice midi_device;
led_config_t g_led_config;
static uint32_t T = 0;
static void (*rt_cb)(MidiDevice *, uint8_t);
static void (*cc_cb)(MidiDevice *, uint8_t, uint8_t, uint8_t);
uint32_t timer_read32(void) { return T; }
void midi_send_noteon(MidiDevice *d, uint8_t ch, uint8_t n, uint8_t v) { printf("%u on %u %u %u\n", T, ch + 1, n, v); }
void midi_send_noteoff(MidiDevice *d, uint8_t ch, uint8_t n, uint8_t v) { printf("%u off %u %u 0\n", T, ch + 1, n); }
void midi_send_cc(MidiDevice *d, uint8_t ch, uint8_t n, uint8_t v) { printf("%u cc %u %u %u\n", T, ch + 1, n, v); }
void midi_send_pitchbend(MidiDevice *d, uint8_t ch, int16_t v) { printf("%u pb %u %d\n", T, ch + 1, v); }
void midi_send_programchange(MidiDevice *d, uint8_t ch, uint8_t n) { printf("%u pc %u %u\n", T, ch + 1, n); }
void register_code16(uint16_t k) { }
void unregister_code16(uint16_t k) { }
void midi_register_realtime_callback(MidiDevice *d, void (*cb)(MidiDevice *, uint8_t)) { rt_cb = cb; }
void midi_register_cc_callback(MidiDevice *d, void (*cb)(MidiDevice *, uint8_t, uint8_t, uint8_t)) { cc_cb = cb; }
uint16_t rgb_matrix_get_val(void) { return 255; }
void rgb_matrix_set_color(int led, uint8_t r, uint8_t g, uint8_t b) { }
#include "keymap.c"
int main(void) {
    char cmd[16]; unsigned at, arg;
    for (uint8_t r = 0; r < 10; r++) for (uint8_t c = 0; c < 10; c++) g_led_config.matrix_co[r][c] = r * 10 + c;
    keyboard_post_init_user();
    while (scanf("%u %15s %u", &at, cmd, &arg) == 3) {
        while (T < at) { T++; housekeeping_task_user(); if (T % 16 == 0) rgb_matrix_indicators_advanced_user(0, 100); }
        if (!strcmp(cmd, "end")) break;
        keyrecord_t rec; rec.event.key.row = arg / 10; rec.event.key.col = arg % 10;
        if (!strcmp(cmd, "press") || !strcmp(cmd, "release")) { rec.event.pressed = !strcmp(cmd, "press"); process_record_user(SAFE_RANGE, &rec); }
        else if (!strcmp(cmd, "clock") && rt_cb) rt_cb(&midi_device, (uint8_t)arg);
        else if (!strcmp(cmd, "ccin") && cc_cb) cc_cb(&midi_device, (arg >> 16) & 15, (arg >> 8) & 127, arg & 127);   /* arg = channel * 65536 + CC number * 256 + value */
    }
    return 0;
}
