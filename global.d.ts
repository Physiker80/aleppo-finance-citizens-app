declare module 'pdfjs-dist' {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(src: any): { promise: Promise<any> };
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
  const url: string;
  export default url;
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?worker' {
  const WorkerCtor: { new (): Worker };
  export default WorkerCtor;
}
