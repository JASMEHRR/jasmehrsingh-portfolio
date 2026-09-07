"""
Cut the face out of the reference render for use as a texture.

The modelled face was a 16x16 pixel map extruded a voxel deep, and no amount of
tuning made it match: the reference's face carries far more detail than 16x16
can hold, and its glasses are a solid object with thickness. Rather than keep
approximating it, the head's front face now wears the reference's own pixels.

Only the face is treated this way. An earlier attempt textured the whole figure
from crops and failed, because a perspective render does not project onto flat
cube faces - the arms and legs arrived stretched. The face survives it because
it is nearly frontal and nearly planar; the rest stays modelled.

Run: python tools/make_face.py
Writes: public/face.png
"""

import os

from PIL import Image

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, '..', 'public', 'avatar.png')
OUT = os.path.join(HERE, '..', 'public', 'face.png')

# Square, because it maps onto a square cube face; a wide crop would squash.
#
# Derived rather than eyeballed: skin detection puts the visible face between
# x=296 and x=614, which is the width of the head cube's front face at 318px.
# The chin sits at y=455, so the square runs up 318px from there. The upper
# part is hair, which is correct - in the reference the cube's forehead is
# covered by curls, and the afro geometry sits over it in the model too.
BOX = (296, 137, 614, 455)
SIZE = 128


def main():
    im = Image.open(SRC).convert('RGBA')
    face = im.crop(BOX).resize((SIZE, SIZE), Image.LANCZOS)

    # The crop's corners can catch transparent background where the curls
    # overhang. Fill any of it with the nearest skin tone so the cube's front
    # never shows a hole.
    px = face.load()
    for y in range(SIZE):
        for x in range(SIZE):
            if px[x, y][3] < 200:
                px[x, y] = (244, 153, 93, 255)

    face.convert('RGB').save(OUT)
    print('wrote', OUT, face.size)


if __name__ == '__main__':
    main()
