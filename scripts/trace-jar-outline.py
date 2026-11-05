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
        if a > 60 and (r+g+b)/3 < 200: B[y][x] = 1
B0 = [row[:] for row in B]  # the ink before thinning, for the coverage check
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
body_start = round(L[len(loop) - 1] / L[-1] * (M - 1))

# ---- every stroke of the drawing, in pen order (the intro draws the real
# artwork on along these) ----
# The thinned ink is walked into strokes (a greedy pen walk; crumbs are
# dropped). Each stroke is placed by the nearest point of the one-line route
# above, and the strokes are drawn starting from the bottom of the right
# wall: up the right wall, the rim and lid lines, down the left wall, across
# the base. Each one starts at whichever end is nearer where the last one
# finished.
def nb(p):
    x, y = p
    return [(x+dx, y+dy) for dx in (-1,0,1) for dy in (-1,0,1) if (dx or dy) and (x+dx, y+dy) in S]
deg = {p: len(nb(p)) for p in S}
# A greedy pen walk over the centre line: start at a loose end (or, once
# those are used, any pixel left), keep stepping to the unvisited
# neighbour that turns least, and lift when there is none.
visited = set()
edges = []
def pen_walk(start):
    path = [start]; visited.add(start)
    d = None
    cur = start
    while True:
        cand = [q for q in nb(cur) if q not in visited]
        if not cand: break
        if d is None:
            q = min(cand, key=lambda q: (abs(q[0]-cur[0]) + abs(q[1]-cur[1])))
        else:
            def turn(q):
                vx, vy = q[0]-cur[0], q[1]-cur[1]
                return -(vx*d[0] + vy*d[1]) / math.hypot(vx, vy)
            q = min(cand, key=turn)
        # everything touching the step is now drawn (no doubling back
        # along the staircase)
        for r in nb(cur):
            if r != q and r not in visited and math.hypot(r[0]-q[0], r[1]-q[1]) <= 1: visited.add(r)
        nd = (q[0]-cur[0], q[1]-cur[1])
        d = nd if d is None else (0.6*d[0] + 0.4*nd[0], 0.6*d[1] + 0.4*nd[1])
        visited.add(q); path.append(q); cur = q
    return path
for p0 in sorted((p for p in S if deg[p] == 1), key=lambda p: (p[1], p[0])):
    if p0 not in visited: edges.append(pen_walk(p0))
for p0 in sorted(S, key=lambda p: (p[1], p[0])):
    if p0 not in visited: edges.append(pen_walk(p0))
def plen(pts): return sum(math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]) for i in range(1, len(pts)))
edges = [e for e in edges if len(e) >= 3]
# Crumbs (under 5px) that lie along a longer stroke add nothing but pen
# jumps: drop them.
long_px = {p for e in edges if plen(e) >= 5 for p in e}
edges = [e for e in edges if plen(e) >= 5 or any(math.hypot(p[0]-q[0], p[1]-q[1]) > 2.5 for p in e for q in [min(long_px, key=lambda q: (q[0]-p[0])**2 + (q[1]-p[1])**2)])]
def smooth_pts(pts, r=2):
    n = len(pts); o = []
    for i in range(n):
        a = max(0, i-r); b = min(n, i+r+1)
        if i in (0, n-1): o.append(pts[i]); continue
        o.append((sum(p[0] for p in pts[a:b])/(b-a), sum(p[1] for p in pts[a:b])/(b-a)))
    return o
def rdp(pts, eps):
    if len(pts) < 3: return pts
    (x0,y0),(x1,y1) = pts[0], pts[-1]
    dx, dy = x1-x0, y1-y0; dl = math.hypot(dx, dy) or 1e-9
    dmax, idx = 0, 0
    for i in range(1, len(pts)-1):
        d = abs(dy*pts[i][0] - dx*pts[i][1] + x1*y0 - y1*x0) / dl
        if d > dmax: dmax, idx = d, i
    if dmax > eps: return rdp(pts[:idx+1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]
edges = [smooth_pts([(float(x), float(y)) for x, y in e]) for e in edges]
# route parameter (0..1) of the nearest route point; the pen goes round the
# route from the bottom of the right wall
def param(p):
    best = min(range(len(out)), key=lambda k: (out[k][0]-p[0])**2 + (out[k][1]-p[1])**2)
    return best / (len(out) - 1)
ymax = max(y for _, y in out)
cxr = (min(x for x, _ in out) + max(x for x, _ in out)) / 2
start_k = max(k for k in range(body_start, len(out)) if out[k][1] > ymax - 0.05*H and out[k][0] > cxr)
start_p = start_k / (len(out) - 1)
# Split any stroke that runs through the pen's starting point there, so the
# pen can start exactly on it (the base and a wall can be one stroke).
sp = out[start_k]
def near(e):
    k = min(range(len(e)), key=lambda i: (e[i][0]-sp[0])**2 + (e[i][1]-sp[1])**2)
    return math.hypot(e[k][0]-sp[0], e[k][1]-sp[1]), k
long_edges = [e for e in edges if plen(e) > 50]
host = min(long_edges, key=lambda e: near(e)[0])
d_host, k_host = near(host)
if 2 < k_host < len(host) - 3 and d_host < 12:
    edges = [e for e in edges if e is not host] + [host[:k_host+1][::-1], host[k_host:]]
keyed = []
for e in edges:
    mid = e[len(e)//2]
    keyed.append(((param(mid) - start_p) % 1.0, e))
keyed.sort(key=lambda kv: kv[0])
ordered = []
pen = out[start_k]
for _, e in keyed:
    if math.hypot(e[-1][0]-pen[0], e[-1][1]-pen[1]) < math.hypot(e[0][0]-pen[0], e[0][1]-pen[1]): e = e[::-1]
    ordered.append(rdp(e, 0.35))
    pen = e[-1]
# the pen's width (as a fraction of the jar's width): wide enough to cover
# the thickest ink, checked here
PEN_W = 11
cover = Image.new("L", (W, H), 0)
from PIL import ImageDraw
dr = ImageDraw.Draw(cover)
for e in ordered:
    dr.line([(x, y) for x, y in e], fill=255, width=PEN_W, joint="curve")
    for x, y in (e[0], e[-1]): dr.ellipse([x-PEN_W/2, y-PEN_W/2, x+PEN_W/2, y+PEN_W/2], fill=255)
cp = cover.load()
ink = [(x, y) for y in range(H) for x in range(W) if B0[y][x]]
missed = sum(1 for x, y in ink if cp[x, y] == 0)
total_len = sum(plen(e) for e in ordered)
strokes = ",\n  ".join("[" + ", ".join(f"[{round(x/W,4)}, {round(y/H,4)}]" for x, y in e) + "]" for e in ordered)
open(OUT, "w", encoding="utf-8", newline="\n").write(f"""// GENERATED by scripts/trace-jar-outline.py from public/images/drawings/jar.png
// — don't edit by hand; re-run the script if the jar drawing changes.
//
// The jar drawing as ONE continuous line: its ink thinned to a centre line,
// then walked in one route — the rim ellipse from its left end over the top
// and back round, then down the left wall, across the base and up the right
// wall to the neck. Points are fractions of the jar art's box (x of its
// width, y of its height), evenly spaced along the line.
export const JAR_OUTLINE: [number, number][] = [
  {points},
];

/** Index in JAR_OUTLINE where the body (left wall) starts, after the rim. */
export const JAR_OUTLINE_BODY_START = {body_start};

/** Every stroke of the drawing (its thinned ink walked into strokes), in pen
 * order from the bottom of the right wall: up the right wall, the rim and lid
 * lines, down the left wall, across the base. Same fractions as above. The
 * intro reveals the real artwork along these with a pen JAR_PEN_WIDTH wide. */
export const JAR_STROKES: [number, number][][] = [
  {strokes},
];

/** The pen's width as a fraction of the jar art's width: covers every ink
 * pixel of the drawing ({missed} of {len(ink)} missed at {W}px). */
export const JAR_PEN_WIDTH = {round(PEN_W / W, 4)};
""")
print(f"wrote {OUT}: {len(frac)} route points, {len(ordered)} strokes, {round(total_len)}px of strokes at {W}px wide, ink missed {missed}/{len(ink)}")
