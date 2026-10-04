/* eslint-disable @next/next/no-img-element -- next/og (Satori) draws plain <img>; next/image does not apply here. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ARCH_OUTLINE, MARK_PATH, MARK_VIEWBOX } from "@/components/brand/mark-shape";
import { identity } from "@/content/identity";
import type { PageInfo } from "./site";

/*
 * Open Graph images, drawn at build time with the house's own brand
 * (brand/README.md): the arch mark, Figtree, jar orange on rice, and a real
 * photograph of the dorms framed in the arch.
 */

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

const color = {
  rice: "#fbf6ee",
  ink: "#171713",
  soft: "#6b5645",
  orange: "#e76e43",
  orangeText: "#bf4a1b",
  white: "#ffffff",
};

// Satori reads woff but not woff2; @fontsource ships both.
const figtree = (weight: 500 | 700) =>
  readFile(join(process.cwd(), `node_modules/@fontsource/figtree/files/figtree-latin-${weight}-normal.woff`));
const fontBold = figtree(700);
const fontMedium = figtree(500);
const dormPhoto = readFile(join(process.cwd(), "public/photos/dorm-corridor-pods-and-window.jpg"));

const svgData = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

function markSvg(fill: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}"><path d="${MARK_PATH}" fill="${fill}"/></svg>`;
}

/** A photograph cropped to fill a 2:3 arch, like the website's ArchPhoto. */
function archPhotoSvg(jpeg: Buffer): string {
  const href = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 600 900">` +
    `<defs><clipPath id="a" clipPathUnits="objectBoundingBox"><path d="${ARCH_OUTLINE}"/></clipPath></defs>` +
    `<g clip-path="url(#a)"><rect width="600" height="900" fill="${color.ink}"/>` +
    `<image xlink:href="${href}" width="600" height="900" preserveAspectRatio="xMidYMid slice"/></g></svg>`
  );
}

const ARCH = { width: 360, height: 540 };

export async function renderOgImage(page: PageInfo, options: { eyebrow?: string } = {}): Promise<ImageResponse> {
  const isHome = page.path === "/";
  const title = isHome ? "A calm house in the heart of Vientiane." : page.title;
  const eyebrow = isHome ? "Sabaidee" : (options.eyebrow ?? page.nav ?? "House of Jars");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: color.rice,
          color: color.ink,
          fontFamily: "Figtree",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", padding: "56px 0 0 72px", width: 720 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src={svgData(markSvg(color.orange))} width={34} height={51} alt="" />
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>{identity.name.value}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 64 }}>
            <div style={{ fontSize: 26, fontWeight: 500, color: color.orangeText }}>{eyebrow}</div>
            <div
              style={{
                fontSize: title.length > 24 ? 64 : 80,
                fontWeight: 700,
                lineHeight: 1.04,
                letterSpacing: -1.5,
                marginTop: 14,
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: 24, fontWeight: 500, marginTop: 24, color: color.soft }}>
              {`${identity.address.village.value}, Vientiane · A team on site day and night`}
            </div>
          </div>
        </div>

        <img
          src={svgData(archPhotoSvg(await dormPhoto))}
          width={ARCH.width}
          height={ARCH.height}
          alt=""
          style={{ position: "absolute", right: 72, bottom: 0 }}
        />
        <div style={{ position: "absolute", left: 0, bottom: 0, width: 1200 - 72 - ARCH.width - 40, height: 12, background: color.orange }} />
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Figtree", data: await fontBold, weight: 700, style: "normal" },
        { name: "Figtree", data: await fontMedium, weight: 500, style: "normal" },
      ],
    },
  );
}

/** The home-screen icon and the logo search engines show: the white arch on jar orange. */
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
          background: color.orange,
        }}
      >
        <img src={svgData(markSvg(color.white))} width={size * 0.4} height={size * 0.6} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}
