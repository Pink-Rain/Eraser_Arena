# GrabCut guidé générique : seeds dans un JSON {fg_lines:[[w,[[x,y]...]]], fg_discs:[[x,y,r]], bg:[[x,y,r]], bg_below:y}
import sys, json, numpy as np, cv2
img = cv2.imread(sys.argv[1]); H, W = img.shape[:2]; S = json.load(open(sys.argv[2]))
gc = np.full((H, W), cv2.GC_PR_BGD, np.uint8)
for w, pts in S.get('fg_lines', []): cv2.polylines(gc, [np.array(pts, np.int32)], False, int(cv2.GC_FGD), w)
for x, y, r in S.get('fg_discs', []): cv2.circle(gc, (x, y), r, int(cv2.GC_FGD), -1)
for x, y, r in S.get('bg', []): cv2.circle(gc, (x, y), r, int(cv2.GC_BGD), -1)
if 'bg_below' in S: gc[S['bg_below']:, :] = cv2.GC_BGD
bg = np.zeros((1, 65)); fg = np.zeros((1, 65))
cv2.grabCut(img, gc, None, bg, fg, 10, cv2.GC_INIT_WITH_MASK)
m = (((gc == 1) | (gc == 3)) * 255).astype(np.uint8)
k = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r, r))
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k(5)); m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k(7))
n, lab, st, _ = cv2.connectedComponentsWithStats(m); m = ((lab == 1 + np.argmax(st[1:, 4])) * 255).astype(np.uint8)
np.save(sys.argv[3], m)
sil = np.full(img.shape, 210, np.uint8); sil[m > 0] = 8
dbg = img.copy(); dbg[gc == 1] = (0, 255, 0); dbg[gc == 0] = (255, 0, 0)
z = 500 / H; cv2.imwrite(sys.argv[4], np.hstack([cv2.resize(x, None, fx=z, fy=z) for x in (img, sil, dbg)]))
