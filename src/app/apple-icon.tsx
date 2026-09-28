import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#050505",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="22" fill="none" stroke="#e3941a" strokeWidth="3.4" />
          <circle cx="32" cy="32" r="8" fill="none" stroke="#e3941a" strokeWidth="3" />
          <circle cx="32" cy="10" r="4.2" fill="#e3941a" />
          <circle cx="51" cy="43" r="4.2" fill="#e3941a" />
          <circle cx="13" cy="43" r="4.2" fill="#e3941a" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
