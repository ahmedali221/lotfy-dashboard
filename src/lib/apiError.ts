import axios from 'axios';

type Lang = 'ar' | 'en';

const STATUS_MESSAGES: Record<number, { ar: string; en: string }> = {
  401: { ar: 'يجب تسجيل الدخول', en: 'Authentication required' },
  403: { ar: 'غير مسموح لك بتنفيذ هذا الإجراء', en: 'You are not allowed to perform this action' },
  404: { ar: 'العنصر غير موجود أو غير متاح', en: 'Resource not found or unavailable' },
  405: { ar: 'هذا الإجراء غير مدعوم', en: 'This action is not supported' },
};

// DRF error bodies vary: {detail}, {non_field_errors: [...]}, {field: [...]},
// nested objects, or a plain list. Return the first readable message.
function firstMessage(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === 'string') return data.trim().startsWith('<') ? null : data;
  if (Array.isArray(data)) {
    for (const item of data) {
      const msg = firstMessage(item);
      if (msg) return msg;
    }
    return null;
  }
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['detail', 'non_field_errors']) {
      const msg = firstMessage(obj[key]);
      if (msg) return msg;
    }
    for (const value of Object.values(obj)) {
      const msg = firstMessage(value);
      if (msg) return msg;
    }
  }
  return null;
}

export function getApiError(err: unknown, lang: Lang, fallback: { ar: string; en: string }): string {
  if (axios.isAxiosError(err) && err.response) {
    const { status, data } = err.response;
    // 403/405 bodies are generic DRF text; prefer our translated message.
    if (status === 403 || status === 405) return STATUS_MESSAGES[status][lang];
    const msg = firstMessage(data);
    if (msg) return msg;
    if (STATUS_MESSAGES[status]) return STATUS_MESSAGES[status][lang];
  }
  return fallback[lang];
}
