import { debugLogger } from "../../utils/debugLogger.js";

/**
 * ✅ Enhanced PDF Parser with iLovePDF API Integration
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  // --- Strategy 1: Local parsing first (fast & free) ---
  try {
    const localText = await extractWithLocalMethods(buffer);
    if (localText && isValidContent(localText)) {
      debugLogger("pdfParser", {
        step: "local extraction success",
        length: localText.length,
        preview: localText.slice(0, 150),
      });
      return localText;
    }
  } catch (err) {
    debugLogger("pdfParser", { 
      step: "local extraction failed", 
      error: String(err) 
    });
  }

  // --- Strategy 2: iLovePDF API Fallback (reliable but limited) ---
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
    "PDF_CONTENT_ERROR: This PDF could not be processed. " +
    "Please ensure it contains readable text or try a different file format."
  );
}

/** Try local extraction methods first */
async function extractWithLocalMethods(buffer: Buffer): Promise<string> {
  // Try pdfjs-dist first
  try {
    const text = await extractWithPdfJs(buffer);
    if (text && isValidContent(text)) {
      return text;
    }
  } catch (err) {
    debugLogger("pdfParser", { 
      step: "pdfjs-dist failed", 
      error: String(err) 
    });
  }

  // Try pdf-parse as fallback
  try {
    const text = await extractWithPdfParse(buffer);
    if (text && isValidContent(text)) {
      return text;
    }
  } catch (err) {
    debugLogger("pdfParser", { 
      step: "pdf-parse failed", 
      error: String(err) 
    });
  }

  throw new Error('All local extraction methods failed');
}

/** Extract text using pdfjs-dist */
async function extractWithPdfJs(buffer: Buffer): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    const pdfjs = pdfjsLib as any;
    pdfjs.GlobalWorkerOptions.workerSrc = '';
    
    const loadingTask = pdfjs.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .trim();
        fullText += pageText + '\n\n';
        
        // Early validation for poor content
        if (pageNum === 3 && !hasSubstantialContent(fullText)) {
          throw new Error('Insufficient content in first few pages');
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
    
    await pdf.destroy();
    return cleanExtractedText(fullText);
  } catch (err) {
    throw new Error(`PDF.js extraction failed: ${err}`);
  }
}

/** Extract text using pdf-parse */
async function extractWithPdfParse(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await import("pdf-parse");
    const pdfParseFn = pdfParse.default || pdfParse;
    const data = await pdfParseFn(buffer);
    let text = (data.text || "").trim();
    return cleanExtractedText(text);
  } catch (err) {
    throw new Error(`PDF-parse failed: ${err}`);
  }
}

/** Extract text using iLovePDF API */
async function extractWithILovePdfApi(buffer: Buffer): Promise<string> {
  // Check if API keys are configured
  if (!process.env.ILOVEPDF_PUBLIC_KEY || !process.env.ILOVEPDF_SECRET_KEY) {
    debugLogger("pdfParser", {
      step: "iLovePDF credentials missing",
      hasPublicKey: !!process.env.ILOVEPDF_PUBLIC_KEY,
      hasSecretKey: !!process.env.ILOVEPDF_SECRET_KEY
    });
    throw new Error('iLovePDF API credentials not configured');
  }

  try {
    debugLogger("pdfParser", { 
      step: "starting iLovePDF extraction",
      publicKey: process.env.ILOVEPDF_PUBLIC_KEY?.substring(0, 10) + '...'
    });

    // Use REST API approach (more reliable than SDK)
    const text = await extractWithILovePdfRestApi(buffer);
    return cleanExtractedText(text);

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
  const secretKey = process.env.ILOVEPDF_SECRET_KEY!;

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
  const taskResponse = await fetch('https://api.ilovepdf.com/v1/start/pdfextract', {
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

  // 3. Upload the file
  const formData = new FormData();
  formData.append('file', buffer, { filename: 'document.pdf' });

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
      tool: 'pdfextract',
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

/** Enhanced content validation */
function isValidContent(text: string): boolean {
  if (!text || text.length < 100) return false;
  
  const wordCount = text.split(/\s+/).length;
  const metadataRatio = calculateMetadataRatio(text);
  
  // More lenient validation for iLovePDF results
  return wordCount > 50 && metadataRatio < 0.5;
}

/** Check if text has substantial content */
function hasSubstantialContent(text: string): boolean {
  const words = text.split(/\s+/);
  const uniqueWords = new Set(words.filter(word => word.length > 3));
  return uniqueWords.size > 20;
}

/** Calculate metadata ratio in text */
function calculateMetadataRatio(text: string): number {
  const metadataKeywords = [
    'producer', 'creator', 'creationdate', 'moddate', 
    'pdf', 'adobe', 'version', 'trapped', 'keywords',
    'subject', 'title', 'author', 'page'
  ];
  
  const words = text.toLowerCase().split(/\s+/);
  const metadataWords = words.filter(word => 
    metadataKeywords.some(keyword => word.includes(keyword))
  );
  
  return metadataWords.length / Math.max(words.length, 1);
}

/** Check if text is readable (not gibberish) */
function isReadableText(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  const readableChars = text.replace(/[^a-zA-Z0-9\s.,!?;:'"-]/g, '').length;
  const readabilityScore = readableChars / text.length;
  
  const wordCount = (text.match(/\b[a-zA-Z]{3,}\b/g) || []).length;
  const wordRatio = wordCount / (text.split(/\s+/).length || 1);
  
  const hasGibberish = isGibberish(text);
  
  return readabilityScore > 0.6 && wordRatio > 0.3 && !hasGibberish;
}

/** Detect gibberish text */
function isGibberish(text: string): boolean {
  const specialCharRatio = (text.replace(/[a-zA-Z0-9\s]/g, '').length) / text.length;
  if (specialCharRatio > 0.4) return true;
  
  const unusualPatterns = [
    /[{}<>\[\]\\\/]{3,}/g,
    /[^\x20-\x7E]{3,}/g,
    /(\S)\1{4,}/g,
  ];
  
  return unusualPatterns.some(pattern => pattern.test(text));
}

/** Check if line appears to be metadata */
function isMetadataLine(line: string): boolean {
  const metadataIndicators = [
    /^\d+\s+\d+\s+\w+$/,
    /^<<.*>>$/,
    /^\/\w+/,
    /^(Producer|Creator|CreationDate|ModDate|Keywords|Subject|Title|Author):/i,
    /^Page \d+ of \d+$/i,
    /^\d{4}-\d{2}-\d{2}/,
    /^.*Adobe.*$/i,
    /^.*Identity.*$/i,
    /^.*www\.ilovepdf\.com.*$/i,
  ];
  
  return metadataIndicators.some(pattern => pattern.test(line.trim()));
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