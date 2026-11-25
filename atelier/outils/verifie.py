import sys, json, numpy as np, cv2
F = json.load(open(sys.argv[1])); key = sys.argv[2]; f = F[key]
img = cv2.imread(f['src']); x0, y0, x1, y1 = f['crop']; z = float(sys.argv[4])
c = img[y0:y1, x0:x1].copy()
for L in f['lines']:
    p = np.array([[x - x0, y - y0] for x, y in L['pts']], np.int32)
    cv2.polylines(c, [p], L['closed'], (0, 255, 80), max(1, int(L['w'])))
for P in f['fills']:
    cv2.fillPoly(c, [np.array([[x - x0, y - y0] for x, y in P], np.int32)], (255, 200, 0))
cv2.imwrite(sys.argv[3], cv2.resize(c, None, fx=z, fy=z))
