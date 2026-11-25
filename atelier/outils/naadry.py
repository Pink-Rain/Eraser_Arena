# Squelette encapé, sans les corbeaux : sombre (cape) + os, en excluant ailes et corbeaux.
import sys, json, numpy as np, cv2
img = cv2.imread(sys.argv[1]); X0, Y0, X1, Y1 = 70, 227, 432, 590
im = img.astype(np.int32); V = im.max(2)
H, W = V.shape; yy, xx = np.mgrid[0:H, 0:W]
dark = V < 48
# Ailes et corbeaux : tout ce qui est hors du buste au-dessus des épaules, et le haut de l'image.
body = np.zeros((H, W), np.uint8)
cv2.fillPoly(body, [np.array([[176,342],[322,342],[352,372],[392,420],[418,480],[432,560],[440,600],[60,600],[66,560],[80,480],[104,420],[146,372]], np.int32)], 1)
m = dark & (body > 0)
skull = np.array([[237,228],[258,232],[272,246],[278,268],[276,292],[272,304],[268,318],[262,334],[256,346],[240,350],[222,346],[216,334],[210,318],[205,304],[200,290],[198,268],[203,246],[217,232]], np.int32)
arms = np.array([[168,345],[200,336],[240,338],[285,336],[322,344],[332,372],[300,384],[240,382],[180,384],[166,372]], np.int32)
neck = np.array([[226,340],[256,340],[260,360],[222,360]], np.int32)
mask = (m * 255).astype(np.uint8)
for p in (skull, arms, neck): cv2.fillPoly(mask, [p], 255)
mask = mask[Y0:Y1, X0:X1]
k = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r, r))
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k(11), iterations=2); mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k(5))
n, lab, st, _ = cv2.connectedComponentsWithStats(mask); mask = ((lab == 1 + np.argmax(st[1:, 4])) * 255).astype(np.uint8)
c = max(cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea)
full = np.zeros_like(mask); cv2.drawContours(full, [c], -1, 255, -1)
sm = cv2.GaussianBlur(full, (0, 0), 2.5); sm = ((sm > 127) * 255).astype(np.uint8)
c = max(cv2.findContours(sm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea)
s = 1000.0 / (Y1 - Y0); P = (cv2.approxPolyDP(c, 1.2, True)[:, 0, :].astype(float) * s).tolist(); n = len(P)
mid = lambda a, b: ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); m0 = mid(P[-1], P[0]); d = f'M{m0[0]:.0f} {m0[1]:.0f}'
for i in range(n): p, q = P[i], P[(i + 1) % n]; mm = mid(p, q); d += f' Q{p[0]:.0f} {p[1]:.0f} {mm[0]:.0f} {mm[1]:.0f}'
json.dump({'w': round((X1 - X0) * s), 'h': 1000, 'd': d + ' Z'}, open(sys.argv[2], 'w'))
crop = img[Y0:Y1, X0:X1].copy(); ov = np.where(sm[..., None] > 0, (crop * 0.3).astype(np.uint8), crop)
prev = np.full(crop.shape, 225, np.uint8); prev[sm > 0] = (10, 10, 10)
cv2.imwrite(sys.argv[2].replace('.json', '.png'), np.hstack([cv2.resize(ov, None, fx=1.3, fy=1.3), cv2.resize(prev, None, fx=1.3, fy=1.3)]))
print('ok', round((X1 - X0) * s))
