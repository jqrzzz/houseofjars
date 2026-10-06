import { Art } from "../lib";

/** A Vientiane tuk-tuk: a canopy with a scalloped valance, two benches, a woven band, and its headlamp. */
export default function tuktuk(): Art {
  const a = new Art("tuktuk", [20, 118, 440, 226], [440, 226]);

  // The road and the shadow under the tuk-tuk.
  a.ellipse(250, 331, 196, 8, "s2");
  a.line([[24, 331], [456, 331]], "l");

  // By Evening, the headlamp throws its light ahead.
  a.open('class="ev"');
  a.add('<path class="hl" d="M92 228 20 214V262Z"/><path class="hl" d="M92 230 20 222V256Z"/><path class="hl" d="M92 232 20 230V250Z"/>');
  a.close();

  // The cab: roof posts, two benches, and the floor.
  a.path("M162 156V288M286 156V250M404 156V288", "l");
  a.rect(170, 206, 104, 24, "b f", { r: 6 });
  a.rect(296, 206, 102, 24, "b f", { r: 6 });
  a.path("M178 218H266M304 218H390", "h");
  a.rect(150, 286, 270, 12, "wd f", { r: 3, edge: "ed" });
  // A low side panel with a woven band.
  a.rect(156, 244, 252, 44, "w f", { r: 4, edge: "ew" });
  a.rect(156, 256, 252, 14, "a");
  let band = "";
  for (let x = 166; x < 404; x += 14) band += `M${x} 257.5l5.5 5.5-5.5 5.5-5.5-5.5Z`;
  a.path(band, "b");
  a.path("M156 256H408M156 270H408", "h");

  // The canopy: a terracotta roof and a scalloped jar-orange valance.
  a.path("M150 132H414C422 132 426 138 424 146L421 152H146L144 146C142 138 144 132 150 132Z", "r f", { edge: "ew" });
  let scallops = "M146 152";
  for (let x = 146; x < 421; x += 13.75) scallops += `a6.875 7 0 0 0 13.75 0`;
  a.path(scallops + "V152Z", "a f");

  // The front: forks, handlebar, the rider's seat and the headlamp.
  a.path("M154 288C132 288 118 268 116 246L104 218", "l");
  a.path("M96 206H120M108 206 104 218", "l");
  a.path("M128 252C132 240 150 236 160 240V262H134Z", "b f");
  a.path("M118 264C130 270 148 274 160 272", "h");
  a.halo(94, 234, 6, 5);
  a.path("M92 226C84 226 84 242 92 242H100V226Z", "y f");

  // Wheels, with hubs and a mudguard.
  const wheel = (x: number, y: number, r: number) => {
    a.circle(x, y, r, "b f");
    a.circle(x, y, r * 0.45, "c f");
    a.path(`M${x - r * 0.45} ${y}H${x + r * 0.45}M${x} ${y - r * 0.45}V${y + r * 0.45}`, "h");
    a.circle(x, y, 3, "k");
  };
  wheel(112, 304, 26);
  wheel(352, 300, 30);
  a.path("M318 300C322 278 382 278 386 300", "l");
  return a;
}
