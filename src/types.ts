export type JsonTemplateKey = 'base' | 'notification' | 'paywall' | 'onboarding';

export type JsonFieldValue = string | number | boolean | string[];

export type JsonFormState = Record<string, JsonFieldValue>;

export interface DraftItem {
  id: string;
  type: JsonTemplateKey;
  createdAt: number;
  changedKey: string;
  payload: JsonFormState;
}

export interface UploadResponse {
  message: string;
  savedFiles: Record<string, string>;
}
