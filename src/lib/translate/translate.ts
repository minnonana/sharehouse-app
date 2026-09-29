import type { Language } from "@/types/database";

/**
 * 簡易的な自動翻訳。
 *
 * 無料で使える MyMemory Translation API (https://mymemory.translated.net/)
 * を利用している。APIキー不要・匿名で1日あたり一定量まで無料で使える
 * （Google翻訳の非公式スクレイピングと違い、公式に外部利用を想定したAPI）。
 * ただし無料枠には上限があるため、失敗時は原文をそのまま返す
 * （掲示板の投稿自体は失敗させない）。
 *
 * 本番でしっかり運用する場合は、DeepL API や Google Cloud Translation API
 * など有料の正式APIキー方式に差し替えることを推奨する。
 */
export async function translateText(text: string, targetLang: Language): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  try {
    const sourceLang = targetLang === "ja" ? "en" : "ja";
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${sourceLang}|${targetLang}`;

    const res = await fetch(url, {
      // 定時処理などから長時間待たされないよう、タイムアウトを設定
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return text;

    const data = (await res.json()) as {
      responseStatus?: number;
      responseData?: { translatedText?: string };
    };

    if (data.responseStatus !== 200) return text;

    const translated = data.responseData?.translatedText;
    return translated?.trim() || text;
  } catch (error) {
    console.error("[translate] failed, falling back to original text:", error);
    return text;
  }
}
