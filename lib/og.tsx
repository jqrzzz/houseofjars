/* eslint-disable @next/next/no-img-element -- next/og (Satori) draws plain <img>; next/image does not apply here. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { CLUSTER, jarTransform } from "@/components/brand/jar-cluster";
import { JAR_BODY, JAR_CARVE, JAR_PATH, JAR_VIEWBOX_TIGHT } from "@/components/brand/jar-shape";
import { identity } from "@/content/identity";
import type { PageInfo } from "./site";

/*
 * Open Graph images, drawn at build time with the brand's own parts: the
 * jar mark, Young Serif, the jars on the dawn horizon and the woven band.
 */

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

const color = {
  paper: "#fbf6ee",
  ink: "#231710",
  soft: "#6b5645",
  saffron: "#e8952b",
  saffronText: "#9a5608",
  brown: "#5b3a22",
  band: "#b7a68e",
  jars: ["#cdbfaa", "#b7a68e", "#9d8b73"],
};

// Satori reads woff but not woff2; @fontsource ships both.
const displayFont = readFile(
  join(process.cwd(), "node_modules/@fontsource/young-serif/files/young-serif-latin-400-normal.woff"),
);
const textileTile = readFile(join(process.cwd(), "public/brand/textile.svg"), "utf8");

const svgData = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

function jarMarkSvg(fill: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${JAR_VIEWBOX_TIGHT}"><path d="${JAR_PATH}" fill="${fill}"/></svg>`;
}

function clusterSvg(): string {
  const jars = CLUSTER.jars
    .map(
      (jar) =>
        `<g transform="${jarTransform(jar)}"><path d="${JAR_BODY}" fill="${color.jars[jar.tone - 1]}"/><path d="${JAR_CARVE}" fill="#140c06" fill-opacity="0.3"/></g>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CLUSTER.width} ${CLUSTER.height}">${jars}</svg>`;
}

/** The woven band, repeated from the same tile the site uses. */
async function bandSvg(width: number, fill: string): Promise<string> {
  const tile = (await textileTile)
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replaceAll('stroke="#000"', `stroke="${fill}"`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="28" viewBox="0 0 ${width} 28"><defs><pattern id="t" width="48" height="28" patternUnits="userSpaceOnUse"><g fill="${fill}">${tile}</g></pattern></defs><rect width="${width}" height="28" fill="url(#t)"/></svg>`;
}

export async function renderOgImage(page: PageInfo): Promise<ImageResponse> {
  const isHome = page.path === "/";
  const title = isHome ? "A calm house in the heart of Vientiane." : page.title;
  const eyebrow = isHome ? "Sabaidee" : page.nav ?? "House of Jars";
  const band = await bandSvg(ogSize.width, color.band);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: color.paper,
          color: color.ink,
          fontFamily: "Young Serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "56px 72px 0" }}>
          <img src={svgData(jarMarkSvg(color.saffron))} width={52} height={52} alt="" />
          <div style={{ fontSize: 36 }}>{identity.name.value}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "0 72px", marginTop: 64, width: 760 }}>
          <div style={{ fontSize: 22, letterSpacing: 5, textTransform: "uppercase", color: color.saffronText }}>
            {eyebrow}
          </div>
          <div style={{ fontSize: title.length > 24 ? 66 : 84, lineHeight: 1.04, marginTop: 20 }}>{title}</div>
        </div>

        <div style={{ position: "absolute", left: 72, bottom: 100, fontSize: 24, color: color.soft }}>
          {`Owned and run by ${identity.owner.name.value} · ${identity.address.village.value}, Vientiane`}
        </div>

        <img
          src={svgData(clusterSvg())}
          width={420}
          height={245}
          alt=""
          style={{ position: "absolute", right: 64, bottom: 70 }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 68,
            height: 3,
            background:
              "linear-gradient(90deg, rgba(255,107,53,0) 0%, #ff6b35 20%, #f7931e 50%, #fdb833 78%, rgba(253,184,51,0) 100%)",
          }}
        />
        <img
          src={svgData(band)}
          width={ogSize.width}
          height={28}
          alt=""
          style={{ position: "absolute", left: 0, bottom: 28 }}
        />
      </div>
    ),
    {
      ...ogSize,
      fonts: [{ name: "Young Serif", data: await displayFont, weight: 400, style: "normal" }],
    },
  );
}

/** The home-screen icon: the saffron jar on vest brown. */
export function renderAppleIcon(size: number): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: color.brown,
        }}
      >
        <img src={svgData(jarMarkSvg(color.saffron))} width={size * 0.64} height={size * 0.64} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}
