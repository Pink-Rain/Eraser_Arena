# Silhouette générique : masque par seuil, composantes gardées, trous gardés au-delà d'une taille.
# Usage : gen.py src out x0,y0,x1,y1 mode seuil sigma minhole
import sys, json, numpy as np, cv2
src, out = sys.argv[1], sys.argv[2]; x0, y0, x1, y1 = map(int, sys.argv[3].split(','))
mode, thr, sigma, minhole = sys.argv[4], float(sys.argv[5]), float(sys.argv[6]), float(sys.argv[7])
img = cv2.imread(src)[y0:y1, x0:x1]; im = img.astype(np.int32); V = im.max(2)
if mode == 'dark': m = V < thr
else:
    border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]]); bg = np.median(border, axis=0)
    m = np.sqrt(((im - bg) ** 2).sum(2)) > thr
mask = (m * 255).astype(np.uint8)
k = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r, r))
mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k(3)); mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k(5))
n, lab, st, _ = cv2.connectedComponentsWithStats(mask); big = st[1:, 4].max()
keep = np.zeros_like(mask)
for i in range(1, n):
    if st[i, 4] > 0.03 * big: keep[lab == i] = 255
sm = cv2.GaussianBlur(keep, (0, 0), sigma); sm = ((sm > 127) * 255).astype(np.uint8)
cnts, hier = cv2.findContours(sm, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
s = 1000.0 / (y1 - y0)
def path(c):
    P = (cv2.approxPolyDP(c, 1.1, True)[:, 0, :].astype(float) * s).tolist(); n = len(P)
    if n < 3: return ''
    mid = lambda a, b: ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); m0 = mid(P[-1], P[0]); d = f'M{m0[0]:.0f} {m0[1]:.0f}'
    for i in range(n): p, q = P[i], P[(i + 1) % n]; mm = mid(p, q); d += f' Q{p[0]:.0f} {p[1]:.0f} {mm[0]:.0f} {mm[1]:.0f}'
    return d + ' Z'
keepc = []
for i, c in enumerate(cnts):
    a = cv2.contourArea(c); hole = hier[0][i][3] >= 0
    if (hole and a >= minhole) or (not hole and a >= 300): keepc.append((c, hole))
d = ' '.join(path(c) for c, _ in keepc)
json.dump({'w': round((x1 - x0) * s), 'h': 1000, 'd': d}, open(out, 'w'))
prev = np.full(sm.shape + (3,), 200, np.uint8)
cv2.drawContours(prev, [c for c, h in keepc if not h], -1, (8, 8, 8), -1); cv2.drawContours(prev, [c for c, h in keepc if h], -1, (200, 200, 200), -1)
cv2.imwrite(out.replace('.json', '.png'), prev); print(out, 'parties', len(keepc), 'trous', sum(h for _, h in keepc), 'boîte', round((x1 - x0) * s))
