#ifndef QMK_STUB_H
#define QMK_STUB_H
/* Stand-ins for the QMK functions keymap.c uses, so it runs on the PC (hosttest). */
#include <stdint.h>
#include <stdbool.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#define MATRIX_ROWS 10
#define MATRIX_COLS 10
#define PROGMEM
#define pgm_read_byte(p)  (*(const uint8_t *)(p))
#define pgm_read_word(p)  (*(const uint16_t *)(p))
#define pgm_read_dword(p) (*(const uint32_t *)(p))
#define LAYOUT_tkl_ansi(...) { __VA_ARGS__ }
#define SAFE_RANGE 0x7E00
#define NO_LED 255
#define LCTL(k) ((k) | 0x100)
#define LSFT(k) ((k) | 0x200)
#define LALT(k) ((k) | 0x400)
#define LGUI(k) ((k) | 0x800)
#include "kc_stub.h"
typedef struct { struct { struct { uint8_t row, col; } key; bool pressed; } event; } keyrecord_t;
typedef struct MidiDevice { int x; } MidiDevice;
extern MidiDevice midi_device;
uint32_t timer_read32(void);
static inline uint32_t timer_elapsed32(uint32_t t) { return timer_read32() - t; }
void midi_send_noteon(MidiDevice *d, uint8_t ch, uint8_t n, uint8_t v);
void midi_send_noteoff(MidiDevice *d, uint8_t ch, uint8_t n, uint8_t v);
void midi_send_cc(MidiDevice *d, uint8_t ch, uint8_t n, uint8_t v);
void midi_send_pitchbend(MidiDevice *d, uint8_t ch, int16_t v);
void midi_send_programchange(MidiDevice *d, uint8_t ch, uint8_t n);
void register_code16(uint16_t k);
void unregister_code16(uint16_t k);
void midi_register_realtime_callback(MidiDevice *d, void (*cb)(MidiDevice *, uint8_t));
void midi_register_cc_callback(MidiDevice *d, void (*cb)(MidiDevice *, uint8_t, uint8_t, uint8_t));
#define RGB_MATRIX_ENABLE
typedef struct { uint8_t matrix_co[MATRIX_ROWS][MATRIX_COLS]; } led_config_t;
extern led_config_t g_led_config;
uint16_t rgb_matrix_get_val(void);
void rgb_matrix_set_color(int led, uint8_t r, uint8_t g, uint8_t b);
#endif
