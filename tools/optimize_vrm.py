#!/usr/bin/env python3
"""Reduce el peso de un VRM recomprimiendo sus texturas.

- Elimina la imagen de miniatura (no la usa el render).
- Reescala cada textura a un maximo de 1024 px.
- Usa JPEG para texturas opacas y PNG para las que llevan alfa
  (ojos, pestañas, cejas, pelo) y para los normal maps.
Reescribe el GLB conservando la alineacion de 4 bytes de cada bufferView.
"""
import io
import json
import struct
import sys

from PIL import Image

MAX_SIDE = 1024
JPEG_Q = 88


def load_glb(path):
    raw = open(path, "rb").read()
    magic, version, total = struct.unpack("<4sII", raw[:12])
    assert magic == b"glTF" and version == 2, "no es un GLB valido"
    off = 12
    chunks = []
    while off < total:
        clen, ctype = struct.unpack("<I4s", raw[off:off + 8])
        chunks.append((ctype, raw[off + 8:off + 8 + clen]))
        off += 8 + clen
    js = json.loads(chunks[0][1].decode("utf-8"))
    bin_ = chunks[1][1] if len(chunks) > 1 else b""
    return js, bin_


def encode_image(data, mime):
    im = Image.open(io.BytesIO(data))
    im.load()
    has_alpha = im.mode in ("RGBA", "LA") or (
        im.mode == "P" and "transparency" in im.info
    )
    if has_alpha:
        im = im.convert("RGBA")
        # si el alfa es totalmente opaco, no hace falta conservarlo
        alpha = im.getchannel("A")
        if alpha.getextrema() == (255, 255):
            has_alpha = False
            im = im.convert("RGB")
    else:
        im = im.convert("RGB")

    w, h = im.size
    if max(w, h) > MAX_SIDE:
        scale = MAX_SIDE / float(max(w, h))
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)

    out = io.BytesIO()
    if has_alpha:
        im.save(out, format="PNG", optimize=True)
        return out.getvalue(), "image/png"
    im.save(out, format="JPEG", quality=JPEG_Q, optimize=True, progressive=True)
    return out.getvalue(), "image/jpeg"


def main(src, dst):
    js, bin_ = load_glb(src)
    views = js["bufferViews"]
    images = js.get("images", [])

    # indice de bufferView -> nueva imagen
    replaced = {}
    drop_views = set()
    for idx, im in enumerate(images):
        if im.get("name") == "Thumbnail":
            drop_views.add(im["bufferView"])
            im["_drop"] = True
            continue
        bv = views[im["bufferView"]]
        start = bv.get("byteOffset", 0)
        data = bin_[start:start + bv["byteLength"]]
        new_data, new_mime = encode_image(data, im.get("mimeType", "image/png"))
        replaced[im["bufferView"]] = new_data
        im["mimeType"] = new_mime
        print(f"  {im.get('name','?')[:30]:32s} {len(data):>9,} -> {len(new_data):>8,}  {new_mime}")

    # quitar imagenes marcadas y sus texturas
    js["images"] = [im for im in images if not im.get("_drop")]
    for im in js["images"]:
        im.pop("_drop", None)

    # reconstruir el buffer binario bufferView por bufferView
    new_bin = bytearray()
    new_views = []
    for i, bv in enumerate(views):
        if i in drop_views:
            new_views.append(None)
            continue
        if i in replaced:
            data = replaced[i]
        else:
            start = bv.get("byteOffset", 0)
            data = bin_[start:start + bv["byteLength"]]
        while len(new_bin) % 4:
            new_bin.append(0)
        nbv = dict(bv)
        nbv["byteOffset"] = len(new_bin)
        nbv["byteLength"] = len(data)
        new_bin.extend(data)
        new_views.append(nbv)

    # remapear indices de bufferView
    remap = {}
    compact = []
    for i, bv in enumerate(new_views):
        if bv is None:
            continue
        remap[i] = len(compact)
        compact.append(bv)
    js["bufferViews"] = compact

    def fix(obj):
        if isinstance(obj, dict):
            for k, v in list(obj.items()):
                if k == "bufferView" and isinstance(v, int):
                    obj[k] = remap[v]
                else:
                    fix(v)
        elif isinstance(obj, list):
            for v in obj:
                fix(v)

    fix(js)
    while len(new_bin) % 4:
        new_bin.append(0)
    js["buffers"] = [{"byteLength": len(new_bin)}]

    js_bytes = json.dumps(js, separators=(",", ":")).encode("utf-8")
    while len(js_bytes) % 4:
        js_bytes += b" "

    total = 12 + 8 + len(js_bytes) + 8 + len(new_bin)
    with open(dst, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        f.write(struct.pack("<I4s", len(js_bytes), b"JSON"))
        f.write(js_bytes)
        f.write(struct.pack("<I4s", len(new_bin), b"BIN\x00"))
        f.write(new_bin)

    print(f"\n{src}: {len(open(src,'rb').read()):,} bytes")
    print(f"{dst}: {total:,} bytes")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
