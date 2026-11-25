import sys, numpy as np, cv2
img = cv2.imread(sys.argv[1]); H, W = img.shape[:2]
gc = np.full((H, W), cv2.GC_PR_BGD, np.uint8)
FG, BG = cv2.GC_FGD, cv2.GC_BGD
def line(pts, v, w): cv2.polylines(gc, [np.array(pts, np.int32)], False, int(v), w)
def disc(x, y, r, v): cv2.circle(gc, (x, y), r, int(v), -1)
line([[380,8],[380,110]], FG, 12); disc(290, 72, 14, FG); line([[130,120],[300,122]], FG, 9); line([[190,145],[285,145]], FG, 6)
disc(356, 178, 30, FG); line([[365,235],[330,280],[300,320]], FG, 10); line([[275,330],[460,330]], FG, 16)
line([[300,385],[230,420],[175,440]], FG, 12); line([[300,450],[298,550]], FG, 12)
for (x, y) in [(150,40),(60,200),(200,250),(150,350),(100,470),(220,600),(480,250),(200,30),(470,40),(110,300),(240,520),(380,470),(430,560),(60,620),(500,170),(515,300),(515,380),(490,430),(515,480),(470,500),(500,540),(420,520)]: disc(x, y, 12, BG)
gc[600:, :] = BG
bgm = np.zeros((1, 65)); fgm = np.zeros((1, 65))
cv2.grabCut(img, gc, None, bgm, fgm, 10, cv2.GC_INIT_WITH_MASK)
mask = (((gc == 1) | (gc == 3)) * 255).astype(np.uint8)
k = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r, r))
mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k(5)); mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k(5))
n, lab, st, _ = cv2.connectedComponentsWithStats(mask); big = st[1:, 4].max(); keep = np.zeros_like(mask)
for i in range(1, n):
    if st[i, 4] > 0.05 * big: keep[lab == i] = 255
np.save(sys.argv[2], keep)
ov = img.copy(); ov[keep == 0] = (ov[keep == 0] * 0.25 + 190).clip(0, 255).astype(np.uint8)
dbg = img.copy(); dbg[gc == 1] = (0, 255, 0); dbg[gc == 0] = (255, 0, 0)
sil = np.full(img.shape, 210, np.uint8); sil[keep > 0] = 8
cv2.imwrite(sys.argv[3], np.hstack([cv2.resize(x, None, fx=0.6, fy=0.6) for x in (ov, sil, dbg)]))
