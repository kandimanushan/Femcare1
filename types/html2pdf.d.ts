declare module 'html2pdf.js' {
  interface Options {
    margin?: number | [number, number, number, number];
    filename?: string;
    image?: {
      type?: string;
      quality?: number;
    };
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
      logging?: boolean;
      letterRendering?: boolean;
      scrollY?: number;
      windowWidth?: number;
      windowHeight?: number;
    };
    jsPDF?: {
      unit?: string;
      format?: string;
      orientation?: 'portrait' | 'landscape';
      compress?: boolean;
      precision?: number;
    };
  }

  interface Html2Pdf {
    set(options: Options): Html2Pdf;
    from(element: HTMLElement): Html2Pdf;
    save(): Promise<void>;
  }

  function html2pdf(): Html2Pdf;
  export = html2pdf;
} 