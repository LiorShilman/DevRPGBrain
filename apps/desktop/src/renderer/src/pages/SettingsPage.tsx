import { useEffect, useState } from 'react'
import { settingsApi, AppSettings } from '../services/api'

type Provider = 'mock' | 'openai' | 'claude'

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // form state
  const [provider, setProvider] = useState<Provider>('mock')
  const [openAiKey, setOpenAiKey] = useState('')
  const [openAiModel, setOpenAiModel] = useState('')
  const [claudeKey, setClaudeKey] = useState('')
  const [claudeModel, setClaudeModel] = useState('')

  useEffect(() => {
    settingsApi.get()
      .then((s) => {
        setSettings(s)
        setProvider(s.aiProvider)
        setOpenAiModel(s.openAiModel)
        setClaudeModel(s.claudeModel)
      })
      .catch(() => setError('Could not load settings. Make sure npm run dev:api is running.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await settingsApi.update({
        aiProvider: provider,
        ...(openAiKey ? { openAiApiKey: openAiKey } : {}),
        openAiModel: openAiModel || undefined,
        ...(claudeKey ? { claudeApiKey: claudeKey } : {}),
        claudeModel: claudeModel || undefined,
      })
      setSettings(updated)
      setOpenAiKey('')
      setClaudeKey('')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page"><div className="loading">Loading settings…</div></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your AI provider and preferences</p>
        </div>
      </div>

      {error && <div className="error-banner settings-error">{error}</div>}

      <form onSubmit={handleSave} className="settings-form">

        <div className="settings-section">
          <h2 className="settings-section-title">AI Provider</h2>
          <p className="settings-section-desc">
            Choose which AI powers your session summaries, daily briefing, and Project Brain chat.
          </p>

          <div className="provider-cards">
            {([
              { id: 'mock', label: 'Mock (offline)', desc: 'No API key needed. Good for testing without AI calls.' },
              { id: 'openai', label: 'OpenAI', desc: 'Uses gpt-4o-mini by default. Fast and cost-effective.' },
              { id: 'claude', label: 'Claude (Anthropic)', desc: 'Uses claude-haiku by default. Great reasoning.' },
            ] as { id: Provider; label: string; desc: string }[]).map((p) => (
              <label key={p.id} className={`provider-card${provider === p.id ? ' selected' : ''}`}>
                <input
                  type="radio"
                  name="provider"
                  value={p.id}
                  checked={provider === p.id}
                  onChange={() => setProvider(p.id)}
                  className="provider-radio"
                />
                <div className="provider-card-check">{provider === p.id ? '●' : '○'}</div>
                <div>
                  <p className="provider-card-name">{p.label}</p>
                  <p className="provider-card-desc">{p.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {provider === 'openai' && (
          <div className="settings-section">
            <h2 className="settings-section-title">OpenAI Configuration</h2>
            <div className="settings-fields">
              <div className="form-field">
                <label>
                  API Key {settings?.hasOpenAiKey && <span className="settings-key-status">● Key saved</span>}
                </label>
                <input
                  type="password"
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  placeholder={settings?.hasOpenAiKey ? 'Enter new key to replace existing…' : 'sk-proj-…'}
                  autoComplete="off"
                />
              </div>
              <div className="form-field">
                <label>Model <span className="optional">(ריק = gpt-4o-mini)</span></label>
                <input
                  value={openAiModel}
                  onChange={(e) => setOpenAiModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                  list="openai-models"
                />
                <datalist id="openai-models">
                  <option value="gpt-4.1" />
                  <option value="gpt-4.1-mini" />
                  <option value="gpt-4.1-nano" />
                  <option value="gpt-4o" />
                  <option value="gpt-4o-mini" />
                  <option value="o3" />
                  <option value="o3-mini" />
                  <option value="o4-mini" />
                </datalist>
                <p className="settings-model-hint">
                  מומלץ: <ModelChip name="gpt-4.1" onClick={setOpenAiModel} /> ·{' '}
                  מהיר וזול: <ModelChip name="gpt-4.1-mini" onClick={setOpenAiModel} /> ·{' '}
                  הסקה: <ModelChip name="o4-mini" onClick={setOpenAiModel} />
                </p>
              </div>
            </div>
          </div>
        )}

        {provider === 'claude' && (
          <div className="settings-section">
            <h2 className="settings-section-title">Claude (Anthropic) Configuration</h2>
            <div className="settings-fields">
              <div className="form-field">
                <label>
                  API Key {settings?.hasClaudeKey && <span className="settings-key-status">● Key saved</span>}
                </label>
                <input
                  type="password"
                  value={claudeKey}
                  onChange={(e) => setClaudeKey(e.target.value)}
                  placeholder={settings?.hasClaudeKey ? 'Enter new key to replace existing…' : 'sk-ant-…'}
                  autoComplete="off"
                />
              </div>
              <div className="form-field">
                <label>Model <span className="optional">(ריק = claude-sonnet-4-6)</span></label>
                <input
                  value={claudeModel}
                  onChange={(e) => setClaudeModel(e.target.value)}
                  placeholder="claude-sonnet-4-6"
                  list="claude-models"
                />
                <datalist id="claude-models">
                  <option value="claude-opus-4-7" />
                  <option value="claude-sonnet-4-6" />
                  <option value="claude-haiku-4-5-20251001" />
                </datalist>
                <p className="settings-model-hint">
                  הכי חכם: <ModelChip name="claude-opus-4-7" onClick={setClaudeModel} /> ·{' '}
                  מאוזן: <ModelChip name="claude-sonnet-4-6" onClick={setClaudeModel} /> ·{' '}
                  מהיר: <ModelChip name="claude-haiku-4-5-20251001" onClick={setClaudeModel} />
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="settings-footer">
          {saved && <span className="settings-saved">✓ Settings saved</span>}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ModelChip({ name, onClick }: { name: string; onClick: (v: string) => void }) {
  return (
    <button type="button" className="model-chip" onClick={() => onClick(name)}>
      {name}
    </button>
  )
}
