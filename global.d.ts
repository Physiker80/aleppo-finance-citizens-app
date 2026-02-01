/// <reference types="vite/client" />
// Remove conflicting React module declarations - React 19 handles this automatically

// React Icons - Comprehensive declarations
/*
declare module 'react-icons' {
  import { ComponentType, SVGAttributes } from 'react';
  export interface IconBaseProps extends SVGAttributes<SVGElement> {
    className?: string;
    size?: string | number;
    color?: string;
    title?: string;
    style?: React.CSSProperties;
    attr?: React.SVGAttributes<SVGElement>;
  }
  export type IconType = ComponentType<IconBaseProps>;
}

declare module 'react-icons/fa' {
  import { IconType } from 'react-icons';
  export const FaCookie: IconType;
  export const FaTimes: IconType;
  export const FaShieldAlt: IconType;
  export const FaCog: IconType;
  export const FaCogs: IconType;
  export const FaChartBar: IconType;
  export const FaExclamationTriangle: IconType;
  export const FaInfoCircle: IconType;
  export const FaCheck: IconType;
  export const FaDatabase: IconType;
  export const FaLock: IconType;
  export const FaEye: IconType;
  export const FaDownload: IconType;
  export const FaPrint: IconType;
  export const FaChartLine: IconType;
  export const FaClock: IconType;
  export const FaUser: IconType;
  export const FaGlobe: IconType;
  export const FaMobileAlt: IconType;
  export const FaDesktop: IconType;
  export const FaSync: IconType;
  export const FaTrashAlt: IconType;
  export const FaWarning: IconType;
  export const FaBan: IconType;
  export const FaPlay: IconType;
  export const FaPause: IconType;
  export const FaStop: IconType;
  export const FaKey: IconType;
  export const FaHistory: IconType;
  export const FaSave: IconType;
  export const FaReset: IconType;
  export const FaRefresh: IconType;
}
*/

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

// Minimal fallback declaration for 'xlsx' (library ships its own types in many versions,
// but if TypeScript still complains we declare a loose module shape).
declare module 'xlsx' {
  export interface WorkBook { SheetNames: string[]; Sheets: Record<string, any>; }
  export interface WorkSheet { [cell: string]: any }
  export const utils: {
    json_to_sheet(data: any[], opts?: any): WorkSheet;
    book_new(): WorkBook;
    book_append_sheet(wb: WorkBook, ws: WorkSheet, name: string): void;
  };
  export function write(wb: WorkBook, opts: { bookType: string; type: string }): ArrayBuffer;
}

// OpenTelemetry optional modules (frontend) - suppress type errors when installed dynamically
declare module '@opentelemetry/sdk-trace-web';
declare module '@opentelemetry/sdk-trace-base';
declare module '@opentelemetry/exporter-trace-otlp-http';
declare module '@opentelemetry/resources';
declare module '@opentelemetry/semantic-conventions';
declare module '@opentelemetry/instrumentation';
declare module '@opentelemetry/instrumentation-fetch';
declare module '@opentelemetry/instrumentation-document-load';

// Extend Window for Hotjar minimal settings
interface Window { _hjSettings?: any; hj?: any }
