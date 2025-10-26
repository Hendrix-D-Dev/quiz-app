declare module "textract" {
  interface Textract {
    fromBufferWithName(
      filename: string,
      buffer: Buffer,
      callback: (error: Error | null, text?: string) => void
    ): void;
  }

  const textract: Textract;
  export = textract;
}
