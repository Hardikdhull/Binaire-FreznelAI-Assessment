import type { DraftItem, JsonFieldValue, JsonFormState, JsonTemplateKey, UploadResponse } from '../types';

const defaultTemplates: Record<JsonTemplateKey, JsonFormState> = {
  base: {
    name: 'Base campaign',
    status: 'draft',
    priority: 5,
    enabled: true,
    audiences: ['all'],
  },
  notification: {
    title: 'New update available',
    message: 'We have improved your experience with a faster dashboard.',
    type: 'info',
    priority: 7,
    dismissible: true,
  },
  paywall: {
    headline: 'Unlock premium plans',
    subtitle: 'Access all analytics and automation tools',
    cta: 'Upgrade now',
    price: 19,
    featured: true,
  },
  onboarding: {
    step: 'Welcome',
    description: 'Set up your workspace and invite your team.',
    progress: 30,
    showTutorial: true,
  },
};

export class JsonStudio {
  private history: DraftItem[] = [];
  private undoStack: JsonFormState[] = [];
  private redoStack: JsonFormState[] = [];
  private current: Record<JsonTemplateKey, JsonFormState> = structuredClone(defaultTemplates);

  constructor() {
    this.history = Object.entries(this.current).map(([type, payload]) => ({
      id: `${type}-${Date.now()}`,
      type: type as JsonTemplateKey,
      createdAt: Date.now(),
      changedKey: 'initial',
      payload: { ...payload },
    }));
  }

  getFormModel(key: JsonTemplateKey) {
    return this.current[key];
  }

  getCurrentDraft(key: JsonTemplateKey) {
    return this.history.find((item) => item.type === key) || null;
  }

  getPreviewJson(key: JsonTemplateKey) {
    return this.current[key];
  }

  getHistory() {
    return this.history;
  }

  updateField(key: JsonTemplateKey, field: string, value: JsonFieldValue) {
    const snapshot = { ...this.current[key] };
    this.undoStack.push(snapshot);
    this.redoStack = [];
    this.current[key] = {
      ...this.current[key],
      [field]: value,
    };

    this.history = [
      {
        id: `${key}-${Date.now()}-${field}`,
        type: key,
        createdAt: Date.now(),
        changedKey: field,
        payload: { ...this.current[key] },
      },
      ...this.history,
    ];
  }

  undo(key: JsonTemplateKey) {
    if (this.undoStack.length === 0) return false;
    const previous = this.undoStack.pop()!;
    this.redoStack.push({ ...this.current[key] });
    this.current[key] = previous;
    return true;
  }

  redo(key: JsonTemplateKey) {
    if (this.redoStack.length === 0) return false;
    const next = this.redoStack.pop()!;
    this.undoStack.push({ ...this.current[key] });
    this.current[key] = next;
    return true;
  }

  restoreDraft(draft: DraftItem) {
    this.current[draft.type] = { ...draft.payload };
    this.history = [draft, ...this.history.filter((item) => item.type !== draft.type)];
  }

  async sendToServer(): Promise<UploadResponse> {
    const files = Object.entries(this.current).reduce<Record<string, object>>((acc, [key, value]) => {
      acc[`${key}.json`] = value;
      return acc;
    }, {});

    const payload = {
      files,
      savedAt: new Date().toISOString(),
      timestamp: Date.now(),
    };

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to upload JSON files to server');
    }

    return response.json();
  }

}
