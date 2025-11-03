import { debugLogger } from "../../utils/debugLogger.js";

/**
 * ✅ Enhanced PDF Parser with Image-Based PDF Detection
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  // Convert Buffer to Uint8Array for PDF.js
  const uint8Array = new Uint8Array(buffer);

  // --- Strategy 1: Simple PDF.js with Uint8Array ---
  try {
    const text = await extractWithSimplePdfJs(uint8Array);
    if (text && isValidContent(text)) {
      debugLogger("pdfParser", {
        step: "simple pdfjs success",
        length: text.length,
        preview: text.slice(0, 150),
      });
      return text;
    }
  } catch (err) {
    debugLogger("pdfParser", { 
      step: "simple pdfjs failed", 
      error: String(err) 
    });
  }

  // --- Strategy 2: pdf-parse with error handling ---
  try {
    const text = await extractWithPdfParseSafe(buffer);
    if (text && isValidContent(text)) {
      debugLogger("pdfParser", {
        step: "pdf-parse success",
        length: text.length,
        preview: text.slice(0, 150),
      });
      return text;
    }
  } catch (err) {
    debugLogger("pdfParser", { 
      step: "pdf-parse failed", 
      error: String(err) 
    });
  }

  // --- Strategy 3: iLovePDF API Fallback ---
  try {
    const apiText = await extractWithILovePdfApi(buffer);
    if (apiText && isValidContent(apiText)) {
      debugLogger("pdfParser", {
        step: "iLovePDF API success",
        length: apiText.length,
        preview: apiText.slice(0, 150),
      });
      return apiText;
    }
  } catch (err) {
    debugLogger("pdfParser", {
      step: "iLovePDF API failed",
      error: String(err),
    });
  }

  throw new Error(
    "PDF_CONTENT_ERROR: This PDF appears to be image-based or scanned. " +
    "Please use a PDF with selectable text, or try DOCX/TXT format for best results."
  );
}

/** Simple PDF.js extraction with Uint8Array */
async function extractWithSimplePdfJs(uint8Array: Uint8Array): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    const pdfjs = pdfjsLib as any;
    
    // Use Uint8Array instead of Buffer
    const doc = await pdfjs.getDocument({
      data: uint8Array,
      useWorker: false,
      verbosity: 0
    }).promise;

    let fullText = '';
    let totalPages = Math.min(doc.numPages, 10); // Limit to first 10 pages for performance
    
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await doc.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .trim();
          
        fullText += pageText + '\n\n';
        
        // Early detection of image-based PDF
        if (pageNum === 2 && isLikelyImageBased(fullText)) {
          await doc.destroy();
          throw new Error('PDF appears to be image-based - minimal text extracted');
        }
      } catch (pageErr) {
        debugLogger("pdfParser", {
          step: "page extraction failed",
          page: pageNum,
          error: String(pageErr)
        });
        continue;
      }
    }
    
    await doc.destroy();
    const cleanedText = cleanExtractedText(fullText);
    
    if (!isValidContent(cleanedText)) {
      throw new Error('Extracted content is insufficient or appears to be image-based');
    }
    
    return cleanedText;
  } catch (err) {
    throw new Error(`PDF.js extraction failed: ${err}`);
  }
}

/** Safe pdf-parse extraction */
async function extractWithPdfParseSafe(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await import("pdf-parse");
    const pdfParseFn = pdfParse.default || pdfParse;
    
    const data = await pdfParseFn(buffer);
    let text = (data.text || "").trim();
    
    // Early detection of image-based PDF
    if (isLikelyImageBased(text)) {
      throw new Error('PDF appears to be image-based');
    }
    
    return cleanExtractedText(text);
  } catch (err: any) {
    if (err.message && err.message.includes('test/data')) {
      debugLogger("pdfParser", {
        step: "pdf-parse test file error (ignored)",
        error: String(err)
      });
      throw new Error('PDF-parse configuration issue');
    }
    throw new Error(`PDF-parse failed: ${err}`);
  }
}

/** iLovePDF API with better error handling */
async function extractWithILovePdfApi(buffer: Buffer): Promise<string> {
  if (!process.env.ILOVEPDF_PUBLIC_KEY || !process.env.ILOVEPDF_SECRET_KEY) {
    throw new Error('iLovePDF API credentials not configured');
  }

  try {
    debugLogger("pdfParser", { 
      step: "starting iLovePDF extraction",
      publicKey: process.env.ILOVEPDF_PUBLIC_KEY?.substring(0, 10) + '...'
    });

    const text = await extractWithILovePdfRestApi(buffer);
    const cleanedText = cleanExtractedText(text);
    
    if (!isValidContent(cleanedText)) {
      throw new Error('iLovePDF returned insufficient content');
    }
    
    return cleanedText;

  } catch (error) {
    debugLogger("pdfParser", {
      step: "iLovePDF API error",
      error: String(error)
    });
    throw new Error(`iLovePDF processing failed: ${error}`);
  }
}

/** iLovePDF REST API implementation */
async function extractWithILovePdfRestApi(buffer: Buffer): Promise<string> {
  const fetch = await import('node-fetch').then(module => module.default);
  const FormData = await import('form-data').then(module => module.default);

  const publicKey = process.env.ILOVEPDF_PUBLIC_KEY!;

  // 1. Get authentication token
  const authResponse = await fetch('https://api.ilovepdf.com/v1/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      public_key: publicKey,
    }),
  });

  if (!authResponse.ok) {
    const errorText = await authResponse.text();
    throw new Error(`iLovePDF authentication failed: ${authResponse.status} - ${errorText}`);
  }

  const authData = await authResponse.json() as { token: string };
  const token = authData.token;

  debugLogger("pdfParser", { step: "iLovePDF authenticated", token: token.substring(0, 10) + '...' });

  // 2. Start a new task
  const taskResponse = await fetch('https://api.ilovepdf.com/v1/start/extract', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!taskResponse.ok) {
    const errorText = await taskResponse.text();
    throw new Error(`iLovePDF task start failed: ${taskResponse.status} - ${errorText}`);
  }

  const taskData = await taskResponse.json() as { server: string; task: string };
  const server = taskData.server;
  const taskId = taskData.task;

  debugLogger("pdfParser", { step: "iLovePDF task started", server, taskId });

  // 3. Upload the file with proper task reference
  const formData = new FormData();
  formData.append('file', buffer, { filename: 'document.pdf' });
  formData.append('task', taskId); // Include task ID in upload

  const uploadResponse = await fetch(`https://${server}/v1/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      ...formData.getHeaders(),
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`iLovePDF upload failed: ${uploadResponse.status} - ${errorText}`);
  }

  const uploadData = await uploadResponse.json() as { server_filename: string };
  const serverFilename = uploadData.server_filename;

  debugLogger("pdfParser", { step: "iLovePDF file uploaded", serverFilename });

  // 4. Process the file
  const processResponse = await fetch(`https://${server}/v1/process`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task: taskId,
      tool: 'extract',
      files: [
        {
          server_filename: serverFilename,
          filename: 'document.pdf',
        },
      ],
    }),
  });

  if (!processResponse.ok) {
    const errorText = await processResponse.text();
    throw new Error(`iLovePDF processing failed: ${processResponse.status} - ${errorText}`);
  }

  debugLogger("pdfParser", { step: "iLovePDF processing completed" });

  // 5. Download the result
  const downloadResponse = await fetch(`https://${server}/v1/download/${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!downloadResponse.ok) {
    const errorText = await downloadResponse.text();
    throw new Error(`iLovePDF download failed: ${downloadResponse.status} - ${errorText}`);
  }

  const resultBuffer = await downloadResponse.buffer();
  const text = resultBuffer.toString('utf8');

  debugLogger("pdfParser", { 
    step: "iLovePDF download completed", 
    textLength: text.length,
    preview: text.substring(0, 100) 
  });

  return text;
}

/** Detect if PDF is likely image-based */
function isLikelyImageBased(text: string): boolean {
  if (!text || text.length < 100) return true;
  
  const wordCount = text.split(/\s+/).length;
  const readableRatio = text.replace(/[^a-zA-Z0-9\s]/g, '').length / text.length;
  const gibberishScore = calculateGibberishScore(text);
  
  // Image-based PDFs typically have very little readable text
  return wordCount < 50 || readableRatio < 0.3 || gibberishScore > 0.7;
}

/** Calculate gibberish score */
function calculateGibberishScore(text: string): number {
  const lines = text.split('\n');
  let gibberishLines = 0;
  
  for (const line of lines) {
    if (line.trim().length < 5) continue;
    
    // Check for common gibberish patterns
    const hasManySpecialChars = (line.replace(/[a-zA-Z0-9\s]/g, '').length / line.length) > 0.4;
    const hasRepeatedChars = /(.)\1{4,}/.test(line);
    const hasNoSpaces = !/\s/.test(line) && line.length > 20;
    
    if (hasManySpecialChars || hasRepeatedChars || hasNoSpaces) {
      gibberishLines++;
    }
  }
  
  return gibberishLines / Math.max(lines.length, 1);
}

/** Enhanced content validation */
function isValidContent(text: string): boolean {
  if (!text || text.length < 200) return false;
  
  const wordCount = text.split(/\s+/).length;
  const sentenceCount = text.split(/[.!?]+/).length;
  const gibberishScore = calculateGibberishScore(text);
  
  // Require substantial, readable content
  return wordCount > 100 && 
         sentenceCount > 5 && 
         gibberishScore < 0.3;
}

/** Clean extracted text */
function cleanExtractedText(text: string): string {
  return text
    .replace(/\/(Font|F|Type|Subtype|BaseFont|Encoding)\s*\[?[^\s\]]*\]?/g, ' ')
    .replace(/(BT|ET|Tm|Td|Tj|TJ|Tf|TD|T\*)\b/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/(Producer|Creator|CreationDate|ModDate|Keywords|Subject|Title|Author):.*\n/gi, '')
    .replace(/.*(Adobe|Identity|www\.ilovepdf\.com).*\n/gi, '')
    .replace(/\\[nrt]/g, ' ')
    .replace(/\\[0-9]{3}/g, ' ')
    .replace(/�/g, ' ')
    .replace(/[^\x20-\x7E\n\r]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}