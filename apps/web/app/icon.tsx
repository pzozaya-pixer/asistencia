import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top left, rgba(14,116,144,0.35), transparent 28%), linear-gradient(180deg, #F8FBFE 0%, #DCECF8 100%)"
        }}
      >
        <div
          style={{
            display: "flex",
            height: 320,
            width: 320,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 88,
            background: "#102033",
            color: "#ffffff",
            fontSize: 160,
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
