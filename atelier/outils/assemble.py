# Assemble silhouettes.js : contour (d) + traits (lines) + aplats (fills), en coordonnées normalisées.
import json, sys
F = json.load(open('sil/features.json'))
src = {'naadrian': ('naadry', 'sil/naadry.json'), 'orques-arides': ('orc', 'sil/orc4.json'), 'nashmur': ('shark', 'sil/shark4.json')}
notes = {'naadrian': "Näadrian : crâne penché, grand col dressé, épaules dans la cape.",
         'orques-arides': "Orcs des terres arides : chignon, oreille pointue, défenses, épaulière à pointes et sa corne, épée dans le dos.",
         'nashmur': "Nash'mur : deux hommes-requins dos à dos, museaux levés, gueules dentées."}
out = []
for key, (fk, path) in src.items():
    f = F[fk]; d = json.load(open(path)); x0, y0, x1, y1 = f['crop']; s = 1000.0 / (y1 - y0)
    tr = lambda p: [round((p[0] - x0) * s), round((p[1] - y0) * s)]
    lines = [{'w': L['w'], 'closed': L['closed'], 'pts': [tr(p) for p in L['pts']]} for L in f['lines']]
    fills = [[tr(p) for p in P] for P in f['fills']]
    out.append(f"    // {notes[key]}\n    '{key}': {{ w: {d['w']}, h: 1000,\n      d: '{d['d']}',\n      lines: {json.dumps(lines)},\n      fills: {json.dumps(fills)} }},")
js = """// Eraser Arena — silhouettes des peuples, en ombre noire.
// Une silhouette par faction (clé = identifiant du logo de la faction), dans une boîte de w × 1000.
// Le contour est tiré d'une image d'inspiration et lissé ; les traits (lines) et aplats (fills)
// sont tracés à la main sur l'image et se dessinent dans la couleur du cadre.
(function (root) {
  'use strict';
  const SILHOUETTES = {
""" + "\n".join(out) + """
  };
  root.Silhouettes = { SILHOUETTES, get: (id) => SILHOUETTES[id] || null };
}(window));
"""
open(sys.argv[1], 'w').write(js); print('ok', len(js))
