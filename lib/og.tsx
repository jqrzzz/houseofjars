/* eslint-disable @next/next/no-img-element -- next/og (Satori) draws plain <img>; next/image does not apply here. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SCENE } from "@/components/art/mekong-dawn";
import { mekongDawnSvg } from "@/components/art/mekong-dawn-svg";
import { JAR_PATH, JAR_VIEWBOX_TIGHT } from "@/components/brand/jar-shape";
import { identity } from "@/content/identity";
import type { PageInfo } from "./site";

/*
 * Open Graph images, drawn at build time with the brand's own parts: the
 * jar mark, Young Serif, the hero's Mekong dawn with its stone jars, and the
 * woven band.
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
  saffronOnBrown: "#f2a948",
};

// Satori reads woff but not woff2; @fontsource ships both.
const displayFont = readFile(
  join(process.cwd(), "node_modules/@fontsource/young-serif/files/young-serif-latin-400-normal.woff"),
);
const textileTile = readFile(join(process.cwd(), "public/brand/textile-diamond.svg"), "utf8");

const svgData = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

function jarMarkSvg(fill: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${JAR_VIEWBOX_TIGHT}"><path d="${JAR_PATH}" fill="${fill}"/></svg>`;
}

/** The hero's woven band: saffron stepped diamonds on vest brown, from the same tile the site uses. */
async function bandSvg(width: number): Promise<string> {
  const tile = await textileTile;
  const [, , tileWidth, tileHeight] = (/viewBox="([^"]+)"/.exec(tile)?.[1] ?? "0 0 48 36").split(" ");
  const inner = tile
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replaceAll('stroke="#000"', `stroke="${color.saffronOnBrown}"`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${tileHeight}" viewBox="0 0 ${width} ${tileHeight}"><defs><pattern id="t" width="${tileWidth}" height="${tileHeight}" patternUnits="userSpaceOnUse"><g fill="${color.saffronOnBrown}">${inner}</g></pattern></defs><rect width="${width}" height="${tileHeight}" fill="${color.brown}"/><rect width="${width}" height="${tileHeight}" fill="url(#t)"/></svg>`;
}

/** The scene fills the card's width, its right edge on the card's; this many scene units show. */
const SCENE_SHOWN = 2000;
const SCENE_HEIGHT = Math.round((ogSize.width / SCENE_SHOWN) * SCENE.height);
const BAND_HEIGHT = 36;

export async function renderOgImage(page: PageInfo): Promise<ImageResponse> {
  const isHome = page.path === "/";
  const title = isHome ? "A calm house in the heart of Vientiane." : page.title;
  const eyebrow = isHome ? "Sabaidee" : page.nav ?? "House of Jars";
  const band = await bandSvg(ogSize.width);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: `linear-gradient(180deg, ${color.paper} 35%, #f6e2c4 88%)`,
          color: color.ink,
          fontFamily: "Young Serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "52px 72px 0" }}>
          <img src={svgData(jarMarkSvg(color.saffron))} width={52} height={52} alt="" />
          <div style={{ fontSize: 36 }}>{identity.name.value}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "0 72px", marginTop: 52, width: 780 }}>
          <div style={{ fontSize: 22, letterSpacing: 5, textTransform: "uppercase", color: color.saffronText }}>
            {eyebrow}
          </div>
          <div style={{ fontSize: title.length > 24 ? 64 : 80, lineHeight: 1.04, marginTop: 18 }}>{title}</div>
          <div style={{ fontSize: 24, marginTop: 22, color: color.soft }}>
            {`Owned and run by ${identity.owner.name.value} · ${identity.address.village.value}, Vientiane`}
          </div>
        </div>

        <img
          src={svgData(mekongDawnSvg(SCENE.width - SCENE_SHOWN))}
          width={ogSize.width}
          height={SCENE_HEIGHT}
          alt=""
          style={{ position: "absolute", left: 0, bottom: BAND_HEIGHT }}
        />
        <img
          src={svgData(band)}
          width={ogSize.width}
          height={BAND_HEIGHT}
          alt=""
          style={{ position: "absolute", left: 0, bottom: 0 }}
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
