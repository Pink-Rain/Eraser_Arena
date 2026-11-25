# Silhouette pleine (trous bouchés), lissée, vectorisée ; hauteur normalisée à 1000.
import sys, json, numpy as np, cv2
src, out, mode = sys.argv[1], sys.argv[2], sys.argv[3]
x0, y0, x1, y1 = map(int, sys.argv[4].split(',')); sigma = float(sys.argv[5])
img = cv2.imread(src)[y0:y1, x0:x1]; im = img.astype(np.int32); B, G, R = im[..., 0], im[..., 1], im[..., 2]; V = im.max(2)
if mode == 'cool': m = ((B - R) > 4) | (V < 110) | (((R - B) > 55) & (R > 90))
else:
    border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]]); bg = np.median(border, axis=0)
    m = np.sqrt(((im - bg) ** 2).sum(2)) > float(mode)
mask = (m * 255).astype(np.uint8)
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)), iterations=2)
n, lab, st, _ = cv2.connectedComponentsWithStats(mask); mask = ((lab == 1 + np.argmax(st[1:, 4])) * 255).astype(np.uint8)
c = max(cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea)
full = np.zeros_like(mask); cv2.drawContours(full, [c], -1, 255, -1)
sm = cv2.GaussianBlur(full, (0, 0), sigma); sm = ((sm > 127) * 255).astype(np.uint8)
c = max(cv2.findContours(sm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea)
s = 1000.0 / (y1 - y0); P = (cv2.approxPolyDP(c, 1.6, True)[:, 0, :].astype(float) * s).tolist(); n = len(P)
mid = lambda a, b: ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); m0 = mid(P[-1], P[0]); d = f'M{m0[0]:.0f} {m0[1]:.0f}'
for i in range(n): p, q = P[i], P[(i + 1) % n]; mm = mid(p, q); d += f' Q{p[0]:.0f} {p[1]:.0f} {mm[0]:.0f} {mm[1]:.0f}'
json.dump({'w': round((x1 - x0) * s), 'h': 1000, 'd': d + ' Z', 'crop': [x0, y0, x1, y1], 'scale': s}, open(out, 'w'))
ov = img.copy(); dk = np.zeros_like(ov); dk[sm > 0] = (0, 0, 0); ov = cv2.addWeighted(ov, 0.45, dk, 0.55, 0) * 0 + np.where(sm[..., None] > 0, (img * 0.35).astype(np.uint8), img)
cv2.imwrite(out.replace('.json', '-overlay.png'), ov)
print(out, 'boîte', round((x1 - x0) * s), 'x 1000')
