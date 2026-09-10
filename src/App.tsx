import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Content,
  Divider,
  Flex,
  Heading,
  Item,
  ListView,
  SearchField,
  Slider,
  Text,
  TextArea,
  View,
} from '@adobe/react-spectrum';
import { signInAnonymously } from 'firebase/auth';
import { firebaseAuth, initializeFirebase } from './auth/firebase';
import { JsonStudio } from './models/JsonStudio';
import type { DraftItem, JsonTemplateKey } from './types';

const tabs: JsonTemplateKey[] = ['base', 'notification', 'paywall', 'onboarding'];
const tabLabels: Record<JsonTemplateKey, string> = {
  base: 'Base',
  notification: 'Notification',
  paywall: 'Paywall',
  onboarding: 'Onboarding',
};

function App() {
  const [studio] = useState(() => new JsonStudio());
  const [activeTab, setActiveTab] = useState<JsonTemplateKey>('base');
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    initializeFirebase();
    const unsub = firebaseAuth().onAuthStateChanged((nextUser) => setUser(nextUser));
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const historyItems = useMemo(() => studio.getHistory(), [studio, refreshKey]);

  const currentForm = studio.getFormModel(activeTab);
  const currentJson = studio.getPreviewJson(activeTab);

  const handleFieldChange = (key: string, value: string | boolean | number | string[]) => {
    studio.updateField(activeTab, key, value);
    setRefreshKey((prev) => prev + 1);
    setSelectedDraftId((prev) => prev ?? studio.getCurrentDraft(activeTab)?.id ?? null);
  };

  const handleSelectDraft = (draft: DraftItem) => {
    studio.restoreDraft(draft);
    setRefreshKey((prev) => prev + 1);
    setSelectedDraftId(draft.id);
    setStatus(`Restored ${tabLabels[draft.type]}`);
  };

  const handleUndo = () => {
    const result = studio.undo(activeTab);
    setRefreshKey((prev) => prev + 1);
    setStatus(result ? 'Undid last change' : 'Nothing to undo');
  };

  const handleRedo = () => {
    const result = studio.redo(activeTab);
    setRefreshKey((prev) => prev + 1);
    setStatus(result ? 'Reapplied change' : 'Nothing to redo');
  };

  const handleSaveFiles = async () => {
    setIsSending(true);
    setStatus('Uploading JSON files in background');
    try {
      const payload = await studio.sendToServer();
      setStatus(payload.message || 'Files uploaded successfully');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsSending(false);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInAnonymously(firebaseAuth());
      setStatus('Signed in successfully');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not sign in');
    }
  };

  const renderField = (key: string, value: unknown, label: string) => {
    if (typeof value === 'boolean') {
      return (
        <Checkbox
          key={key}
          isSelected={Boolean(value)}
          onChange={(next) => handleFieldChange(key, next)}
        >
          {label}
        </Checkbox>
      );
    }

    if (typeof value === 'number') {
      return (
        <View key={key} marginBottom="size-200">
          <Text>{label}</Text>
          <Slider
            value={value}
            minValue={0}
            maxValue={100}
            step={1}
            onChange={(next) => handleFieldChange(key, next)}
          />
        </View>
      );
    }

    if (Array.isArray(value)) {
      return (
        <View key={key} marginBottom="size-200">
          <Text>{label}</Text>
          <TextArea
            value={value.join(', ')}
            onChange={(next) => handleFieldChange(key, next.toString().split(',').map((item) => item.trim()).filter(Boolean) as string[])}
          />
        </View>
      );
    }

    if (typeof value === 'string' && value.length > 40) {
      return (
        <View key={key} marginBottom="size-200">
          <Text>{label}</Text>
          <TextArea value={value} onChange={(next) => handleFieldChange(key, next)} />
        </View>
      );
    }

    if (typeof value === 'string') {
      return (
        <View key={key} marginBottom="size-200">
          <Text>{label}</Text>
          <SearchField
            value={value}
            onChange={(next) => handleFieldChange(key, next)}
            placeholder={label}
          />
        </View>
      );
    }

    return null;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #06111f 0%, #0f172a 18%, #111827 100%)', padding: '32px' }}>
      <Content width="100%">
        <Flex direction="column" gap="size-400">
          <Flex justifyContent="space-between" alignItems="center" wrap>
            <Heading level={1}>Freznel JSON Studio</Heading>
            <Flex gap="size-200" alignItems="center">
              <Text>{online ? 'Online' : 'Offline'} connection</Text>
              <Button variant={online ? 'cta' : 'secondary'} onPress={handleSignIn}>
                {user ? 'Authenticated' : 'Sign in'}
              </Button>
            </Flex>
          </Flex>

          <Divider size="M" />

          <Flex gap="size-300" alignItems="start" wrap>
            <View width="46%" minWidth="320px" backgroundColor="gray-100" padding="size-300" borderRadius="medium">
              <Heading level={3}>Template editor</Heading>
              <Flex gap="size-200" marginBottom="size-300" wrap>
                {tabs.map((tab) => (
                  <Button
                    key={tab}
                    variant={activeTab === tab ? 'cta' : 'secondary'}
                    onPress={() => setActiveTab(tab)}
                  >
                    {tabLabels[tab]}
                  </Button>
                ))}
              </Flex>

              {Object.entries(currentForm).map(([key, value]) => renderField(key, value, key))}

              <Flex gap="size-200" marginTop="size-300">
                <Button variant="secondary" onPress={handleUndo}>Undo</Button>
                <Button variant="secondary" onPress={handleRedo}>Redo</Button>
                <Button variant="cta" onPress={handleSaveFiles} isDisabled={isSending}>
                  {isSending ? 'Sending…' : 'Send to Server'}
                </Button>
              </Flex>
              <Text marginTop="size-200">Status: {status}</Text>
            </View>

            <View width="46%" minWidth="320px" backgroundColor="gray-100" padding="size-300" borderRadius="medium">
              <Heading level={3}>Preview</Heading>
              <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '540px', overflow: 'auto' }}>{JSON.stringify(currentJson, null, 2)}</pre>
            </View>
          </Flex>

          <Flex gap="size-300" wrap>
            <View flex={1} backgroundColor="gray-100" padding="size-300" borderRadius="medium">
              <Heading level={3}>Saved drafts</Heading>
              <ListView aria-label="saved drafts" selectionMode="single" selectedKeys={selectedDraftId ? [selectedDraftId] : []} onSelectionChange={(keys) => {
                const next = Array.from(keys)[0];
                const draft = historyItems.find((item) => item.id === next);
                if (draft) handleSelectDraft(draft);
              }}>
                {historyItems.map((draft) => (
                  <Item key={draft.id}>{draft.type} — {new Date(draft.createdAt).toLocaleTimeString()}</Item>
                ))}
              </ListView>
            </View>

            <View flex={1} backgroundColor="gray-100" padding="size-300" borderRadius="medium">
              <Heading level={3}>Session history</Heading>
              <ListView aria-label="session history">
                {historyItems.slice(0, 8).map((entry) => (
                  <Item key={`${entry.id}-history`}>{entry.type}: {entry.changedKey}</Item>
                ))}
              </ListView>
            </View>
          </Flex>
        </Flex>
      </Content>
    </div>
  );
}

export default App;
