import sys, json, numpy as np, cv2
mask = np.load(sys.argv[1]); x0, y0, x1, y1 = map(int, sys.argv[3].split(',')); sigma = float(sys.argv[4])
m = mask[y0:y1, x0:x1]
sm = cv2.GaussianBlur(m, (0, 0), sigma); sm = ((sm > 127) * 255).astype(np.uint8)
cnts, hier = cv2.findContours(sm, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
s = 1000.0 / (y1 - y0)
def pth(c):
    P = (cv2.approxPolyDP(c, 1.1, True)[:, 0, :].astype(float) * s).tolist(); n = len(P)
    mid = lambda a, b: ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); m0 = mid(P[-1], P[0]); d = f'M{m0[0]:.0f} {m0[1]:.0f}'
    for i in range(n): p, q = P[i], P[(i + 1) % n]; mm = mid(p, q); d += f' Q{p[0]:.0f} {p[1]:.0f} {mm[0]:.0f} {mm[1]:.0f}'
    return d + ' Z'
d = ' '.join(pth(c) for i, c in enumerate(cnts) if cv2.contourArea(c) > (300 if hier[0][i][3] >= 0 else 150))
json.dump({'w': round((x1 - x0) * s), 'h': 1000, 'd': d}, open(sys.argv[2], 'w'))
prev = np.full(sm.shape + (3,), 210, np.uint8); prev[sm > 0] = (8, 8, 8); cv2.imwrite(sys.argv[2].replace('.json', '.png'), prev)
print('ok', round((x1 - x0) * s))
