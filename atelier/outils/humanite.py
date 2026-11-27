import sys, numpy as np, cv2
img = cv2.imread(sys.argv[1]); H, W = img.shape[:2]
gc = np.full((H, W), cv2.GC_PR_BGD, np.uint8); FG, BG = cv2.GC_FGD, cv2.GC_BGD
def line(p, v, w): cv2.polylines(gc, [np.array(p, np.int32)], False, int(v), w)
def disc(x, y, r, v): cv2.circle(gc, (x, y), r, int(v), -1)
disc(350, 70, 30, FG); disc(350, 190, 35, FG); line([[350,240],[350,500],[340,800],[300,1000],[260,1250]], FG, 30)
line([[200,330],[180,450],[160,540],[150,600]], FG, 18); line([[480,330],[560,420],[600,480],[520,540]], FG, 16)
line([[450,600],[470,800],[520,1000],[550,1250]], FG, 26); line([[150,620],[120,900],[90,1250]], FG, 6)
for (x, y) in [(60,100),(650,100),(80,400),(680,350),(600,600),(60,700),(680,800),(240,1000),(420,1050),(650,1000),(30,1100),(380,900),(150,850),(600,250),(120,200),(560,700)]: disc(x, y, 18, BG)
gc[1320:, :] = BG
bg = np.zeros((1, 65)); fg = np.zeros((1, 65))
cv2.grabCut(img, gc, None, bg, fg, 10, cv2.GC_INIT_WITH_MASK)
m = (((gc == 1) | (gc == 3)) * 255).astype(np.uint8)
k = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r, r))
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k(5)); m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k(7))
n, lab, st, _ = cv2.connectedComponentsWithStats(m); big = st[1:, 4].max(); keep = np.zeros_like(m)
for i in range(1, n):
    if st[i, 4] > 0.03 * big: keep[lab == i] = 255
np.save(sys.argv[2], keep)
sil = np.full(img.shape, 210, np.uint8); sil[keep > 0] = 8
dbg = img.copy(); dbg[gc == 1] = (0, 255, 0); dbg[gc == 0] = (255, 0, 0)
cv2.imwrite(sys.argv[3], np.hstack([cv2.resize(x, None, fx=0.4, fy=0.4) for x in (img, sil, dbg)]))
