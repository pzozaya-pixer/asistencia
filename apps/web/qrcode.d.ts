declare module "qrcode" {
  type QrColorConfig = {
    dark?: string;
    light?: string;
  };

  type QrToDataUrlOptions = {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
    width?: number;
    color?: QrColorConfig;
  };

  const QRCode: {
    toDataURL(text: string, options?: QrToDataUrlOptions): Promise<string>;
  };

  export default QRCode;
}
