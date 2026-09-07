"""
Generate the block and item textures for the site.

These are original 16x16 pixel-art tiles drawn in the style of the game, not
extracted game assets — the same approach the award-winning Minecraft folios
take, and the only one that is ours to ship.

Run: python tools/make_textures.py
Writes: public/tex/*.png
"""

import os
import random
import struct
import zlib

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'tex')
S = 16


def png(path, pixels, size=S):
    """Write RGBA pixel rows as a PNG without needing an image library."""
    raw = b''.join(
        b'\x00' + b''.join(bytes(pixels[y][x]) for x in range(size))
        for y in range(size)
    )

    def chunk(tag, data):
        body = tag + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xFFFFFFFF)

    out = b'\x89PNG\r\n\x1a\n'
    out += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    out += chunk(b'IDAT', zlib.compress(raw, 9))
    out += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(out)


def blank(color=(0, 0, 0, 0)):
    return [[list(color) for _ in range(S)] for _ in range(S)]


def noisy(base, shades, seed, density=0.55):
    """A flat colour speckled with darker and lighter cousins — the core of
    almost every stone-like block in the game."""
    rnd = random.Random(seed)
    px = blank(base)
    for y in range(S):
        for x in range(S):
            if rnd.random() < density:
                c = rnd.choice(shades)
                px[y][x] = list(c)
    return px


def save(name, px):
    png(os.path.join(OUT, name + '.png'), px)


def main():
    os.makedirs(OUT, exist_ok=True)

    # ---------- terrain ----------
    save('dirt', noisy((134, 96, 67, 255),
                       [(122, 87, 60, 255), (146, 106, 74, 255), (110, 78, 54, 255)], 1))

    save('stone', noisy((128, 128, 128, 255),
                        [(116, 116, 116, 255), (139, 139, 139, 255), (105, 105, 105, 255)], 2))

    save('deepslate', noisy((77, 77, 82, 255),
                            [(69, 69, 74, 255), (86, 86, 92, 255), (60, 60, 65, 255)], 3))

    save('cobble', noisy((122, 122, 122, 255),
                         [(90, 90, 90, 255), (150, 150, 150, 255), (105, 105, 105, 255)], 4, 0.7))

    # grass block seen from the side: green crown, dirt below, ragged join
    rnd = random.Random(5)
    g = noisy((134, 96, 67, 255),
              [(122, 87, 60, 255), (146, 106, 74, 255), (110, 78, 54, 255)], 1)
    for x in range(S):
        crown = 3 + rnd.randint(0, 2)
        for y in range(crown):
            shade = rnd.choice([(106, 170, 74, 255), (95, 159, 65, 255), (117, 183, 82, 255)])
            g[y][x] = list(shade)
    save('grass_side', g)

    save('grass_top', noisy((106, 170, 74, 255),
                            [(95, 159, 65, 255), (117, 183, 82, 255), (86, 145, 59, 255)], 6))

    # oak planks: horizontal boards with darker seams and grain flecks
    rnd = random.Random(7)
    p = blank((162, 130, 78, 255))
    for y in range(S):
        if y % 4 == 3:
            for x in range(S):
                p[y][x] = [125, 99, 58, 255]
        else:
            for x in range(S):
                if rnd.random() < 0.22:
                    p[y][x] = list(rnd.choice([(150, 120, 72, 255), (176, 142, 88, 255)]))
    for x in (3, 11):
        for y in range(S):
            if y % 4 != 3:
                p[y][x] = [138, 110, 66, 255]
    save('planks', p)

    # obsidian: near-black with violet glints
    save('obsidian', noisy((20, 15, 33, 255),
                           [(28, 20, 46, 255), (15, 11, 26, 255), (58, 38, 92, 255)], 8, 0.5))

    # bookshelf: planks frame with coloured spines packed in two rows
    rnd = random.Random(9)
    b = [row[:] for row in p]
    b = [[list(c) for c in row] for row in b]
    spines = [(150, 60, 52, 255), (72, 96, 158, 255), (196, 170, 84, 255),
              (96, 140, 84, 255), (140, 92, 156, 255), (176, 120, 60, 255)]
    for band in (2, 9):
        for x in range(1, S - 1):
            col = rnd.choice(spines)
            h = rnd.randint(4, 5)
            for y in range(band, min(band + h, S)):
                b[y][x] = list(col)
    save('bookshelf', b)

    # ---------- ores: stone with a coloured deposit ----------
    def ore(name, color, seed, base=None):
        px = [[list(c) for c in row] for row in (base or noisy(
            (128, 128, 128, 255),
            [(116, 116, 116, 255), (139, 139, 139, 255), (105, 105, 105, 255)], 2))]
        rnd2 = random.Random(seed)
        blobs = [(rnd2.randint(2, 11), rnd2.randint(2, 11)) for _ in range(4)]
        light = tuple(min(255, c + 45) for c in color[:3]) + (255,)
        for (bx, by) in blobs:
            for dy in range(rnd2.randint(2, 3)):
                for dx in range(rnd2.randint(2, 3)):
                    x, y = bx + dx, by + dy
                    if 0 <= x < S and 0 <= y < S:
                        px[y][x] = list(color if (dx + dy) % 2 == 0 else light)
        save(name, px)

    ore('ore_diamond', (92, 219, 213, 255), 11)
    ore('ore_emerald', (23, 221, 98, 255), 12)
    ore('ore_gold', (252, 219, 90, 255), 13)
    ore('ore_copper', (216, 128, 86, 255), 14)
    ore('ore_iron', (216, 175, 147, 255), 15)
    ore('ore_coal', (40, 40, 40, 255), 16)
    ore('ore_amethyst', (166, 106, 232, 255), 17)

    # ---------- town blocks ----------
    # A village needs more than terrain: walls, roofs, windows and light.
    save('plaster', noisy((222, 210, 190, 255),
                          [(232, 221, 202, 255), (208, 195, 176, 255)], 21, 0.35))

    # terracotta roof, laid in rows so a stepped roof reads as tiles
    rnd = random.Random(22)
    r = blank((166, 74, 56, 255))
    for y in range(S):
        if y % 4 == 0:
            for x in range(S):
                r[y][x] = [128, 54, 40, 255]
        else:
            for x in range(S):
                if rnd.random() < 0.25:
                    r[y][x] = list(rnd.choice([(180, 86, 64, 255), (150, 66, 50, 255)]))
    save('roof', r)

    # glass: a pale pane with a bright frame, so windows read at a distance
    g = blank((150, 205, 225, 255))
    for i in range(S):
        g[0][i] = g[S - 1][i] = [226, 240, 246, 255]
        g[i][0] = g[i][S - 1] = [226, 240, 246, 255]
    for i in range(2, S - 2):
        g[i][i] = [236, 248, 252, 255]
    save('glass', g)

    # lantern: warm core in an iron cage, the town's light source
    ln = blank((72, 60, 44, 255))
    for y in range(3, 13):
        for x in range(3, 13):
            ln[y][x] = [255, 206, 110, 255]
    for y in range(5, 11):
        for x in range(5, 11):
            ln[y][x] = [255, 238, 190, 255]
    for x in range(2, 14):
        ln[2][x] = ln[13][x] = [96, 82, 60, 255]
    save('lantern', ln)

    save('gravel', noisy((136, 130, 126, 255),
                         [(112, 106, 102, 255), (158, 152, 148, 255),
                          (96, 92, 88, 255)], 23, 0.75))

    # path: packed dirt, lighter and smoother than the surrounding ground
    save('path', noisy((164, 132, 88, 255),
                       [(152, 122, 80, 255), (176, 144, 98, 255)], 24, 0.5))

    # water, with a highlight band so a flat plane still reads as a surface
    w = noisy((58, 118, 196, 255),
              [(48, 104, 180, 255), (72, 136, 214, 255)], 25, 0.6)
    for x in range(S):
        if (x + 3) % 7 < 2:
            w[4][x] = [148, 196, 236, 255]
        if (x + 5) % 9 < 2:
            w[11][x] = [128, 178, 226, 255]
    save('water', w)

    # ---------- item sprites ----------
    def gem(name, color):
        """A cut gem: bright core, darker facets, transparent surround."""
        dark = tuple(max(0, c - 60) for c in color[:3]) + (255,)
        light = tuple(min(255, c + 55) for c in color[:3]) + (255,)
        shape = [
            '  ......  ',
            ' ..dddd.. ',
            '..dllllD..',
            '.dllllllD.',
            '.dllllllD.',
            '..DllllD..',
            ' ..DDDD.. ',
            '  ......  ',
        ]
        px = blank()
        oy, ox = 4, 3
        for y, row in enumerate(shape):
            for x, ch in enumerate(row):
                if ch == ' ' or ch == '.':
                    continue
                c = {'d': dark, 'l': light, 'D': color}[ch]
                px[oy + y][ox + x] = list(c)
        save(name, px)

    gem('item_diamond', (92, 219, 213, 255))
    gem('item_emerald', (23, 221, 98, 255))
    gem('item_gold', (252, 219, 90, 255))
    gem('item_copper', (216, 128, 86, 255))
    gem('item_iron', (216, 216, 216, 255))
    gem('item_amethyst', (166, 106, 232, 255))
    gem('item_netherite', (150, 120, 200, 255))

    # book: cover, pages, clasp
    px = blank()
    for y in range(2, 14):
        for x in range(3, 13):
            px[y][x] = [140, 60, 52, 255]
    for y in range(3, 13):
        for x in range(9, 12):
            px[y][x] = [235, 226, 200, 255]
    for y in range(3, 13):
        px[y][8] = [100, 40, 36, 255]
    for y in (6, 7):
        for x in range(9, 12):
            px[y][x] = [196, 170, 84, 255]
    save('item_book', px)

    # chest: oak body, dark bands, gold latch
    px = blank()
    for y in range(3, 14):
        for x in range(2, 14):
            px[y][x] = [150, 108, 58, 255]
    for x in range(2, 14):
        px[3][x] = [96, 66, 32, 255]
        px[13][x] = [96, 66, 32, 255]
        px[7][x] = [96, 66, 32, 255]
    for y in range(3, 14):
        px[y][2] = [96, 66, 32, 255]
        px[y][13] = [96, 66, 32, 255]
    for y in range(6, 10):
        for x in range(7, 9):
            px[y][x] = [214, 178, 74, 255]
    save('item_chest', px)

    print('wrote', len(os.listdir(OUT)), 'textures to public/tex')


if __name__ == '__main__':
    main()
