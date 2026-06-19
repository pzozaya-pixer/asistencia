declare module "html5-qrcode" {
  export class Html5Qrcode {
    constructor(elementId: string, config?: { verbose?: boolean });
    start(
      cameraConfig: { facingMode?: string } | string,
      configuration: {
        fps?: number;
        qrbox?:
          | number
          | {
              width: number;
              height: number;
            };
        aspectRatio?: number;
      },
      qrCodeSuccessCallback: (decodedText: string) => void,
      qrCodeErrorCallback?: (errorMessage: string) => void
    ): Promise<null>;
    stop(): Promise<void>;
    clear(): Promise<void>;
    isScanning: boolean;
  }
}
