# Outil de l atelier : tire une silhouette lissée d une image d inspiration (OpenCV + numpy).
# Usage : python silhouette.py image.png sortie.json cle-de-faction  (zone et seuils à ajuster par image)
# Silhouette lissée -> tracé SVG normalisé (boîte 0..1000 en hauteur), plus détails placés à la main.
import sys, json, numpy as np, cv2
src, out, key = sys.argv[1], sys.argv[2], sys.argv[3]
img = cv2.imread(src)
x0, x1, y0, y1 = 54, img.shape[1] - 2, 0, 612
im = img[y0:y1, x0:x1].astype(np.int32)
B, G, R = im[..., 0], im[..., 1], im[..., 2]; V = np.max(im, axis=2)
mask = ((((R - B) > 11) | (V > 95)) * 255).astype(np.uint8)
mask[0:80, 0:80] = 0
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)), iterations=2)
n, lab, st, _ = cv2.connectedComponentsWithStats(mask)
mask = ((lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))) * 255).astype(np.uint8)
c = max(cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea)
filled = np.zeros_like(mask); cv2.drawContours(filled, [c], -1, 255, -1)
# Lissage fort : la silhouette garde l'allure, pas le détail du dessin d'origine.
sm = cv2.GaussianBlur(filled, (0, 0), 3.5); sm = ((sm > 127) * 255).astype(np.uint8)
c = max(cv2.findContours(sm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea)
pts = cv2.approxPolyDP(c, 1.6, True)[:, 0, :].astype(float)
h = float(y1 - y0); w = float(x1 - x0); s = 1000.0 / h
pts *= s
# Courbe lissée passant par les milieux des segments (quadratiques).
P = pts.tolist(); n = len(P)
mid = lambda a, b: ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
m0 = mid(P[-1], P[0]); d = f'M{m0[0]:.0f} {m0[1]:.0f}'
for i in range(n):
    p, q = P[i], P[(i + 1) % n]; m = mid(p, q); d += f' Q{p[0]:.0f} {p[1]:.0f} {m[0]:.0f} {m[1]:.0f}'
d += ' Z'
data = {'key': key, 'w': round(w * s), 'h': 1000, 'd': d}
json.dump(data, open(out, 'w'))
prev = np.full((y1 - y0, x1 - x0, 3), 230, np.uint8); prev[sm > 0] = (10, 10, 10); cv2.imwrite(out.replace('.json', '-smooth.png'), prev)
print(len(P), 'points ; boîte', data['w'], 'x', 1000)
