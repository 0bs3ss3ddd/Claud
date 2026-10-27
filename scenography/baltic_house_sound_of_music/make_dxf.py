"""Габаритные чертежи декораций «Звуки музыки» для большой сцены «Балтийского дома».

Генерирует DXF (AutoCAD 2013, мм, 1 ед. = 1 мм, модель 1:1, листы А0 под печать 1:50)
и PNG-превью каждого листа.  Параметры сцены вынесены в STAGE — при получении
техпаспорта сцены поправьте их и перезапустите:  python3 make_dxf.py
"""
import math
import os

import ezdxf
from ezdxf import units
from ezdxf.enums import TextEntityAlignment as TA

OUT = os.path.dirname(os.path.abspath(__file__))
S = 50                       # масштаб печати 1:50 — все «бумажные» мм умножаются на S
SHEET_W, SHEET_H = 1189 * S, 841 * S   # А0 альбомный
SHEET_GAP = 5000

# ---------------------------------------------------------------- сцена (ПРИНЯТО УСЛОВНО)
STAGE = dict(
    portal_w=13000,     # ширина зеркала сцены
    portal_h=8000,      # высота зеркала сцены
    portal_thk=800,     # толщина портальной стены
    half_w=12000,       # от оси сцены до боковой стены
    depth=15000,        # от красной линии до задней стены
    wall=500,           # толщина стен сценической коробки (условно)
    avan=2200,          # глубина авансцены от портальной стены
    avan_sag=1000,      # стрела дуги авансцены
    curtain_y=300,      # линия противопожарного занавеса
    backdrop_y=13000,   # чёрный задник (одежда сцены)
)

# ---------------------------------------------------------------- документ
doc = ezdxf.new("R2013", setup=True)
doc.units = units.MM
doc.header["$INSUNITS"] = 4
doc.header["$MEASUREMENT"] = 1
doc.header["$LTSCALE"] = S
doc.styles.add("RU", font="arial.ttf").dxf.width = 0.9

doc.linetypes.add("GOST_AXIS", pattern=[18.5, 12, -3, 0.5, -3], description="Штрихпунктирная тонкая ___ . ___")
doc.linetypes.add("GOST_HIDDEN", pattern=[8, 5, -3], description="Штриховая _ _ _")
doc.linetypes.add("GOST_PHANTOM", pattern=[24, 15, -3, 0.5, -3, 0.5, -2], description="Штрихпунктирная с двумя точками")

LAYERS = {
    "РАМКА": (7, 50, "Continuous"),
    "СЦЕНА": (8, 50, "Continuous"),
    "СЦЕНА_ТОНК": (8, 18, "Continuous"),
    "ПОРТАЛ": (1, 35, "GOST_PHANTOM"),
    "ОСИ": (1, 18, "GOST_AXIS"),
    "ДЕКОРАЦИЯ": (7, 50, "Continuous"),
    "ДЕКОР_ДЕТАЛИ": (4, 18, "Continuous"),
    "ПОДИУМЫ": (3, 35, "Continuous"),
    "МЕБЕЛЬ": (6, 25, "Continuous"),
    "НЕВИДИМЫЕ": (8, 18, "GOST_HIDDEN"),
    "ШТРИХОВКА": (8, 13, "Continuous"),
    "РАЗМЕРЫ": (2, 18, "Continuous"),
    "ТЕКСТ": (7, 25, "Continuous"),
}
for name, (color, lw, lt) in LAYERS.items():
    doc.layers.add(name, color=color, linetype=lt, lineweight=lw)

ds = doc.dimstyles.new("GOST_1-50")
ds.dxf.dimtxsty = "RU"
ds.dxf.dimtxt = 3.5
ds.dxf.dimtsz = 1.5          # засечки 45° вместо стрелок (строительный чертёж)
ds.dxf.dimasz = 2.5
ds.dxf.dimscale = S
ds.dxf.dimexe = 2
ds.dxf.dimexo = 1
ds.dxf.dimdle = 2
ds.dxf.dimgap = 1
ds.dxf.dimtad = 1
ds.dxf.dimtih = 0
ds.dxf.dimtoh = 0
ds.dxf.dimdec = 0
ds.dxf.dimlunit = 2
ds.dxf.dimclrd = 2
ds.dxf.dimclre = 2

msp = doc.modelspace()


# ---------------------------------------------------------------- примитивы
def line(a, b, layer, **kw):
    msp.add_line(a, b, dxfattribs={"layer": layer, **kw})


def poly(pts, layer, closed=True, **kw):
    msp.add_lwpolyline(pts, close=closed, dxfattribs={"layer": layer, **kw})


def text(p, s, h=3.5, layer="ТЕКСТ", align=TA.MIDDLE_CENTER, rot=0.0):
    t = msp.add_text(s, height=h * S, rotation=rot, dxfattribs={"layer": layer, "style": "RU"})
    t.set_placement(p, align=align)


def mtext(p, s, h=3.5, width=None, layer="ТЕКСТ"):
    m = msp.add_mtext(s, dxfattribs={"layer": layer, "style": "RU", "char_height": h * S})
    if width:
        m.dxf.width = width
    m.set_location(p, attachment_point=1)


def hatch(pts, pattern="SOLID", color=8, scale=1.0, angle=0.0):
    h = msp.add_hatch(color=color, dxfattribs={"layer": "ШТРИХОВКА"})
    if pattern != "SOLID":
        h.set_pattern_fill(pattern, scale=scale, angle=angle)
    h.paths.add_polyline_path(pts, is_closed=True)


def dim(p1, p2, base, angle=0):
    msp.add_linear_dim(base=base, p1=p1, p2=p2, angle=angle, dimstyle="GOST_1-50",
                       dxfattribs={"layer": "РАЗМЕРЫ"}).render()


def adim(p1, p2, dist):
    msp.add_aligned_dim(p1=p1, p2=p2, distance=dist, dimstyle="GOST_1-50",
                        dxfattribs={"layer": "РАЗМЕРЫ"}).render()


def level(p, z_mm, left=False):
    """Отметка уровня по ГОСТ 21.101: треугольник, полка, значение в метрах."""
    x, y = p
    k = -1 if left else 1
    poly([(x, y), (x - 1.5 * S, y + 2.5 * S), (x + 1.5 * S, y + 2.5 * S)], "РАЗМЕРЫ")
    line((x, y + 2.5 * S), (x + k * 14 * S, y + 2.5 * S), "РАЗМЕРЫ")
    s = "±0,000" if z_mm == 0 else f"{z_mm / 1000:+.3f}".replace(".", ",")
    text((x + k * 7.5 * S, y + 3.4 * S), s, 3.0, "РАЗМЕРЫ", TA.BOTTOM_CENTER)


def bubble(p, n, target):
    line(target, p, "ТЕКСТ")
    msp.add_circle(p, 4 * S, dxfattribs={"layer": "ТЕКСТ"})
    text(p, str(n), 4)


# ---------------------------------------------------------------- элементы декорации
class Flat:
    """Щит (плоская декорация). Профиль и проёмы — в локальных координатах (u вдоль щита, h вверх)."""

    def __init__(self, name, p0, p1, profile, base=0, openings=(), panels=(), bands=(),
                 stripes=0, thk=100, note="", main=False):
        self.name, self.p0, self.p1 = name, p0, p1
        self.profile, self.base = profile, base
        self.openings, self.panels, self.bands = openings, panels, bands
        self.stripes, self.thk, self.note, self.main = stripes, thk, note, main
        dx, dy = p1[0] - p0[0], p1[1] - p0[1]
        self.L = math.hypot(dx, dy)
        self.c = (dx / self.L, dy / self.L)
        self.hmax = max(h for _, h in profile)

    def top_at(self, u):
        pts, best = self.profile, 0
        for (u0, h0), (u1, h1) in zip(pts, pts[1:] + pts[:1]):
            if u0 != u1 and min(u0, u1) <= u <= max(u0, u1):
                best = max(best, h0 + (h1 - h0) * (u - u0) / (u1 - u0))
        return best

    def ex(self, u):
        return self.p0[0] + u * self.c[0]

    def dep(self, u):
        return self.p0[1] + u * self.c[1]

    def size(self):
        return f"{self.L:.0f}×{self.thk}×{self.hmax}"

    def where(self):
        return f"X {self.p0[0]:+.0f}…{self.p1[0]:+.0f}; Y {self.p0[1]:.0f}…{self.p1[1]:.0f}"


def opening_outline(o):
    u, z, w, h = o["u"], o["z"], o["w"], o["h"]
    if o["kind"] == "arch":
        r = w * 0.2
        top = [(u + w * t / 16, z + h - r + r * math.sqrt(max(0.0, 1 - (2 * t / 16 - 1) ** 2)))
               for t in range(17)]
        return [(u, z)] + top + [(u + w, z)]
    return [(u, z), (u, z + h), (u + w, z + h), (u + w, z)]


def opening_inner_lines(o):
    """Импосты/переплёты: возвращает отрезки в локальных координатах."""
    u, z, w, h = o["u"], o["z"], o["w"], o["h"]
    cols, rows, segs = o.get("cols", 0), o.get("rows", 0), []
    if o["kind"] == "void":
        return segs
    rise = w * 0.2 if o["kind"] == "arch" else 0

    def top(uu):
        if not rise:
            return z + h
        t = (uu - u) / w
        return z + h - rise + rise * math.sqrt(max(0.0, 1 - (2 * t - 1) ** 2))

    for i in range(1, cols):
        uu = u + w * i / cols
        segs.append(((uu, z), (uu, top(uu))))
    for j in range(1, rows):
        zz = z + (h - rise) * j / rows
        segs.append(((u, zz), (u + w, zz)))
    if o["kind"] == "door":
        segs.append(((u + w / 2, z), (u + w / 2, z + h)))
    return segs


class Prop:
    """Объёмный элемент: подиум, мебель, лестница. shape: ('rect',x0,y0,x1,y1) | ('circle',cx,cy,r) | ('poly',[...])."""

    def __init__(self, name, shape, h, base=0, layer="МЕБЕЛЬ", qty=1, size=None, note="",
                 front=None, side=None, extra_plan=None):
        self.name, self.shape, self.h, self.base, self.layer = name, shape, h, base, layer
        self.qty, self._size, self.note = qty, size, note
        self.front, self.side, self.extra_plan = front, side, extra_plan

    def bbox(self):
        s = self.shape
        if s[0] == "rect":
            return s[1], s[2], s[3], s[4]
        if s[0] == "circle":
            return s[1] - s[3], s[2] - s[3], s[1] + s[3], s[2] + s[3]
        xs, ys = [p[0] for p in s[1]], [p[1] for p in s[1]]
        return min(xs), min(ys), max(xs), max(ys)

    def size(self):
        if self._size:
            return self._size
        x0, y0, x1, y1 = self.bbox()
        if self.shape[0] == "circle":
            return f"Ø{2 * self.shape[3]:.0f}, h={self.h}"
        return f"{x1 - x0:.0f}×{y1 - y0:.0f}×{self.h}"

    def where(self):
        x0, y0, x1, y1 = self.bbox()
        return f"X {x0:+.0f}…{x1:+.0f}; Y {y0:.0f}…{y1:.0f}"


# ---------------------------------------------------------------- лист
class Sheet:
    PX, PY = 15000, 6500         # (0;0) плана — пересечение оси сцены и красной линии
    EY = 27500                   # уровень планшета на главном виде и виде слева
    SX0 = 46500                  # вид слева: x = SX0 - Y

    def __init__(self, idx, total, title, short, flats, props, extra_notes=()):
        self.ox = idx * (SHEET_W + SHEET_GAP)
        self.oy = 0
        self.idx, self.total, self.title, self.short = idx, total, title, short
        self.flats, self.props, self.extra_notes = flats, props, extra_notes

    # координатные преобразования
    def P(self, x, y):
        return (self.ox + self.PX + x, self.oy + self.PY + y)

    def E(self, x, z):
        return (self.ox + self.PX + x, self.oy + self.EY + z)

    def V(self, y, z):
        return (self.ox + self.SX0 - y, self.oy + self.EY + z)

    # ------------------------------------------------ рамка и штамп
    def frame(self):
        ox, oy = self.ox, self.oy
        poly([(ox, oy), (ox + SHEET_W, oy), (ox + SHEET_W, oy + SHEET_H), (ox, oy + SHEET_H)], "РАМКА", lineweight=18)
        x0, y0, x1, y1 = ox + 20 * S, oy + 5 * S, ox + SHEET_W - 5 * S, oy + SHEET_H - 5 * S
        poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], "РАМКА")
        self.stamp(x1 - 185 * S, y0)

    def stamp(self, tx, ty):
        def L(a, b, c, d, thick=True):
            line((tx + a * S, ty + b * S), (tx + c * S, ty + d * S), "РАМКА", lineweight=50 if thick else 18)

        def T(x, y, s, h=2.5, align=TA.MIDDLE_LEFT):
            text((tx + x * S, ty + y * S), s, h, "ТЕКСТ", align)

        poly([(tx, ty), (tx + 185 * S, ty), (tx + 185 * S, ty + 55 * S), (tx, ty + 55 * S)], "РАМКА")
        for x in (7, 17, 40, 55, 65):
            L(x, 0, x, 55)
        for y in range(5, 55, 5):
            L(0, y, 65, y, thick=y in (30, 35))
        L(65, 40, 185, 40)
        L(65, 15, 185, 15)
        L(135, 0, 135, 40)
        L(135, 35, 185, 35)
        L(135, 20, 185, 20)
        L(150, 15, 150, 40)
        L(167, 20, 167, 40)
        for x in (140, 145):
            L(x, 20, x, 35, thick=False)
        L(155, 15, 155, 20)
        # подписи граф
        for x, s in ((3.5, "Изм."), (12, "Лист"), (28.5, "№ докум."), (47.5, "Подп."), (60, "Дата")):
            T(x, 32.5, s, 2.0, TA.MIDDLE_CENTER)
        for y, s in ((27.5, "Разраб."), (22.5, "Пров."), (17.5, "Т.контр."), (7.5, "Н.контр."), (2.5, "Утв.")):
            T(0.8, y, s, 2.2)
        T(17.8, 27.5, "Худ.-технолог", 2.0)
        T(142.5, 37.5, "Лит.", 2.5, TA.MIDDLE_CENTER)
        T(158.5, 37.5, "Масса", 2.5, TA.MIDDLE_CENTER)
        T(176, 37.5, "Масштаб", 2.5, TA.MIDDLE_CENTER)
        T(142.5, 27.5, "Э", 3.5, TA.MIDDLE_CENTER)
        T(158.5, 27.5, "—", 3.5, TA.MIDDLE_CENTER)
        T(176, 27.5, "1:50", 3.5, TA.MIDDLE_CENTER)
        T(136, 17.5, f"Лист {self.idx + 1}", 2.5)
        T(156, 17.5, f"Листов {self.total}", 2.5)
        T(125, 47.5, f"БД-ЗМ-0{self.idx + 1}.00.000 ГЧ", 6, TA.MIDDLE_CENTER)
        T(100, 34, "Мюзикл «Звуки музыки»", 3.5, TA.MIDDLE_CENTER)
        T(100, 28, self.short, 3.5, TA.MIDDLE_CENTER)
        T(100, 21, "Габаритный чертёж", 3.5, TA.MIDDLE_CENTER)
        T(100, 7.5, "Материалы — см. примечания", 2.5, TA.MIDDLE_CENTER)
        T(160, 10, "Театр-фестиваль", 2.5, TA.MIDDLE_CENTER)
        T(160, 6, "«Балтийский дом»", 2.5, TA.MIDDLE_CENTER)
        T(160, 2.2, "Санкт-Петербург", 2.5, TA.MIDDLE_CENTER)

    # ------------------------------------------------ сцена: план, главный вид, вид слева
    def stage_plan(self):
        st = STAGE
        hw, pw, d, w, pt = st["half_w"], st["portal_w"] / 2, st["depth"], st["wall"], st["portal_thk"]
        P = self.P
        walls = [
            [(-hw - w, d), (hw + w, d), (hw + w, d + w), (-hw - w, d + w)],
            [(-hw - w, -pt), (-hw, -pt), (-hw, d), (-hw - w, d)],
            [(hw, -pt), (hw + w, -pt), (hw + w, d), (hw, d)],
            [(-hw, -pt), (-pw, -pt), (-pw, 0), (-hw, 0)],
            [(pw, -pt), (hw, -pt), (hw, 0), (pw, 0)],
        ]
        for wpts in walls:
            pts = [P(*p) for p in wpts]
            poly(pts, "СЦЕНА")
            hatch(pts, "ANSI31", color=8, scale=S * 1.2)
        # авансцена
        y_edge = -pt - st["avan"] + st["avan_sag"]
        poly([P(-pw, -pt), P(-pw, y_edge)], "СЦЕНА", closed=False)
        poly([P(pw, -pt), P(pw, y_edge)], "СЦЕНА", closed=False)
        sag = st["avan_sag"]
        r = (pw ** 2 + sag ** 2) / (2 * sag)
        cy = y_edge - sag + r
        a = math.degrees(math.atan2(y_edge - cy, pw))
        msp.add_arc(P(0, cy), r, 180 - a, a, dxfattribs={"layer": "СЦЕНА"})
        text(P(0, -pt - st["avan"] + sag + 400), "АВАНСЦЕНА", 3.5)
        text(P(0, -pt - st["avan"] - 1900), "ЗРИТЕЛЬНЫЙ ЗАЛ", 5)
        # ось сцены, красная линия, занавес, задник
        line(P(0, -pt - st["avan"] - 800), P(0, d + w + 600), "ОСИ")
        text(P(250, d + w + 450), "Ось сцены", 3, align=TA.MIDDLE_LEFT)
        line(P(-hw, 0), P(hw, 0), "ПОРТАЛ", color=1)
        text(P(-hw + 300, 180), "Красная линия (створ портала)  Y=0", 3, align=TA.BOTTOM_LEFT)
        line(P(-pw, st["curtain_y"]), P(pw, st["curtain_y"]), "НЕВИДИМЫЕ", color=1)
        text(P(pw - 200, st["curtain_y"] + 180), "Линия противопожарного занавеса — не загромождать",
             2.5, align=TA.BOTTOM_RIGHT)
        line(P(-pw - 1500, st["backdrop_y"]), P(pw + 1500, st["backdrop_y"]), "НЕВИДИМЫЕ")
        text(P(0, st["backdrop_y"] + 200), "Чёрный задник (одежда сцены, по монтировке)", 3, align=TA.BOTTOM_CENTER)
        # дистанционная линейка, м
        xr = -hw + 400
        line(P(xr, 0), P(xr, d), "СЦЕНА_ТОНК")
        for m in range(0, int(d / 1000) + 1):
            ln = 350 if m % 5 else 600
            line(P(xr, m * 1000), P(xr + ln, m * 1000), "СЦЕНА_ТОНК")
            text(P(xr + 700, m * 1000), f"{m}", 3, align=TA.MIDDLE_LEFT)
        text(P(xr - 250, d / 2), "Дистанционная линейка от красной линии, м", 3, rot=90)
        # габариты сцены
        dim(P(-pw, -pt), P(pw, -pt), P(0, -pt - st["avan"] - 900))
        dim(P(-hw, 0), P(hw, 0), P(0, -pt - st["avan"] - 3000))
        dim(P(hw, 0), P(hw, d), P(hw + w + 2600, 0), angle=90)
        dim(P(hw, -pt), P(hw, 0), P(hw + w + 2600, 0), angle=90)

    def stage_front(self):
        st = STAGE
        pw, ph, hw = st["portal_w"] / 2, st["portal_h"], st["half_w"]
        E = self.E
        line(E(-hw, 0), E(hw, 0), "СЦЕНА", lineweight=70)
        poly([E(-pw, 0), E(-pw, ph), E(pw, ph), E(pw, 0)], "ПОРТАЛ", closed=False, color=1)
        line(E(0, -2600), E(0, ph + 900), "ОСИ")
        text(E(-pw + 200, ph - 400), "Контур зеркала сцены (портал)", 3, align=TA.MIDDLE_LEFT)
        dim(E(-pw, ph), E(pw, ph), E(0, ph + 600))
        dim(E(-pw, 0), E(-pw, ph), E(-pw - 1200, 0), angle=90)
        level(E(-hw + 300, 0), 0)
        text(E(-hw + 300, -500), "Уровень планшета", 2.5, align=TA.TOP_LEFT)

    def stage_side(self):
        st = STAGE
        V = self.V
        pt, d, ph = st["portal_thk"], st["depth"], st["portal_h"]
        y_front = -pt - st["avan"]
        line(V(y_front, 0), V(d, 0), "СЦЕНА", lineweight=70)
        pts = [V(-pt, ph), V(0, ph), V(0, ph + 1500), V(-pt, ph + 1500)]
        poly(pts, "СЦЕНА")
        hatch(pts, "ANSI31", color=8, scale=S * 1.2)
        line(V(0, ph), V(0, 0), "ПОРТАЛ", color=1)
        line(V(d, 0), V(d, ph + 1500), "СЦЕНА")
        line(V(st["backdrop_y"], 0), V(st["backdrop_y"], ph), "НЕВИДИМЫЕ")
        text(V(-pt / 2, ph + 1900), "Портал", 3)
        text(V(d - 150, ph + 1900), "Задняя стена", 3)
        text(V(y_front + 150, -450), "Зал →", 3, align=TA.TOP_RIGHT)
        dim(V(0, 0), V(d, 0), V(0, -1500))
        dim(V(0, 0), V(0, ph), V(-1100, 0), angle=90)

    # ------------------------------------------------ щиты
    def draw_flat(self, f, n):
        P, E, V = self.P, self.E, self.V
        # план
        nx, ny = -f.c[1], f.c[0]
        if ny < 0 or (ny == 0 and nx < 0):
            nx, ny = -nx, -ny
        a, b = f.p0, f.p1
        pts = [P(*a), P(*b), P(b[0] + nx * f.thk, b[1] + ny * f.thk), P(a[0] + nx * f.thk, a[1] + ny * f.thk)]
        poly(pts, "ДЕКОРАЦИЯ")
        hatch(pts, "SOLID", color=8)
        for o in f.openings:   # проёмы на плане — засечки
            for uu in (o["u"], o["u"] + o["w"]):
                q = (a[0] + f.c[0] * uu, a[1] + f.c[1] * uu)
                line(P(q[0] - nx * 150, q[1] - ny * 150), P(q[0] + nx * (f.thk + 150), q[1] + ny * (f.thk + 150)),
                     "ДЕКОР_ДЕТАЛИ")
        adim(P(*a), P(*b), -500 if f.c[0] >= 0 else 500)   # размер — со стороны зала
        mid = (a[0] + f.c[0] * f.L * 0.5 + nx * 1300, a[1] + f.c[1] * f.L * 0.5 + ny * 1300)
        bubble(P(*mid), n, P(a[0] + f.c[0] * f.L * 0.5 + nx * f.thk, a[1] + f.c[1] * f.L * 0.5 + ny * f.thk))

        # главный вид
        def LE(u, h):
            return E(f.ex(u), f.base + h)

        poly([LE(u, h) for u, h in f.profile], "ДЕКОРАЦИЯ")
        for o in f.openings:
            out = [LE(u, h) for u, h in opening_outline(o)]
            poly(out, "ДЕКОРАЦИЯ", closed=True, lineweight=35)
            if o["kind"] == "void":
                hatch(out, "ANSI37", color=8, scale=S * 0.8)
            for p, q in opening_inner_lines(o):
                line(LE(*p), LE(*q), "ДЕКОР_ДЕТАЛИ")
        for pn in f.panels:
            u, z, w, h = pn
            poly([LE(u, z), LE(u + w, z), LE(u + w, z + h), LE(u, z + h)], "ДЕКОР_ДЕТАЛИ")
            poly([LE(u + 80, z + 80), LE(u + w - 80, z + 80), LE(u + w - 80, z + h - 80), LE(u + 80, z + h - 80)],
                 "ДЕКОР_ДЕТАЛИ")
        for zb in f.bands:
            u0 = next(u for u in range(0, int(f.L) + 1, 10) if f.top_at(u) >= zb)
            u1 = next(u for u in range(int(f.L), -1, -10) if f.top_at(u) >= zb)
            line(LE(u0, zb), LE(u1, zb), "ДЕКОР_ДЕТАЛИ")
        if f.stripes:
            u = f.stripes / 2
            while u < f.L:
                segs = [(0, f.top_at(u) - 60)]
                for o in f.openings:
                    if o["u"] - 120 <= u <= o["u"] + o["w"] + 120:
                        new = []
                        for z0, z1 in segs:
                            if z1 <= o["z"] or z0 >= o["z"] + o["h"]:
                                new.append((z0, z1))
                            else:
                                if z0 < o["z"]:
                                    new.append((z0, o["z"] - 60))
                                if z1 > o["z"] + o["h"]:
                                    new.append((o["z"] + o["h"] + 60, z1))
                        segs = new
                for z0, z1 in segs:
                    if z1 > z0:
                        line(LE(u, max(z0, 60)), LE(u, z1), "ДЕКОР_ДЕТАЛИ", linetype="GOST_HIDDEN")
                u += f.stripes
        top_u = max(f.profile, key=lambda p: p[1])[0]
        level(LE(min(max(top_u, 150), f.L - 150), f.hmax), f.base + f.hmax, left=f.c[0] < 0.5 and top_u > f.L / 2)
        bubble(E(f.ex(f.L / 2), f.base + f.hmax + 1400), n, LE(f.L / 2, f.top_at(f.L / 2)))
        if f.main:
            for o in f.openings:
                dim(LE(o["u"], o["z"]), LE(o["u"] + o["w"], o["z"]), LE(o["u"], o["z"] - 250 if o["z"] > 400 else -350))
                dim(LE(o["u"] + o["w"], o["z"]), LE(o["u"] + o["w"], o["z"] + o["h"]),
                    LE(o["u"] + o["w"] + 250, 0), angle=90)

        # вид слева
        if abs(f.c[1]) < 1e-6:
            hz = f.base + f.hmax
            pts = [V(f.p0[1], f.base), V(f.p0[1] + f.thk, f.base), V(f.p0[1] + f.thk, hz), V(f.p0[1], hz)]
            poly(pts, "ДЕКОРАЦИЯ")
            hatch(pts, "SOLID", color=8)
        else:
            poly([V(f.dep(u), f.base + h) for u, h in f.profile], "ДЕКОРАЦИЯ")

    # ------------------------------------------------ объёмные элементы
    def draw_prop(self, p, n):
        P, E, V = self.P, self.E, self.V
        s = p.shape
        if s[0] == "rect":
            poly([P(s[1], s[2]), P(s[3], s[2]), P(s[3], s[4]), P(s[1], s[4])], p.layer)
        elif s[0] == "circle":
            msp.add_circle(P(s[1], s[2]), s[3], dxfattribs={"layer": p.layer})
        else:
            poly([P(*q) for q in s[1]], p.layer)
        if p.extra_plan:
            p.extra_plan(self)
        x0, y0, x1, y1 = p.bbox()
        if p.layer == "ПОДИУМЫ":
            pts = [P(*q) for q in (s[1] if s[0] == "poly" else [(x0, y0), (x1, y0), (x1, y1), (x0, y1)])]
            hatch(pts, "ANSI31", color=3, scale=S * 2.5, angle=90)
            bubble(P(x0 + 600, y0 - 900), n, P(x0 + 600, y0 + 150))
            level(P(x0 + 1300, y0 + 250), p.base + p.h)
        else:
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            bubble(P(cx, y0 - 1000), n, P(cx, y0 + (y1 - y0) * 0.3))
        # главный вид
        if p.front:
            p.front(self)
        else:
            poly([E(x0, p.base), E(x1, p.base), E(x1, p.base + p.h), E(x0, p.base + p.h)], p.layer)
        # вид слева
        if p.side:
            p.side(self)
        else:
            poly([V(y0, p.base), V(y1, p.base), V(y1, p.base + p.h), V(y0, p.base + p.h)], p.layer)

    # ------------------------------------------------ спецификация и примечания
    def spec(self, rows):
        x1 = self.ox + SHEET_W - 5 * S
        x0 = x1 - 185 * S
        rh = 8 * S
        cols = [0, 10, 70, 110, 120, 185]
        heads = ["Поз.", "Наименование", "Габариты Д×Т×В, мм", "Кол.", "Привязка, мм"]
        y_top = self.oy + 5 * S + 55 * S + 10 * S + rh * (len(rows) + 1)
        text((x0 + 92.5 * S, y_top + 6 * S), "СПЕЦИФИКАЦИЯ ЭЛЕМЕНТОВ ДЕКОРАЦИИ", 5)
        for i in range(len(rows) + 2):
            line((x0, y_top - i * rh), (x1, y_top - i * rh), "РАМКА", lineweight=50 if i < 2 or i == len(rows) + 1 else 18)
        for c in cols:
            line((x0 + c * S, y_top), (x0 + c * S, y_top - rh * (len(rows) + 1)), "РАМКА")
        for c, (a, b) in enumerate(zip(cols, cols[1:])):
            text((x0 + (a + b) / 2 * S, y_top - rh / 2), heads[c], 2.5)
        for r, row in enumerate(rows):
            y = y_top - rh * (r + 1.5)
            for c, (a, b) in enumerate(zip(cols, cols[1:])):
                if c in (1, 4):
                    text((x0 + (a + 1.5) * S, y), row[c], 2.5 if c == 1 else 2.2, align=TA.MIDDLE_LEFT)
                else:
                    text((x0 + (a + b) / 2 * S, y), row[c], 2.5)

    def notes(self):
        st = STAGE
        base = [
            "1. Размеры в миллиметрах, отметки — в метрах. Модель в DXF выполнена 1:1, печать в масштабе 1:50 (лист А0).",
            "2. Система координат монтировки: X — от оси сцены (минус — левая сторона от зрителя, плюс — правая), "
            "Y — от красной линии в глубину сцены, отметки — от уровня планшета ±0,000.",
            f"3. Параметры сцены (зеркало {st['portal_w']}×{st['portal_h']}, глубина {st['depth']}, "
            f"ширина {2 * st['half_w']}) ПРИНЯТЫ УСЛОВНО — уточнить по техническому паспорту большой сцены "
            "«Балтийского дома» (технический отдел театра) и проверить вписывание декорации.",
            "4. Габариты элементов определены по фотофиксации спектакля (масштаб по росту исполнителей), "
            "допуск ±5 %; уточнить при разработке рабочих чертежей.",
            "5. Щиты: каркас — брус хвойный 50×100 (сорт 1-2, влажн. ≤12 %), обшивка — фанера ФК 6 мм / бязь по каркасу, "
            "фактура и роспись — по эскизу художника. Крепление к планшету — откосы с грузами / уголки на саморезах.",
            "6. Подиумы — станки на каркасе из бруса 50×100 или стальной трубы 40×40, настил — фанера ФСФ 18 мм, "
            "покрытие — чёрный линолеум / роспись; нагрузка не менее 400 кгс/м².",
            "7. Все деревянные элементы и ткани — огнезащитная обработка с оформлением актов (ППР РФ, ГОСТ Р 53292). "
            "Не загромождать линию противопожарного занавеса и проходы вдоль стен сцены (не менее 1000 мм).",
        ]
        txt = "\\P".join(base + list(self.extra_notes))
        x = self.ox + 30000
        y = self.oy + 21500
        text((x, y + 700), "ПРИМЕЧАНИЯ", 5, align=TA.BOTTOM_LEFT)
        mtext((x, y), txt, 3.0, width=18500)

    # ------------------------------------------------ сборка листа
    def build(self):
        self.frame()
        text((self.ox + SHEET_W / 2, self.oy + SHEET_H - 18 * S),
             f"«ЗВУКИ МУЗЫКИ». {self.title}", 10)
        text((self.ox + SHEET_W / 2, self.oy + SHEET_H - 32 * S),
             "Габаритный чертёж декорации на большой сцене театра-фестиваля «Балтийский дом», Санкт-Петербург", 5)
        self.stage_plan()
        self.stage_front()
        self.stage_side()
        rows, n = [], 1
        for f in self.flats:
            self.draw_flat(f, n)
            rows.append((str(n), f.name, f.size(), "1", f.where()))
            n += 1
        for p in self.props:
            self.draw_prop(p, n)
            rows.append((str(n), p.name, p.size(), str(p.qty), p.where()))
            n += 1
        self.set_dims()
        self.spec(rows)
        self.notes()
        st = STAGE
        text(self.P(0, st["depth"] + st["wall"] + 1300), "ПЛАН СЦЕНЫ  М 1:50", 7)
        text(self.E(0, st["portal_h"] + 2300), "ГЛАВНЫЙ ВИД (из зрительного зала)  М 1:50", 7)
        text(self.V(st["depth"] / 2 - 1500, st["portal_h"] + 3300), "ВИД СЛЕВА  М 1:50", 7)

    def set_dims(self):
        P, E = self.P, self.E
        xs = []
        for f in self.flats:
            xs += [f.p0[0], f.p1[0]]
        ys = []
        for f in self.flats:
            ys += [f.p0[1], f.p1[1], f.p0[1] + f.thk]
        for p in self.props:
            x0, y0, x1, y1 = p.bbox()
            xs += [x0, x1]
            ys += [y0, y1]
        xmin, xmax, ymin, ymax = min(xs), max(xs), min(ys), max(ys)
        st = STAGE
        yb = -st["portal_thk"] - st["avan"] - 1950
        dim(P(xmin, ymin), P(0, 0), P(0, yb))
        dim(P(0, 0), P(xmax, ymin), P(0, yb))
        xr = st["half_w"] + st["wall"] + 1200
        dim(P(xmax, 0), P(xmax, ymin), P(xr, 0), angle=90)
        dim(P(xmax, 0), P(xmax, ymax), P(xr + 900, 0), angle=90)
        # главный вид: цепочка по щитам
        fx = sorted({round(v) for f in self.flats for v in (f.p0[0], f.p1[0])} | {0})
        for a, b in zip(fx, fx[1:]):
            dim(E(a, 0), E(b, 0), E(0, -1000))
        dim(E(xmin, 0), E(xmax, 0), E(0, -1900))


# ================================================================ КАРТИНА 1 — ТЕРРАСА ВИЛЛЫ
def rect_profile(L, h):
    return [(0, 0), (0, h), (L, h), (L, 0)]


def W(u, z, w, h, kind="win", cols=2, rows=6):
    return dict(u=u, z=z, w=w, h=h, kind=kind, cols=cols, rows=rows)


def chair_front(cx, cy, base=0, back=950, seat=450, w=450):
    def f(sh):
        E = sh.E
        poly([E(cx - w / 2, base + back), E(cx + w / 2, base + back), E(cx + w / 2, base), E(cx + w / 2 - 40, base),
              E(cx + w / 2 - 40, base + seat), E(cx - w / 2 + 40, base + seat), E(cx - w / 2 + 40, base),
              E(cx - w / 2, base)], "МЕБЕЛЬ")
    return f


def table_front(cx, r, h, base=0):
    def f(sh):
        E = sh.E
        poly([E(cx - r, base + h), E(cx + r, base + h), E(cx + r, base + h - 40), E(cx - r, base + h - 40)], "МЕБЕЛЬ")
        line(E(cx, base), E(cx, base + h - 40), "МЕБЕЛЬ")
        line(E(cx - r * 0.6, base), E(cx + r * 0.6, base), "МЕБЕЛЬ")
    return f


def bench_front(x0, x1, h, base=0, leg=200):
    def f(sh):
        E = sh.E
        poly([E(x0, base + h), E(x1, base + h), E(x1, base + h - 80), E(x0, base + h - 80)], "МЕБЕЛЬ")
        for xl in (x0 + leg, x1 - leg - 120):
            poly([E(xl, base), E(xl, base + h - 80), E(xl + 120, base + h - 80), E(xl + 120, base)], "МЕБЕЛЬ",
                 closed=False)
    return f


podium1 = [(-900, 2100), (3000, 2100), (4300, 1400), (6000, 1400), (6000, 3100), (4400, 3100),
           (3300, 3800), (-900, 3800)]

scene1 = Sheet(
    0, 3, "КАРТИНА 1 — ТЕРРАСА ВИЛЛЫ ФОН ТРАППА", "Карт. 1 «Терраса виллы»",
    flats=[
        Flat("Щит фасада основной", (-600, 3600), (3200, 3600), rect_profile(3800, 6400), base=200, main=True,
             openings=[W(200, 300, 600, 2200, cols=2, rows=6),
                       W(1000, 0, 1200, 2700, "door", cols=4, rows=5),
                       W(2450, 0, 1000, 2700, "void"),
                       W(650, 3700, 2700, 2500, "arch", cols=7, rows=6)],
             bands=(3350, 6000)),
        Flat("Щит эркера угловой", (3200, 3600), (4300, 2900), rect_profile(1304, 6400), base=200,
             openings=[W(250, 300, 750, 2300, cols=2, rows=6), W(250, 3700, 750, 2400, cols=2, rows=6)],
             bands=(3350, 6000)),
        Flat("Щит стены боковой", (4300, 2900), (5700, 2900), rect_profile(1400, 5600), base=200,
             bands=(3350,)),
    ],
    props=[
        Prop("Подиум-терраса h=200", ("poly", podium1), 200, layer="ПОДИУМЫ", size="6900×2400×200",
             side=lambda sh: poly([sh.V(1400, 0), sh.V(3800, 0), sh.V(3800, 200), sh.V(1400, 200)], "ПОДИУМЫ")),
        Prop("Скамья садовая", ("rect", -4600, 2000, -2600, 2400), 450,
             front=bench_front(-4600, -2600, 450)),
        Prop("Стол садовый", ("circle", 4900, 2300, 300), 750, base=200, front=table_front(4900, 300, 750, 200)),
        Prop("Стул садовый (кованый)", ("rect", 5175, 2475, 5625, 2925), 950, base=200, qty=2,
             size="450×450×950", front=chair_front(5400, 2700, 200)),
    ],
    extra_notes=["8. Щиты поз. 1–3 устанавливаются на подиум поз. 4; остеклённая дверь поз. 1 — распашная, "
                 "проём поз. 1 — проходной (за ним чёрная выгородка)."],
)

# ================================================================ КАРТИНА 2 — ГОСТИНАЯ
STAIR = dict(x_land0=-3700, x_land1=-2700, y0=3000, y1=4100, fy0=3100, h=2400, risers=12, tread=250)


def stair_plan(sh):
    s, P = STAIR, sh.P
    x = s["x_land1"]
    for i in range(s["risers"] - 1):
        line(P(x + i * s["tread"], s["fy0"]), P(x + i * s["tread"], s["y1"]), "МЕБЕЛЬ")
    end = x + (s["risers"] - 1) * s["tread"]
    poly([P(s["x_land0"], s["y0"]), P(x, s["y0"]), P(x, s["fy0"]), P(end, s["fy0"])], "МЕБЕЛЬ", closed=False,
         lineweight=50)
    line(P(x + 200, s["fy0"] + 500), P(end - 200, s["fy0"] + 500), "МЕБЕЛЬ")
    text(P(end - 400, s["fy0"] + 650), "вниз", 2.5, align=TA.BOTTOM_RIGHT)
    line(P(end - 200, s["fy0"] + 500), P(end - 450, s["fy0"] + 620), "МЕБЕЛЬ")
    line(P(end - 200, s["fy0"] + 500), P(end - 450, s["fy0"] + 380), "МЕБЕЛЬ")


def stair_front(sh):
    s, E = STAIR, sh.E
    r = s["h"] / s["risers"]
    x = s["x_land1"]
    pts = [E(s["x_land0"], 0), E(s["x_land0"], s["h"]), E(x, s["h"])]
    for i in range(s["risers"] - 1):
        z = s["h"] - r * (i + 1)
        pts += [E(x + i * s["tread"], z), E(x + (i + 1) * s["tread"], z)]
    pts += [E(x + (s["risers"] - 1) * s["tread"], 0)]
    poly(pts, "ДЕКОРАЦИЯ")
    # перила h=900
    end = x + (s["risers"] - 1) * s["tread"]
    rail = [E(s["x_land0"], s["h"] + 900), E(x, s["h"] + 900), E(end, r + 900)]
    poly(rail, "ДЕКОРАЦИЯ", closed=False)
    for xb in range(s["x_land0"] + 100, int(end), 300):
        ztop = s["h"] + 900 if xb <= x else s["h"] + 900 - (xb - x) / (end - x) * (s["h"] - r)
        zbot = s["h"] if xb <= x else s["h"] - r * (1 + int((xb - x) / s["tread"]))
        line(E(xb, zbot), E(xb, ztop), "ДЕКОР_ДЕТАЛИ")
    level(E(s["x_land0"] + 150, s["h"]), s["h"], left=False)
    dim(E(s["x_land0"], 0), E(end, 0), E(0, -2700))


def stair_side(sh):
    s, V = STAIR, sh.V
    poly([V(s["y0"], 0), V(s["y1"], 0), V(s["y1"], s["h"] + 900), V(s["y0"], s["h"] + 900)], "ДЕКОРАЦИЯ")
    line(V(s["y0"], s["h"]), V(s["y1"], s["h"]), "ДЕКОР_ДЕТАЛИ")


podium2 = [(250, 3500), (1650, 3500), (3650, 2650), (3900, 3300), (1700, 4200), (250, 4200)]

panel = [(150, 1300, 2200, 4350)]
scene2 = Sheet(
    1, 3, "КАРТИНА 2 — ГОСТИНАЯ ВИЛЛЫ (САЛОН)", "Карт. 2 «Гостиная виллы»",
    flats=[
        Flat("Панно живописное левое", (-6400, 1200), (-3900, 1200), rect_profile(2500, 5800), panels=panel,
             bands=(1100, 1200), note="живопись"),
        Flat("Стена с росписью (за лестницей)", (-3700, 4200), (300, 4200), rect_profile(4000, 6400),
             panels=[(300, 5500, 1050, 650), (1500, 5500, 1050, 650), (2700, 5500, 1050, 650),
                     (300, 2700, 1100, 2550), (1550, 1200, 1100, 4050), (2800, 1200, 900, 4050)],
             bands=(900,)),
        Flat("Щит эркера прямой", (300, 4200), (1700, 4200), rect_profile(1400, 6400),
             openings=[W(250, 3600, 900, 2600, cols=3, rows=7)], bands=(900,)),
        Flat("Щит эркера угловой", (1700, 4200), (3900, 3300), rect_profile(2377, 6400), main=True,
             openings=[W(100, 400, 400, 2400, cols=1, rows=8), W(650, 0, 1200, 2900, "door", cols=4, rows=7),
                       W(1950, 400, 400, 2400, cols=1, rows=8), W(500, 3700, 1500, 2500, "arch", cols=4, rows=6)],
             bands=(900,)),
        Flat("Панно живописное правое", (3900, 1200), (6400, 1200), rect_profile(2500, 5800), panels=panel,
             bands=(1100, 1200)),
    ],
    props=[
        Prop("Лестница с галереей", ("rect", -3700, 3000, 50, 4100), 2400, layer="ДЕКОРАЦИЯ",
             size="3750×1100×2400(+900)", extra_plan=stair_plan, front=stair_front, side=stair_side),
        Prop("Подиум эркера h=150", ("poly", podium2), 150, layer="ПОДИУМЫ", size="3650×1550×150"),
        Prop("Диван (канапе)", ("rect", -3600, 2200, -1900, 2950), 900,
             front=lambda sh: poly([sh.E(-3600, 0), sh.E(-3600, 900), sh.E(-3450, 650), sh.E(-2050, 650),
                                    sh.E(-1900, 900), sh.E(-1900, 0)], "МЕБЕЛЬ")),
        Prop("Столик круглый", ("circle", -4250, 2550, 225), 700, front=table_front(-4250, 225, 700)),
        Prop("Стул", ("rect", 425, 3725, 875, 4075), 950, base=150, qty=2, size="450×450×950",
             front=chair_front(650, 3900, 150)),
        Prop("Банкетка (скамья)", ("rect", 4200, 1500, 5800, 1900), 450, front=bench_front(4200, 5800, 450)),
    ],
    extra_notes=["8. Галерея лестницы — рабочая площадка исполнителя: перила h=900 с балясинами шагом ≤ 300, "
                 "настил ФСФ 21 мм, нагрузка ≥ 400 кгс/м², подступенки закрыты. Лестница по высоте 12 подъёмов × 200."],
)

# ================================================================ КАРТИНА 3 — ДЕТСКАЯ
def canopy_front(sh):
    E = sh.E
    b = 200
    poly([E(-600, b + 4200), E(800, b + 4200), E(800, b + 4450), E(-600, b + 4450)], "ДЕКОРАЦИЯ")
    for xs, xe in ((-600, -1350), (800, 1550)):
        poly([E(xs, b + 4200), E((xs + xe) / 2 + (xe - xs) * 0.15, b + 2400), E(xe, b + 600)], "ДЕКОР_ДЕТАЛИ",
             closed=False)
        poly([E(xs + (60 if xs < 0 else -60), b + 4200), E(xs + (xe - xs) * 0.25, b + 2000), E(xs, b + 600)],
             "ДЕКОР_ДЕТАЛИ", closed=False)
    level(E(800, b + 4450), b + 4450)


def portiere_front(sh):
    E = sh.E
    b = 200
    poly([E(-4150, b + 600), E(-4150, b + 3300), E(-2850, b + 3300), E(-2850, b + 600)], "ДЕКОР_ДЕТАЛИ")
    scallop = [E(-4150, b + 3300)]
    for i in range(6):
        x = -4150 + i * 1300 / 6
        scallop += [E(x + 1300 / 12, b + 2950), E(x + 1300 / 6, b + 3050)]
    poly(scallop, "ДЕКОР_ДЕТАЛИ", closed=False)
    for x in (-3850, -3150):
        line(E(x, b + 3000), E(x, b + 600), "ДЕКОР_ДЕТАЛИ")


def bed_front(sh):
    E = sh.E
    b = 200
    poly([E(-1500, b), E(-1500, b + 950), E(-1300, b + 950), E(-1300, b + 550), E(1500, b + 550),
          E(1500, b + 950), E(1700, b + 950), E(1700, b)], "МЕБЕЛЬ")


scene3 = Sheet(
    2, 3, "КАРТИНА 3 — ДЕТСКАЯ СПАЛЬНЯ", "Карт. 3 «Детская спальня»",
    flats=[
        Flat("Щит стены с фронтоном", (-4600, 2800), (-2400, 2800),
             [(0, 0), (0, 3800), (1100, 5000), (2200, 3800), (2200, 0)], base=200, main=True,
             openings=[W(750, 600, 700, 2300, cols=2, rows=5)], stripes=440),
        Flat("Щит стены со скатом", (-2400, 3400), (3600, 3400), [(0, 0), (0, 3600), (6000, 6300), (6000, 0)],
             base=200, stripes=500),
    ],
    props=[
        Prop("Подиум h=200", ("rect", -5200, 1900, 3700, 4300), 200, layer="ПОДИУМЫ"),
        Prop("Кровать-оттоманка", ("rect", -1500, 2450, 1700, 3350), 950, base=200, front=bed_front),
        Prop("Балдахин (карниз, драпировки)", ("rect", -600, 3150, 800, 3400), 4450, base=200,
             size="1400×250×450", layer="ДЕКОРАЦИЯ", front=canopy_front,
             side=lambda sh: poly([sh.V(3150, 4400), sh.V(3400, 4400), sh.V(3400, 4650), sh.V(3150, 4650)],
                                  "ДЕКОРАЦИЯ")),
        Prop("Портьеры с ламбрекеном", ("rect", -4150, 2650, -2850, 2800), 3300, base=200,
             size="1300×150×2700", layer="ДЕКОР_ДЕТАЛИ", front=portiere_front),
        Prop("Банкетка", ("rect", -5000, 1200, -4300, 1650), 450, qty=2, size="700×450×450",
             extra_plan=lambda sh: poly([sh.P(2700, 1200), sh.P(3400, 1200), sh.P(3400, 1650), sh.P(2700, 1650)],
                                        "МЕБЕЛЬ"),
             front=lambda sh: (bench_front(-5000, -4300, 450, leg=60)(sh), bench_front(2700, 3400, 450, leg=60)(sh))),
    ],
    extra_notes=["8. Обои — роспись по бязи/фанере (вертикальный растительный орнамент, шаг ≈ 440–500), "
                 "показан условно штриховыми линиями. Балдахин (низ карниза +4,400, верх +4,650) подвешивается на штанкет или крепится к щиту поз. 2.",
                 "9. Банкетки поз. 7 — 2 шт.: левая X −5000…−4300, правая X +2700…+3400, Y 1200…1650."],
)

for sh in (scene1, scene2, scene3):
    sh.build()

dxf_path = os.path.join(OUT, "BaltDom_SoundOfMusic_gabarit.dxf")
doc.saveas(dxf_path)
print("saved", dxf_path)

# ---------------------------------------------------------------- PNG-превью
if os.environ.get("NO_PREVIEW") != "1":
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from ezdxf.addons.drawing import Frontend, RenderContext
    from ezdxf.addons.drawing.config import BackgroundPolicy, ColorPolicy, Configuration
    from ezdxf.addons.drawing.matplotlib import MatplotlibBackend

    for i, sh in enumerate((scene1, scene2, scene3)):
        fig = plt.figure(figsize=(23.4, 16.6))
        ax = fig.add_axes([0, 0, 1, 1])
        cfg = Configuration(background_policy=BackgroundPolicy.WHITE, color_policy=ColorPolicy.COLOR,
                            lineweight_scaling=1.0, min_lineweight=0.12)
        Frontend(RenderContext(doc), MatplotlibBackend(ax), config=cfg).draw_layout(msp, finalize=False)
        ax.set_xlim(sh.ox, sh.ox + SHEET_W)
        ax.set_ylim(sh.oy, sh.oy + SHEET_H)
        ax.set_aspect("equal")
        ax.axis("off")
        png = os.path.join(OUT, f"preview_list{i + 1}.png")
        fig.savefig(png, dpi=110, facecolor="white")
        plt.close(fig)
        print("saved", png)
