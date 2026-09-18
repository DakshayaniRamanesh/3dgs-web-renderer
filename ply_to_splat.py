"""
ply_to_splat.py
Convert a 3D Gaussian Splatting .ply to the compact .splat binary format.

.splat format: 32 bytes per Gaussian
  12 bytes: position  (3 x float32)
  12 bytes: scale     (3 x float32, linear, not log)
   4 bytes: RGBA      (4 x uint8)
   4 bytes: rotation  (4 x uint8, quaternion mapped 0-255)

Usage:
  python ply_to_splat.py input.ply
  python ply_to_splat.py input.ply output.splat

Requirements:
  pip install plyfile numpy
"""

import sys, os
import numpy as np
from plyfile import PlyData

def sigmoid(x):
    return np.where(x >= 0, 1/(1+np.exp(-x)), np.exp(x)/(1+np.exp(x)))

SH_C0 = 0.28209479177387814

def convert(inp, out):
    if not os.path.isfile(inp):
        print(f"ERROR: File not found: {inp}"); sys.exit(1)

    mb_in = os.path.getsize(inp) / 1024**2
    print(f"\nReading {inp!r}  ({mb_in:.1f} MB)...")
    v = PlyData.read(inp)['vertex']
    n = len(v.data)
    print(f"  {n:,} Gaussians found")

    # Positions
    pos = np.column_stack([v['x'], v['y'], v['z']]).astype(np.float32)

    # Scales: log -> linear
    scl = np.exp(np.column_stack([v['scale_0'], v['scale_1'], v['scale_2']])).astype(np.float32)

    # Color from SH DC coefficients
    rgb = np.clip(np.column_stack([v['f_dc_0'], v['f_dc_1'], v['f_dc_2']]).astype(np.float32) * SH_C0 + 0.5, 0, 1)

    # Opacity: logit -> sigmoid
    alpha = sigmoid(np.array(v['opacity'], dtype=np.float32))

    rgba = np.zeros((n, 4), dtype=np.uint8)
    rgba[:, 0] = (rgb[:, 0] * 255).clip(0, 255).astype(np.uint8)
    rgba[:, 1] = (rgb[:, 1] * 255).clip(0, 255).astype(np.uint8)
    rgba[:, 2] = (rgb[:, 2] * 255).clip(0, 255).astype(np.uint8)
    rgba[:, 3] = (alpha      * 255).clip(0, 255).astype(np.uint8)

    # Rotation quaternion: normalize -> uint8
    rot = np.column_stack([v['rot_0'], v['rot_1'], v['rot_2'], v['rot_3']]).astype(np.float32)
    rot = rot / np.maximum(np.linalg.norm(rot, axis=1, keepdims=True), 1e-8)
    rot_u8 = ((rot * 128.0) + 128.0).clip(0, 255).astype(np.uint8)

    # Build flat 32-byte-per-splat buffer
    buf = np.zeros((n, 32), dtype=np.uint8)
    buf[:, 0:12]  = pos.view(np.uint8).reshape(n, 12)
    buf[:, 12:24] = scl.view(np.uint8).reshape(n, 12)
    buf[:, 24:28] = rgba
    buf[:, 28:32] = rot_u8

    print(f"Writing {out!r}...")
    with open(out, 'wb') as f:
        f.write(buf.tobytes())

    mb_out = os.path.getsize(out) / 1024**2
    print(f"\nDone!")
    print(f"  Input:   {mb_in:>8.1f} MB")
    print(f"  Output:  {mb_out:>8.1f} MB")
    print(f"  Ratio:   {mb_in/mb_out:.1f}x smaller")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(0)
    inp = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) >= 3 else os.path.splitext(inp)[0] + '.splat'
    convert(inp, out)
