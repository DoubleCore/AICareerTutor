import { unzipSync } from "fflate";

/**
 * 端上文件解析层(分治架构的前端侧)。
 *
 * 设计(见 spec backend-feature-optimization):PDF/DOCX 在端上解析、MP3 走后端云 ASR。
 * 本模块只管 PDF/DOCX/txt/md 的「文件 → 纯文本」,不读写 store、不碰网络后端(MP3 由 interviewApi 处理)。
 *
 * - PDF :expo-pdf-text-extract(原生模块,PDFKit/iOS、PDFBox/Android)。Expo Go / web 不可用 → 降级。
 * - DOCX:fflate 解 zip 取 word/document.xml,剥 XML 标签得正文(纯 JS,无原生依赖)。
 * - txt/md:fetch(uri) 读纯文本。
 *
 * 跨平台读字节用 fetch(uri):file://(原生)与 blob:(web)都可读,避免额外引入 expo-file-system。
 */

/** 选中的文件(对齐 expo-document-picker 的 asset 形状,只取需要的字段)。 */
export type PickedFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

export type ExtractSourceFormat = "txt" | "md" | "pdf" | "docx";

/**
 * 解析结果(error-as-data,不抛异常):
 * - ok=true :拿到文本,sourceFormat 标明来源格式。
 * - ok=false:reason 区分失败类型,屏幕层据此给不同中文提示。
 *   - unsupported       :扩展名不支持(非 txt/md/pdf/docx/mp3)。
 *   - empty             :解析成功但无文字(如扫描件 PDF 无文本层)。
 *   - native_unavailable:PDF 原生模块不可用(Expo Go / web),需正式构建。
 *   - error             :读取/解析过程出错。
 */
export type ExtractOutcome =
  | { ok: true; text: string; sourceFormat: ExtractSourceFormat }
  | { ok: false; reason: "unsupported" | "empty" | "native_unavailable" | "error" };

const TEXT_EXTS = new Set(["txt", "md"]);

/** 取小写扩展名(无扩展名返回空串)。 */
function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** 按扩展名分发到对应解析器。txt/md/pdf/docx 端上处理;mp3 不在此层(交 interviewApi 走后端)。 */
export async function extractFileText(file: PickedFile): Promise<ExtractOutcome> {
  const ext = extOf(file.name);
  try {
    if (TEXT_EXTS.has(ext)) {
      return await extractPlainText(file.uri, ext as "txt" | "md");
    }
    if (ext === "pdf") {
      return await extractPdf(file.uri);
    }
    if (ext === "docx") {
      return await extractDocx(file.uri);
    }
    return { ok: false, reason: "unsupported" };
  } catch (err) {
    console.warn("[fileExtract] 解析失败:", err instanceof Error ? err.message : String(err));
    return { ok: false, reason: "error" };
  }
}

/** txt/md:直接读为纯文本。 */
async function extractPlainText(uri: string, sourceFormat: "txt" | "md"): Promise<ExtractOutcome> {
  const text = await (await fetch(uri)).text();
  if (!text.trim()) {
    return { ok: false, reason: "empty" };
  }
  return { ok: true, text, sourceFormat };
}

/**
 * PDF:用 expo-pdf-text-extract 原生模块。
 * - 模块整体不可用(Expo Go / web / 加载失败)→ native_unavailable。
 * - extractTextWithInfo 是非抛错变体,失败以 success=false + errorCode 返回。
 */
async function extractPdf(uri: string): Promise<ExtractOutcome> {
  // 延迟 require:Expo Go / web 下原生模块缺失时,不在模块加载期就崩。
  let pdf: typeof import("expo-pdf-text-extract") | null = null;
  try {
    pdf = require("expo-pdf-text-extract");
  } catch {
    return { ok: false, reason: "native_unavailable" };
  }
  if (!pdf || typeof pdf.isAvailable !== "function" || !pdf.isAvailable()) {
    return { ok: false, reason: "native_unavailable" };
  }

  const info = await pdf.extractTextWithInfo(uri);
  if (!info.success) {
    // 加密/损坏/找不到文件等;本轮不做密码输入与 OCR,统一按 error 处理。
    return { ok: false, reason: "error" };
  }
  if (!info.text.trim()) {
    return { ok: false, reason: "empty" }; // 扫描件无文本层
  }
  return { ok: true, text: info.text, sourceFormat: "pdf" };
}

/**
 * DOCX:zip 容器,正文在 word/document.xml。
 * 取 <w:t> 文本、在段落 </w:p> 处换行,剥其余标签,解 XML 实体。纯 JS,无原生依赖。
 */
async function extractDocx(uri: string): Promise<ExtractOutcome> {
  const buf = new Uint8Array(await (await fetch(uri)).arrayBuffer());
  const files = unzipSync(buf, { filter: (f) => f.name === "word/document.xml" });
  const docXml = files["word/document.xml"];
  if (!docXml || docXml.length === 0) {
    return { ok: false, reason: "error" }; // 非法 docx 或无正文部件
  }
  const xml = new TextDecoder("utf-8").decode(docXml);
  const text = docxXmlToText(xml);
  if (!text.trim()) {
    return { ok: false, reason: "empty" };
  }
  return { ok: true, text, sourceFormat: "docx" };
}

/** 把 word/document.xml 转成带换行的纯文本。 */
function docxXmlToText(xml: string): string {
  const withBreaks = xml
    .replace(/<w:p\b[^>]*\/>/g, "\n") // 空段落
    .replace(/<\/w:p>/g, "\n") // 段落结束 → 换行
    .replace(/<w:br\b[^>]*\/?>/g, "\n") // 软换行
    .replace(/<w:tab\b[^>]*\/?>/g, "\t"); // 制表符
  const stripped = withBreaks.replace(/<[^>]+>/g, ""); // 剥所有剩余标签
  return decodeXmlEntities(stripped)
    .replace(/\n{3,}/g, "\n\n") // 收敛多余空行
    .trim();
}

/** 解常见 XML 实体(docx 正文里出现的就这几个)。 */
function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
