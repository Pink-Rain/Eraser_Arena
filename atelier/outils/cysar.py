import sys, json, numpy as np, cv2
img = cv2.imread(sys.argv[1]); H, W = img.shape[:2]
gc = np.full((H, W), cv2.GC_PR_BGD, np.uint8)
white = img.min(2) > 235; gc[white] = cv2.GC_BGD
FG = cv2.GC_FGD; BG = cv2.GC_BGD
def line(pts, v, w): cv2.polylines(gc, [np.array(pts, np.int32)], False, int(v), w)
def disc(x, y, r, v): cv2.circle(gc, (x, y), r, int(v), -1)
# Démon : tête, cornes, torse, bras, jambes, ailes.
disc(262, 160, 22, FG); line([[262,190],[250,260],[240,330],[230,420],[215,520],[200,620],[190,700]], FG, 14)
line([[240,130],[205,118]], FG, 6); line([[285,130],[320,118]], FG, 6)
line([[210,260],[160,330],[120,420],[95,500]], FG, 10); line([[150,200],[110,300],[70,400]], FG, 10)
line([[420,250],[470,330],[500,420]], FG, 10); line([[230,330],[300,380],[320,420]], FG, 14)
line([[380,520],[390,600],[380,680]], FG, 12); disc(388, 500, 12, FG)
# Ciel : entre les ailes et autour de la tête, à droite du corps.
for (x, y) in [(300,40),(260,60),(330,90),(190,80),(400,90),(350,110),(440,250),(330,440),(300,470),(450,470),(160,440),(470,560),(140,560),(250,30),(370,40)]: disc(x, y, 9, BG)
bgm = np.zeros((1, 65)); fgm = np.zeros((1, 65))
cv2.grabCut(img, gc, None, bgm, fgm, 10, cv2.GC_INIT_WITH_MASK)
mask = (((gc == 1) | (gc == 3)) * 255).astype(np.uint8)
book = np.array([[306,168],[345,158],[410,148],[470,138],[502,148],[502,172],[440,200],[404,214],[398,258],[380,292],[330,302],[283,277],[280,250],[298,200]], np.int32)
cv2.fillPoly(mask, [book], 0)
k = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r, r))
mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k(5))
n, lab, st, _ = cv2.connectedComponentsWithStats(mask); big = st[1:, 4].max(); keep = np.zeros_like(mask)
for i in range(1, n):
    if st[i, 4] > 0.04 * big: keep[lab == i] = 255
np.save(sys.argv[2], keep)
ov = img.copy(); ov[keep == 0] = (ov[keep == 0] * 0.25 + 190).clip(0, 255).astype(np.uint8)
dbg = img.copy(); dbg[gc == 1] = (0, 255, 0); dbg[(gc == 0) & ~white] = (255, 0, 0)
cv2.imwrite(sys.argv[3], np.hstack([cv2.resize(ov, None, fx=0.6, fy=0.6), cv2.resize(dbg, None, fx=0.6, fy=0.6)]))
