import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#fffdf9"
        }}
      >
        <div
          style={{
            display: "flex",
            height: 124,
            width: 124,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 32,
            background: "#102033",
            color: "#ffffff",
            fontSize: 60,
            fontWeight: 700
          }}
        >
          A+
        </div>
      </div>
    ),
    size
  );
}
