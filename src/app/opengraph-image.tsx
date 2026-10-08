import { ImageResponse } from "next/og";

// Default social share card (og:image) for the whole site. Product pages set
// their own image (the product photo) in generateMetadata, which overrides this.
export const alt = "Ootybites — Taste of the Hills";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          // Nilgiri-green brand gradient (matches .bg-brand-gradient).
          backgroundImage: "linear-gradient(150deg, #22ab5f 0%, #166b3d 100%)",
          color: "#fff7ed",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 34,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#f6d873",
            marginBottom: 8,
          }}
        >
          Fresh from Ooty
        </div>
        <div style={{ fontSize: 132, fontWeight: 800, letterSpacing: -2 }}>
          Ootybites
        </div>
        <div
          style={{
            fontSize: 40,
            marginTop: 12,
            maxWidth: 900,
            textAlign: "center",
            color: "rgba(255,247,237,0.9)",
          }}
        >
          Nilgiri teas, varki, snacks, cold-pressed oils &amp; wild honey
        </div>
        <div
          style={{
            marginTop: 40,
            height: 6,
            width: 160,
            borderRadius: 6,
            backgroundColor: "#d98324",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
