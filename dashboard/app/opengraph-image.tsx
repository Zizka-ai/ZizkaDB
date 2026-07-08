import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ZizkaDB by Zizka AI";

export default async function OpenGraphImage() {
  let logoSrc: string | null = null;
  try {
    const logoPath = join(process.cwd(), "public", "zizka-logo.png");
    const logoData = await readFile(logoPath);
    logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;
  } catch {
    // Missing/unreadable logo file — degrade to a text-only card instead of failing the whole image.
  }

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #0c1222 0%, #1e1b4b 100%)",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {logoSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoSrc}
          alt=""
          width={200}
          height={200}
          style={{ objectFit: "contain", marginBottom: 24 }}
        />
      )}
      <div style={{ fontSize: 56, fontWeight: 700 }}>ZizkaDB</div>
      <div
        style={{
          fontSize: 22,
          color: "#94a3b8",
          marginTop: 14,
          maxWidth: 800,
          textAlign: "center",
          lineHeight: 1.45,
        }}
      >
        Operational Database For AI Agents. Open source.
      </div>
    </div>,
    { ...size },
  );
}
