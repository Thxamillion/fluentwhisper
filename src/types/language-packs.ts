/**
 * Language pack type definitions for on-demand language downloads
 */

export type LangCode = 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt' | 'zh' | 'ja' | 'ko' | 'ar' | 'ru';

export interface LanguagePack {
  code: LangCode;
  name: string;
  nativeName: string;
  files: {
    lemmas: {
      size: number;      // bytes
      url: string;       // GitHub release URL or "bundled"
      bundled: boolean;  // true for English
    };
  };
}

export interface TranslationPack {
  from: LangCode;
  to: LangCode;
  size: number;
  url: string;
}

export interface LanguagePackManifest {
  version: string;
  lastUpdated: string;
  languages: Record<LangCode, LanguagePack>;
  translations: TranslationPack[];
}

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
  speed?: number; // bytes per second
}

export interface RequiredPacks {
  lemmas: LangCode[];
  translations: [LangCode, LangCode][];
}
