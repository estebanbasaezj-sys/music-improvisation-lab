#!/usr/bin/env python3
"""Renderiza la biblioteca de muestras de la app a partir de bancos de sonido libres.

Fuentes:
  - MuseScore_General_Full.sf2 (MIT; paquete Debian musescore-general-soundfont-lossless)
  - Salamander Grand Piano V3 (CC-BY 3.0, Alexander Holm) vía github.com/Tonejs/audio

Cada instrumento se exporta como un único "sprite" mp3: una nota por ranura de duración fija.
El manifiesto (samples/manifest.json) indica qué nota MIDI hay en cada ranura.
Requiere: fluidsynth, ffmpeg.
Uso: python3 tools/render_samples.py <sf2> <carpeta_salamander> <salida>
"""
import json, os, struct, subprocess, sys, tempfile

SF2, SALAMANDER, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
TPS = 960  # ticks por segundo (480 tpq a 120 bpm)

def vlq(n):
    b = [n & 0x7F]
    n >>= 7
    while n:
        b.insert(0, (n & 0x7F) | 0x80)
        n >>= 7
    return bytes(b)

def midi_file(events):
    """events: lista de (tiempo_seg, bytes_mensaje)."""
    events = sorted(events, key=lambda e: e[0])
    trk = b'\x00\xFF\x51\x03\x07\xA1\x20'  # tempo 120
    last = 0
    for t, msg in events:
        tick = int(round(t * TPS))
        trk += vlq(tick - last) + msg
        last = tick
    trk += b'\x00\xFF\x2F\x00'
    return b'MThd' + struct.pack('>IHHH', 6, 0, 1, 480) + b'MTrk' + struct.pack('>I', len(trk)) + trk

def render(name, slots, slot_sec, program, bank=0, channel=0, stereo=False, bitrate='112k', gain=0.9):
    ev = []
    ch = channel
    ev.append((0, bytes([0xB0 | ch, 0, bank & 0x7F])))
    ev.append((0, bytes([0xB0 | ch, 32, 0])))
    ev.append((0, bytes([0xC0 | ch, program])))
    ev.append((0, bytes([0xB0 | ch, 91, 0])))  # sin reverb del banco: la app pone la suya
    ev.append((0, bytes([0xB0 | ch, 93, 0])))
    for i, s in enumerate(slots):
        t0 = 0.5 + i * slot_sec
        ev.append((t0, bytes([0x90 | ch, s['midi'], s['vel']])))
        ev.append((t0 + s['hold'], bytes([0x80 | ch, s['midi'], 0])))
    total = 0.5 + len(slots) * slot_sec + 1
    with tempfile.TemporaryDirectory() as d:
        mid = os.path.join(d, 'in.mid'); wav = os.path.join(d, 'out.wav')
        open(mid, 'wb').write(midi_file(ev))
        subprocess.run(['fluidsynth', '-ni', '-R', '0', '-C', '0', '-g', str(gain), '-r', '44100', '-F', wav, SF2, mid], check=True, capture_output=True)
        # quitar los 0.5 s iniciales para que la ranura i empiece en i*slot_sec
        mp3 = os.path.join(OUT, f'{name}.mp3')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '0.5', '-t', str(total - 0.5), '-i', wav,
                        '-ac', '2' if stereo else '1', '-b:a', bitrate, mp3], check=True)
    return {'file': f'{name}.mp3', 'slotSec': slot_sec, 'slots': [{k: v for k, v in s.items() if k in ('midi', 'vel', 'id')} for s in slots]}

def mel(lo, hi, step, vel, hold):
    return [{'midi': m, 'vel': vel, 'hold': hold} for m in range(lo, hi + 1, step)]

manifest = {'license': {
    'MuseScore General': 'MIT — S. Christian Collins; basado en Fluid (R3) GM (MIT, Frank Wen) y muestras PD/CC0',
    'Salamander Grand Piano V3': 'CC-BY 3.0 — Alexander Holm',
}, 'instruments': {}}

I = manifest['instruments']
I['tenor'] = render('tenor', mel(42, 78, 2, 92, 2.4), 3.0, 66)
I['alto'] = render('alto', mel(48, 84, 2, 92, 2.4), 3.0, 65)
I['bass'] = render('bass', mel(28, 62, 2, 100, 1.6), 2.2, 32, gain=1.1)
I['guitar'] = render('guitar', mel(40, 86, 3, 95, 2.6), 3.2, 26)
I['rhodes'] = render('rhodes', mel(36, 96, 3, 85, 2.6), 3.2, 4, stereo=True, bitrate='128k')

# Batería: kit de jazz (programa 32) y de escobillas (40) en el canal 10
def drum(kit_prog, items, name):
    slots = [{'midi': n, 'vel': v, 'hold': 0.4, 'id': ident} for ident, n, v in items]
    return render(name, slots, 2.4, kit_prog, channel=9, stereo=True, bitrate='128k', gain=1.0)

I['drums_jazz'] = drum(32, [
    ('kick_soft', 36, 55), ('kick', 36, 90), ('snare_ghost', 38, 35), ('snare', 38, 85), ('stick', 37, 80),
    ('hh_pedal', 44, 80), ('hh_closed', 42, 60), ('hh_open', 46, 70),
    ('ride_soft', 51, 55), ('ride', 51, 80), ('ride_hard', 51, 110), ('ride_bell', 53, 80), ('crash', 49, 80),
], 'drums_jazz')
I['drums_brush'] = drum(40, [
    ('kick_soft', 36, 50), ('brush_tap_soft', 38, 40), ('brush_tap', 38, 80), ('brush_slap', 39, 80), ('brush_swirl', 40, 70),
    ('hh_pedal', 44, 70), ('ride_soft', 51, 50), ('ride', 51, 75),
], 'drums_brush')

# Piano Salamander: muestras individuales (A, C, D#, F# de cada octava) → sprite estéreo de 6 s por nota
names = []
pcs = {'A': 9, 'C': 0, 'Ds': 3, 'Fs': 6}
for f in sorted(os.listdir(SALAMANDER)):
    if f.endswith('.mp3'):
        base = f[:-4]
        nm, octv = base[:-1], int(base[-1])
        names.append(((octv + 1) * 12 + pcs[nm], f))
names.sort()
names = [n for n in names if 33 <= n[0] <= 100]  # A1..E7 cubre todo lo que usa la app
SLOT = 6.0
with tempfile.TemporaryDirectory() as d:
    parts = []
    for i, (m, f) in enumerate(names):
        p = os.path.join(d, f'{i:03d}.wav')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(SALAMANDER, f), '-t', str(SLOT),
                        '-af', f'afade=t=out:st={SLOT-1.2}:d=1.2,apad=whole_dur={SLOT}', '-ar', '44100', '-ac', '2', p], check=True)
        parts.append(p)
    lst = os.path.join(d, 'list.txt')
    open(lst, 'w').write(''.join(f"file '{p}'\n" for p in parts))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-b:a', '96k', os.path.join(OUT, 'piano.mp3')], check=True)
I['piano'] = {'file': 'piano.mp3', 'slotSec': SLOT, 'slots': [{'midi': m, 'vel': 80} for m, _ in names]}

json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
for k, v in I.items():
    print(k, len(v['slots']), 'notas', os.path.getsize(os.path.join(OUT, v['file'])) // 1024, 'KB')
