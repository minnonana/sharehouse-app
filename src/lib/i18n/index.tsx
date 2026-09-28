"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import ja from "./ja.json";
import en from "./en.json";

export type Locale = "ja" | "en";

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

type TranslateParams = Record<string, string | number>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TranslateParams) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match,
  );
}

export function I18nProvider({
  children,
  initialLocale = "ja",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  const t = useCallback(
    (key: string, params?: TranslateParams) => {
      const template =
        getFromPath(dictionaries[locale], key) ??
        getFromPath(dictionaries.ja, key) ??
        key;
      return interpolate(template, params);
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

/** ブラウザの言語設定から初期表示言語を決める（日本語以外は英語扱い） */
export function detectInitialLocale(acceptLanguage?: string | null): Locale {
  if (acceptLanguage?.toLowerCase().startsWith("ja")) return "ja";
  if (!acceptLanguage) return "ja";
  return acceptLanguage.toLowerCase().includes("ja") ? "ja" : "en";
}
