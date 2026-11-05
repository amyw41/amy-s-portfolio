"""Traces public/images/drawings/jar.png into one continuous line for the
intro (brief Part 4.2) and writes lib/jar-outline.ts.

    python scripts/trace-jar-outline.py

Pure Python + Pillow (no numpy): the drawing is scaled to 400px wide, its
dark ink thinned to a one-pixel centre line (Zhang-Suen), and the line then
sampled along one planned route round the jar — the rim ellipse by angle
from its centre, the walls row by row, the base column by column — with
gaps filled in and the result smoothed, then resampled to evenly spaced
points.
"""
import json, math, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "public", "images", "drawings", "jar.png")
OUT = os.path.join(ROOT, "lib", "jar-outline.ts")
W = 400
im = Image.open(SRC).convert("RGBA")
w0, h0 = im.size
H = round(h0 * W / w0)
im = im.resize((W, H), Image.LANCZOS)
px = im.load()
# ink = dark & opaque
B = [[0]*W for _ in range(H)]
for y in range(H):
    for x in range(W):
        r,g,b,a = px[x,y]
        if a > 100 and (r+g+b)/3 < 160: B[y][x] = 1
# Zhang-Suen thinning
def neighbours(y,x):
    return [B[y-1][x],B[y-1][x+1],B[y][x+1],B[y+1][x+1],B[y+1][x],B[y+1][x-1],B[y][x-1],B[y-1][x-1]]
changed=True
while changed:
    changed=False
    for step in (0,1):
        rm=[]
        for y in range(1,H-1):
            row=B[y]
            for x in range(1,W-1):
                if not row[x]: continue
                n=neighbours(y,x); s=sum(n)
                if s<2 or s>6: continue
                t=sum((n[i]==0 and n[(i+1)%8]==1) for i in range(8))
                if t!=1: continue
                if step==0:
                    if n[0]*n[2]*n[4] or n[2]*n[4]*n[6]: continue
                else:
                    if n[0]*n[2]*n[6] or n[0]*n[4]*n[6]: continue
                rm.append((y,x))
        for y,x in rm: B[y][x]=0
        if rm: changed=True
S = {(x, y) for y in range(H) for x in range(W) if B[y][x]}
def interp(seq):
    # seq: list of (key, value or None); fill None linearly
    out=[]; known=[(k,v) for k,v in seq if v is not None]
    for k,v in seq:
        if v is not None: out.append((k,v)); continue
        lo=[kv for kv in known if kv[0]<k]; hi=[kv for kv in known if kv[0]>k]
        if lo and hi:
            (k0,v0),(k1,v1)=lo[-1],hi[0]; out.append((k,v0+(v1-v0)*(k-k0)/(k1-k0)))
        elif lo: out.append((k,lo[-1][1]))
        elif hi: out.append((k,hi[0][1]))
    return out
def smooth(vals, r):
    n=len(vals); o=[]
    for i in range(n):
        a=max(0,i-r); b=min(n,i+r+1); o.append(sum(vals[a:b])/(b-a))
    return o
# ---- body walls: rows from the neck bottom to just above the base ----
NECK_Y, BASE_Y = 105, 505
left=[]; right=[]
for y in range(NECK_Y, BASE_Y):
    row=[x for (x,yy) in S if abs(yy-y)<=1]
    l=[x for x in row if x<W*0.45]; r=[x for x in row if x>W*0.55]
    left.append((y, min(l) if l else None)); right.append((y, max(r) if r else None))
left=interp(left); right=interp(right)
lx=smooth([v for _,v in left],4); rx=smooth([v for _,v in right],4)
ys=[k for k,_ in left]
# ---- base: columns between the walls' bottom ends ----
x0, x1 = int(lx[-1]), int(rx[-1])
base=[]
for x in range(x0, x1+1):
    col=[yy for (xx,yy) in S if abs(xx-x)<=1 and yy>BASE_Y-25]
    base.append((x, max(col) if col else None))
base=interp(base); by=smooth([v for _,v in base],6); bxs=[k for k,_ in base]
# ---- rim: outer ellipse by angle around its centre ----
rim=[(x,y) for (x,y) in S if y<NECK_Y-5]
cx=(min(x for x,_ in rim)+max(x for x,_ in rim))/2; cy=(min(y for _,y in rim)+max(y for _,y in rim))/2
ring=[]
N=180
for i in range(N):
    th=math.pi*2*i/N
    best=None
    for (x,y) in rim:
        a=math.atan2((y-cy)*2.2,(x-cx))  # squash: ellipse is wide
        da=abs((a-th+math.pi)%(2*math.pi)-math.pi)
        if da<math.pi/N*1.5:
            r=math.hypot(x-cx,(y-cy)*2.2)
            if best is None or r>best: best=r
    ring.append((i,best))
ring=interp(ring); rr=smooth([v for _,v in ring],3)
rimpts=[(cx+rr[i]*math.cos(math.pi*2*i/N), cy+rr[i]*math.sin(math.pi*2*i/N)/2.2) for i in range(N)]
# ---- one continuous route: rim (starting at its left, going over the top)
# then down the left wall, across the base, up the right wall ----
start=min(range(N), key=lambda i: rimpts[i][0])
loop=[rimpts[(start+k)%N] for k in range(N+1)]
# the ellipse goes counter-clockwise in screen y-down? order so it goes over the top first
if loop[5][1] > loop[0][1]: loop=loop[::-1]
route = loop + [(lx[i], ys[i]) for i in range(len(ys))] + [(bxs[i], by[i]) for i in range(len(bxs))] + [(rx[i], ys[i]) for i in reversed(range(len(ys)))]
# downsample by arc length to ~260 points
L=[0]
for i in range(1,len(route)): L.append(L[-1]+math.hypot(route[i][0]-route[i-1][0],route[i][1]-route[i-1][1]))
M=260; out=[]; j=0
for k in range(M):
    t=L[-1]*k/(M-1)
    while j<len(L)-2 and L[j+1]<t: j+=1
    f=(t-L[j])/max(1e-9,L[j+1]-L[j])
    out.append((route[j][0]+(route[j+1][0]-route[j][0])*f, route[j][1]+(route[j+1][1]-route[j][1])*f))
frac=[[round(x/W,4), round(y/H,4)] for x,y in out]
points = ",\n  ".join(f"[{x}, {y}]" for x, y in frac)
open(OUT, "w", encoding="utf-8", newline="\n").write(f"""// GENERATED by scripts/trace-jar-outline.py from public/images/drawings/jar.png
// — don't edit by hand; re-run the script if the jar drawing changes.
//
// The jar drawing as ONE continuous line (the intro draws and unravels it,
// brief Part 4.2): its ink thinned to a centre line, then walked in one
// route — the rim ellipse from its left end over the top and back round,
// then down the left wall, across the base and up the right wall to the
// neck. Points are fractions of the jar art's box (x of its width, y of its
// height), evenly spaced along the line.
export const JAR_OUTLINE: [number, number][] = [
  {points},
];

/** Index in JAR_OUTLINE where the body (left wall) starts, after the rim. */
export const JAR_OUTLINE_BODY_START = {round(L[len(loop) - 1] / L[-1] * (M - 1))};
""")
print(f"wrote {OUT}: {len(frac)} points")
