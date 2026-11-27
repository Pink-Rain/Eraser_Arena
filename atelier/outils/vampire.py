import sys, numpy as np, cv2
img = cv2.imread(sys.argv[1]); H, W = img.shape[:2]
gc = np.full((H, W), cv2.GC_PR_BGD, np.uint8); FG, BG = cv2.GC_FGD, cv2.GC_BGD
def line(p, v, w): cv2.polylines(gc, [np.array(p, np.int32)], False, int(v), w)
def disc(x, y, r, v): cv2.circle(gc, (x, y), r, int(v), -1)
disc(440, 160, 30, FG); line([[440,200],[450,350],[460,600],[470,900]], FG, 30)
line([[360,100],[400,190]], FG, 8); line([[560,80],[480,190]], FG, 8); line([[310,170],[380,200]], FG, 6); line([[590,180],[500,200]], FG, 6)
line([[340,280],[310,400],[330,600]], FG, 20); line([[540,250],[560,450],[560,600]], FG, 18)
line([[420,350],[460,400],[480,420]], FG, 10); line([[540,640],[590,700],[620,720]], FG, 8); line([[575,720],[565,1060]], FG, 5)
line([[400,500],[200,650],[60,800],[20,1000]], FG, 30)
for (x, y) in [(40,90),(130,250),(250,230),(280,90),(620,120),(640,300),(650,520),(640,900),(620,1040),(230,380),(90,480),(660,620),(280,330)]: disc(x, y, 14, BG)
bg = np.zeros((1, 65)); fg = np.zeros((1, 65))
cv2.grabCut(img, gc, None, bg, fg, 10, cv2.GC_INIT_WITH_MASK)
m = (((gc == 1) | (gc == 3)) * 255).astype(np.uint8)
k = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r, r))
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k(5)); m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k(7))
n, lab, st, _ = cv2.connectedComponentsWithStats(m); m = ((lab == 1 + np.argmax(st[1:, 4])) * 255).astype(np.uint8)
np.save(sys.argv[2], m)
sil = np.full(img.shape, 210, np.uint8); sil[m > 0] = 8
dbg = img.copy(); dbg[gc == 1] = (0, 255, 0); dbg[gc == 0] = (255, 0, 0)
cv2.imwrite(sys.argv[3], np.hstack([cv2.resize(x, None, fx=0.35, fy=0.35) for x in (img, sil, dbg)]))
