import ja from "./ja.json";
import en from "./en.json";
import type { Locale } from "./index";

const dictionaries: Record<Locale, Record<string, unknown>> = { ja, en };

function getFromPath(obj: Record<string, unknown>, path: string): string | undefined {
  const value = path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined,
      obj,
    );
  return typeof value === "string" ? value : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match,
  );
}

/** サーバーコンポーネント（Reactフック不可）から翻訳文字列を引くための関数を返す */
export function getServerTranslator(locale: Locale) {
  return (key: string, params?: Record<string, string | number>) => {
    const template =
      getFromPath(dictionaries[locale], key) ?? getFromPath(dictionaries.ja, key) ?? key;
    return interpolate(template, params);
  };
}
