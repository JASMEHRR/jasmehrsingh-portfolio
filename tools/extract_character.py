"""
Derive the character's textures and hair shape from the reference render.

The point is fidelity: rather than hand-tuning cube colours until they look
about right, this reads public/avatar.png and cuts the actual pixels out of it,
so the face on the model is the face in the reference, not an approximation of
it. The afro is likewise placed from the reference's own hair mask, which is
what makes the silhouette match instead of merely resemble.

Run: python tools/extract_character.py
Writes: public/char/*.png and public/char/hair.json
"""

import json
import os
import struct
import zlib

from PIL import Image

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, '..', 'public', 'avatar.png')
OUT = os.path.join(HERE, '..', 'public', 'char')

# Regions measured off the reference by skin detection and silhouette profiling.
# y ranges are generous at the seams so no crop clips a feature in half.
# Square, because it maps onto a square cube face and a wide crop would squash.
# The head cube's front in the reference is square too; the curls simply cover
# its upper part, which the afro geometry reproduces anyway.
FACE_BOX = (290, 200, 620, 530)
TORSO_BOX = (285, 470, 625, 960)     # shirt with the straw-hat skull
# Arm columns found by classifying pixels across the figure: skin runs
# x140-265 and x628-775 below the sleeve, not at the outer silhouette edge.
ARM_L_BOX = (140, 620, 265, 950)
ARM_R_BOX = (628, 620, 775, 950)
LEG_BOX = (255, 960, 660, 1470)

HEAD_REGION = (140, 0, 780, 470)     # everything above the shoulders


def is_hair(p):
    r, g, b, a = p
    if a < 180:
        return False
    mx = max(r, g, b)
    return mx < 105 and abs(r - b) < 60


def is_skin(p):
    r, g, b, a = p
    return a > 180 and r > 150 and 60 < g < 195 and b < 155 and r >= g >= b


def crop(im, box, name, size=(64, 64)):
    part = im.crop(box)
    part = part.resize(size, Image.NEAREST if size[0] <= 32 else Image.LANCZOS)
    part.save(os.path.join(OUT, name + '.png'))
    return part


def main():
    os.makedirs(OUT, exist_ok=True)
    im = Image.open(SRC).convert('RGBA')

    # ---- flat textures, straight from the render -------------------------
    crop(im, FACE_BOX, 'face', (72, 72))
    crop(im, TORSO_BOX, 'torso', (64, 96))
    crop(im, ARM_L_BOX, 'arm_left', (32, 96))
    crop(im, ARM_R_BOX, 'arm_right', (32, 96))
    crop(im, LEG_BOX, 'legs', (64, 96))

    # ---- hair mask, sampled onto a grid ---------------------------------
    # Each filled cell becomes one curl in the 3D build, so the outline of the
    # afro is the reference's outline rather than a guessed ellipsoid.
    x0, y0, x1, y1 = HEAD_REGION
    head = im.crop(HEAD_REGION)
    GW, GH = 34, 26
    cw = head.width / GW
    ch = head.height / GH
    px = head.load()

    grid = []
    for gy in range(GH):
        row = []
        for gx in range(GW):
            hair = skin = total = 0
            for sy in range(int(gy * ch), int((gy + 1) * ch), 3):
                for sx in range(int(gx * cw), int((gx + 1) * cw), 3):
                    if sx >= head.width or sy >= head.height:
                        continue
                    p = px[sx, sy]
                    total += 1
                    if is_hair(p):
                        hair += 1
                    elif is_skin(p):
                        skin += 1
            if total == 0:
                row.append(0)
                continue
            # a cell is hair only if hair clearly dominates it, so the fringe
            # over the brow does not swallow the top of the face
            row.append(1 if (hair / total) > 0.34 and hair > skin else 0)
        grid.append(row)

    # brightness per cell, so curls carry the reference's own shading
    tone = []
    for gy in range(GH):
        row = []
        for gx in range(GW):
            if not grid[gy][gx]:
                row.append(0)
                continue
            vals = []
            for sy in range(int(gy * ch), int((gy + 1) * ch), 3):
                for sx in range(int(gx * cw), int((gx + 1) * cw), 3):
                    if sx >= head.width or sy >= head.height:
                        continue
                    p = px[sx, sy]
                    if is_hair(p):
                        vals.append((p[0] + p[1] + p[2]) / 3)
            row.append(round(sum(vals) / len(vals)) if vals else 0)
        tone.append(row)

    filled = sum(sum(r) for r in grid)
    meta = {
        'grid': grid,
        'tone': tone,
        'cols': GW,
        'rows': GH,
        'headRegion': HEAD_REGION,
        'faceBox': FACE_BOX,
        'filled': filled,
    }
    with open(os.path.join(OUT, 'hair.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f)

    # a visual check of the mask, so the grid can be eyeballed against the render
    vis = Image.new('RGB', (GW * 8, GH * 8), (24, 24, 30))
    vp = vis.load()
    for gy in range(GH):
        for gx in range(GW):
            v = tone[gy][gx]
            c = (v + 30, v + 24, v + 24) if grid[gy][gx] else (24, 24, 30)
            for dy in range(8):
                for dx in range(8):
                    vp[gx * 8 + dx, gy * 8 + dy] = c
    vis.save(os.path.join(OUT, '_mask_preview.png'))

    print('hair cells filled:', filled, 'of', GW * GH)
    print('wrote', sorted(os.listdir(OUT)))


if __name__ == '__main__':
    main()
