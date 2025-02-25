import { toPng, toJpeg, toSvg } from 'html-to-image';
import jsPDF from 'jspdf';

export const downloadImage = async (element, format) => {
  if (!element) return;
  
  try {
    let dataUrl;
    const options = { 
      backgroundColor: '#f8f9fa',
      scale: 4,
      pixelRatio: 3,
      useCORS: true
    };
    
    if (format === 'pdf') {
      const jpegUrl = await toJpeg(element, {
        ...options,
        quality: 1.0
      });

      const img = new Image();
      img.src = jpegUrl;
      await new Promise(resolve => {
        img.onload = resolve;
      });

      const pdf = new jsPDF({
        orientation: img.width > img.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [img.width, img.height],
        compress: false
      });

      pdf.addImage(
        jpegUrl,
        'JPEG',
        0,
        0,
        img.width,
        img.height,
        undefined,
        'NONE'
      );

      pdf.save('waf-rules.pdf');
      return;
    }

    switch (format) {
      case 'png':
        dataUrl = await toPng(element, options);
        break;
      case 'jpg':
        dataUrl = await toJpeg(element, options);
        break;
      case 'svg':
        dataUrl = await toSvg(element, options);
        break;
      default:
        return;
    }
    
    const link = document.createElement('a');
    link.download = `waf-rules.${format}`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
};
