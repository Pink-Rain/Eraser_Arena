import sys, numpy as np, cv2
img = cv2.imread(sys.argv[1]); H, W = img.shape[:2]
gc = np.full((H, W), cv2.GC_PR_BGD, np.uint8); FG, BG = cv2.GC_FGD, cv2.GC_BGD
def line(p, v, w): cv2.polylines(gc, [np.array(p, np.int32)], False, int(v), w)
def disc(x, y, r, v): cv2.circle(gc, (x, y), r, int(v), -1)
line([[330,120],[370,150],[440,200],[500,240]], FG, 14); disc(380, 175, 22, FG)
line([[370,260],[380,400],[390,560],[400,700]], FG, 40); line([[330,320],[260,250],[170,220],[135,210]], FG, 14)
line([[120,90],[120,180],[140,260],[170,330],[210,430],[240,520],[270,620],[300,760]], FG, 8); disc(105, 60, 25, FG)
line([[300,600],[260,700],[230,760]], FG, 18); line([[470,600],[540,700],[600,760]], FG, 14)
for (x, y) in [(600,120),(680,330),(660,520),(40,440),(60,720),(700,760),(550,330),(250,120),(560,30),(30,200),(200,560),(150,700),(640,640),(240,350)]: disc(x, y, 14, BG)
gc[810:, :] = BG
bg = np.zeros((1, 65)); fg = np.zeros((1, 65))
cv2.grabCut(img, gc, None, bg, fg, 10, cv2.GC_INIT_WITH_MASK)
m = (((gc == 1) | (gc == 3)) * 255).astype(np.uint8)
k = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r, r))
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k(5)); m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k(7))
n, lab, st, _ = cv2.connectedComponentsWithStats(m); m = ((lab == 1 + np.argmax(st[1:, 4])) * 255).astype(np.uint8)
np.save(sys.argv[2], m)
sil = np.full(img.shape, 210, np.uint8); sil[m > 0] = 8
dbg = img.copy(); dbg[gc == 1] = (0, 255, 0); dbg[gc == 0] = (255, 0, 0)
cv2.imwrite(sys.argv[3], np.hstack([cv2.resize(x, None, fx=0.45, fy=0.45) for x in (img, sil, dbg)]))
