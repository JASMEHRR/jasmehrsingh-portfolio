"""
Generate a 64x64 Minecraft player skin (Java 1.8+, classic 4px arms).

A skin is not a picture of a person, it is a UV atlas: every cube face reads
one exact rectangle. Writing the regions directly is the only way to be sure
the result actually maps onto the model, which is why this is a script rather
than a prompt.

Run: python tools/make_skin.py
Writes: public/skin.png
"""

import os
import struct
import zlib

W = H = 64
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'skin.png')

# palette, sampled from the reference render
SKIN = (222, 166, 116, 255)
SKIN_SHADE = (198, 143, 96, 255)
HAIR = (26, 22, 22, 255)
HAIR_HI = (48, 42, 42, 255)
BEARD = (38, 30, 26, 255)
GLASS_FRAME = (18, 18, 22, 255)
GLASS_LENS = (198, 214, 226, 255)
EYE_WHITE = (238, 238, 238, 255)
EYE_DARK = (40, 34, 30, 255)
SHIRT = (22, 22, 24, 255)
SHIRT_HI = (36, 36, 38, 255)
LOGO_W = (240, 240, 240, 255)
LOGO_HAT = (226, 190, 92, 255)
LOGO_BAND = (198, 62, 52, 255)
PANTS = (58, 58, 64, 255)
PANTS_HI = (72, 72, 80, 255)
SHOE = (232, 232, 232, 255)
NONE = (0, 0, 0, 0)

px = [[list(NONE) for _ in range(W)] for _ in range(H)]


def rect(x0, y0, w, h, c):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            px[y][x] = list(c)


def dot(x, y, c):
    px[y][x] = list(c)


# ---------------------------------------------------------------- head (8x8)
# base skin on every face, then hair over the top, sides and back
rect(8, 0, 8, 8, HAIR)          # top
rect(16, 0, 8, 8, SKIN_SHADE)   # bottom (under the chin)
rect(0, 8, 8, 8, SKIN)          # right
rect(8, 8, 8, 8, SKIN)          # front
rect(16, 8, 8, 8, SKIN)         # left
rect(24, 8, 8, 8, HAIR)         # back

# hairline on the sides
rect(0, 8, 8, 3, HAIR)
rect(16, 8, 8, 3, HAIR)
dot(0, 11, HAIR); dot(1, 11, HAIR)
dot(22, 11, HAIR); dot(23, 11, HAIR)

# --- face, drawn on the front 8x8 at origin (8,8) ---
fx, fy = 8, 8
rect(fx, fy, 8, 2, HAIR)                    # fringe
dot(fx + 1, fy + 2, HAIR); dot(fx + 6, fy + 2, HAIR)

# glasses: frame across the eye row, lenses inside
rect(fx, fy + 3, 8, 1, GLASS_FRAME)
rect(fx + 1, fy + 3, 2, 1, GLASS_LENS)
rect(fx + 5, fy + 3, 2, 1, GLASS_LENS)
dot(fx + 1, fy + 3, EYE_WHITE); dot(fx + 2, fy + 3, EYE_DARK)
dot(fx + 5, fy + 3, EYE_DARK); dot(fx + 6, fy + 3, EYE_WHITE)

# nose and mouth
dot(fx + 3, fy + 4, SKIN_SHADE); dot(fx + 4, fy + 4, SKIN_SHADE)

# beard around the jaw
rect(fx, fy + 5, 8, 1, BEARD)
rect(fx, fy + 6, 8, 2, BEARD)
rect(fx + 3, fy + 6, 2, 1, (150, 90, 80, 255))   # mouth

# ------------------------------------------------- hat layer: the afro volume
# offset +32 in x from the head faces; this is what gives the hair its bulk
rect(40, 0, 8, 8, HAIR)          # top
rect(32, 8, 8, 5, HAIR)          # right
rect(40, 8, 8, 3, HAIR)          # front (fringe only, face stays visible)
rect(48, 8, 8, 5, HAIR)          # left
rect(56, 8, 8, 8, HAIR)          # back
# curl highlights so it does not read as a solid block
for (hx, hy) in [(41, 1), (44, 2), (46, 0), (42, 4), (45, 5), (33, 9),
                 (36, 10), (50, 9), (53, 11), (58, 10), (61, 12), (59, 13)]:
    dot(hx, hy, HAIR_HI)

# ------------------------------------------------------------ body (8x12)
rect(20, 16, 8, 4, SHIRT)        # top (shoulders)
rect(28, 16, 8, 4, PANTS)        # bottom (waist)
rect(16, 20, 4, 12, SHIRT)       # right
rect(20, 20, 8, 12, SHIRT)       # front
rect(28, 20, 4, 12, SHIRT)       # left
rect(32, 20, 8, 12, SHIRT)       # back

# shirt hem sits above the trousers on every side
for x0, w in ((16, 4), (20, 8), (28, 4), (32, 8)):
    rect(x0, 29, w, 3, PANTS)
rect(20, 20, 8, 1, SHIRT_HI)

# --- straw-hat skull on the chest, front face origin (20,20) ---
bx, by = 20, 20
rect(bx + 2, by + 3, 4, 1, LOGO_HAT)          # hat brim
rect(bx + 3, by + 2, 2, 1, LOGO_HAT)          # crown
rect(bx + 3, by + 3, 2, 1, LOGO_BAND)         # band
rect(bx + 2, by + 4, 4, 3, LOGO_W)            # skull
dot(bx + 3, by + 5, SHIRT); dot(bx + 4, by + 5, SHIRT)   # eye sockets
dot(bx + 2, by + 7, LOGO_W); dot(bx + 5, by + 7, LOGO_W)  # crossbones

# --------------------------------------------------------- right arm (4x12)
rect(44, 16, 4, 4, SKIN)         # top
rect(48, 16, 4, 4, SKIN_SHADE)   # bottom (hand)
rect(40, 20, 4, 12, SKIN)        # right
rect(44, 20, 4, 12, SKIN)        # front
rect(48, 20, 4, 12, SKIN)        # left
rect(52, 20, 4, 12, SKIN)        # back
# short black sleeve over the top third
for x0 in (40, 44, 48, 52):
    rect(x0, 20, 4, 4, SHIRT)
rect(44, 16, 4, 4, SHIRT)

# ---------------------------------------------------------- left arm (4x12)
rect(36, 48, 4, 4, SKIN)         # top
rect(40, 48, 4, 4, SKIN_SHADE)   # bottom
rect(32, 52, 4, 12, SKIN)        # right
rect(36, 52, 4, 12, SKIN)        # front
rect(40, 52, 4, 12, SKIN)        # left
rect(44, 52, 4, 12, SKIN)        # back
for x0 in (32, 36, 40, 44):
    rect(x0, 52, 4, 4, SHIRT)
rect(36, 48, 4, 4, SHIRT)

# --------------------------------------------------------- right leg (4x12)
rect(4, 16, 4, 4, PANTS)         # top
rect(8, 16, 4, 4, SHOE)          # bottom (sole)
rect(0, 20, 4, 12, PANTS)        # right
rect(4, 20, 4, 12, PANTS)        # front
rect(8, 20, 4, 12, PANTS)        # left
rect(12, 20, 4, 12, PANTS)       # back
for x0 in (0, 4, 8, 12):
    rect(x0, 29, 4, 3, SHOE)     # sneaker
    dot(x0 + 1, 24, PANTS_HI)    # cargo pocket hint

# ---------------------------------------------------------- left leg (4x12)
rect(20, 48, 4, 4, PANTS)
rect(24, 48, 4, 4, SHOE)
rect(16, 52, 4, 12, PANTS)
rect(20, 52, 4, 12, PANTS)
rect(24, 52, 4, 12, PANTS)
rect(28, 52, 4, 12, PANTS)
for x0 in (16, 20, 24, 28):
    rect(x0, 61, 4, 3, SHOE)
    dot(x0 + 1, 56, PANTS_HI)


def write_png(path):
    raw = b''.join(
        b'\x00' + b''.join(bytes(px[y][x]) for x in range(W)) for y in range(H)
    )

    def chunk(tag, data):
        body = tag + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xFFFFFFFF)

    out = b'\x89PNG\r\n\x1a\n'
    out += chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0))
    out += chunk(b'IDAT', zlib.compress(raw, 9))
    out += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(out)


write_png(OUT)
print('wrote', OUT)
