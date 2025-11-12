/**
 * Dictionary types for external dictionary lookups
 */

export type DictType = 'embedded' | 'popup';

export interface Dictionary {
  id: number;
  language: string;
  name: string;
  url_template: string;
  dict_type: DictType;
  is_active: number;
  sort_order: number;
  is_default: number;
  created_at: number;
}

export interface DictionaryLookupParams {
  word: string;
  url_template: string;
  dict_type: DictType;
}
