'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Download,
  Feather,
  FileText,
  Flame,
  Gauge,
  Info,
  Library,
  Menu,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  RefreshCw,
  Rocket,
  RotateCcw,
  Share2,
  Smile,
  Sparkles,
  SunMedium,
  Heart,
  Eye,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react'
import { EvaluationDashboard } from '@/components/evaluation-dashboard'

type ThemeName = 'fantasy' | 'scifi' | 'thriller' | 'romantic' | 'funny'

const themeOptions: { id: ThemeName; label: string; description: string; swatch: string }[] = [
  { id: 'fantasy', label: 'Fantasy', description: 'Magic & myths', swatch: '#9a8de3' },
  { id: 'scifi', label: 'Sci-Fi', description: 'Future & tech', swatch: '#43c6c7' },
  { id: 'thriller', label: 'Thriller', description: 'Suspense & mystery', swatch: '#e05353' },
  { id: 'romantic', label: 'Romantic', description: 'Love & sweet', swatch: '#e87495' },
  { id: 'funny', label: 'Comedy', description: 'Jokes & laughs', swatch: '#f59e0b' },
]

const stories: Record<ThemeName, { title: string; body: string; note: string }> = {
  fantasy: {
    title: "The Dragon's Scale",
    body: "In the ancient forest of Eldoria, a young boy found a shimmering green scale. When he held it to the light, he could hear the distant roar of a creature long thought to be a myth.\n\nHe packed a small bag and set off towards the mountains. He didn't know what he would find, but the scale hummed in his pocket, guiding him forward.",
    note: 'An epic fantasy tale',
  },
  scifi: {
    title: 'Neon Horizon',
    body: 'The hover-cab glided silently over the neon-soaked streets of Sector 4. Kai checked her wrist-pad; the encrypted message was still downloading. If the androids caught her before it finished, the rebellion was over.\n\nA siren wailed in the distance. She pulled her hood up and merged into the crowd of cyborgs.',
    note: 'A futuristic sci-fi story',
  },
  thriller: {
    title: 'The Locked Door',
    body: 'The old house had been empty for years, or so they thought. But every night at exactly 3:15 AM, the floorboards in the attic would creak. One footstep. Then another.\n\nSarah finally decided to investigate. She climbed the stairs with a flashlight, her hand trembling as she reached for the locked door. Then, the handle slowly turned from the inside.',
    note: 'A suspenseful thriller',
  },
  romantic: {
    title: 'Coffee and Rain',
    body: 'It was pouring rain when he ran into the coffee shop, completely soaked. He bumped into a girl holding a stack of books, sending them crashing to the floor. As they both bent down to pick them up, their hands touched.\n\nShe looked up, her eyes meeting his. In that small, quiet moment, the bustling coffee shop seemed to completely disappear.',
    note: 'A sweet romantic story',
  },
  funny: {
    title: 'The Great Pancake Disaster',
    body: 'Bob decided to make pancakes for breakfast. How hard could it be? He mixed flour, eggs, and... was it baking soda or baking powder? He threw both in. Just to be safe.\n\nTen minutes later, the batter expanded so much it crawled out of the bowl and started taking over the kitchen counter. Bob just stood there, holding a spatula, wondering if he should call the fire department.',
    note: 'A hilarious comedy short',
  },
}

export default function Page() {
  const [theme, setTheme] = useState<ThemeName>('fantasy')
  const [prompt, setPrompt] = useState('Write a fantasy story about a boy who finds a dragon scale.')
  const [temperature, setTemperature] = useState(72)
  const [length, setLength] = useState(54)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [sharedToast, setSharedToast] = useState(false)
  const [displayMode, setDisplayMode] = useState<'dark' | 'light'>('dark')
  const [showLibrary, setShowLibrary] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showModelInfo, setShowModelInfo] = useState(false)
  const [generatedText, setGeneratedText] = useState<string | null>(null)
  const story = useMemo(() => stories[theme], [theme])

  const [savedStories, setSavedStories] = useState<Array<{ id: string; title: string; prompt: string; body: string; theme: ThemeName; time: string }>>([
    {
      id: 'init-1',
      title: "The Dragon's Scale",
      prompt: 'Write a fantasy story about a boy who finds a dragon scale.',
      body: "In the ancient forest of Eldoria, a young boy found a shimmering green scale. When he held it to the light, he could hear the distant roar of a creature long thought to be a myth.\n\nHe packed a small bag and set off towards the mountains. He didn't know what he would find, but the scale hummed in his pocket, guiding him forward.",
      theme: 'fantasy',
      time: 'Archive'
    }
  ])

  const currentBody = generatedText || story.body
  const wordCount = useMemo(() => currentBody.trim().split(/\s+/).filter(Boolean).length, [currentBody])
  const charCount = useMemo(() => currentBody.length, [currentBody])
  const readingTime = useMemo(() => Math.max(1, Math.ceil(wordCount / 180)), [wordCount])

  const ThemeIcon = {
    fantasy: Sparkles,
    scifi: Rocket,
    thriller: Eye,
    romantic: Heart,
    funny: Smile,
  }[theme] || Sparkles;

  // Intelligent multi-factor atmosphere detection engine
  useEffect(() => {
    const text = prompt.trim();
    if (!text || text.length < 5) return;

    const timer = setTimeout(async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/analyze-atmosphere', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: text })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.theme && themeOptions.some(t => t.id === data.theme)) {
            setTheme(data.theme);
          }
        }
      } catch (err) {
        // Silently fail if API is unavailable, retaining the current theme
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [prompt]);

  async function generate() {
    setIsGenerating(true)
    setGeneratedText(null)
    try {
      const response = await fetch('http://127.0.0.1:8000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, temperature, length })
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned status ${response.status}`);
      }
      const data = await response.json()
      if (data.story) {
        setGeneratedText(data.story)
        // Automatically save to Library session history
        const newEntry = {
          id: Date.now().toString(),
          title: prompt.slice(0, 30).trim() + (prompt.length > 30 ? '...' : ''),
          prompt: prompt,
          body: data.story,
          theme: theme,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        setSavedStories(prev => [newEntry, ...prev.slice(0, 19)])
      } else {
        throw new Error("No story received from the model.")
      }
    } catch (e: any) {
      console.error(e)
      setGeneratedText(`Error: ${e.message || "Failed to connect to the local AI. Please make sure the Python API is running on http://127.0.0.1:8000!"}`)
    } finally {
      setIsGenerating(false)
    }
  }

  function chooseTheme(nextTheme: ThemeName) {
    setTheme(nextTheme)
    const prompts: Record<ThemeName, string> = {
      fantasy: 'Write a fantasy story about a boy who finds a dragon scale.',
      scifi: 'Write a sci-fi story about a hacker running from androids.',
      thriller: 'Write a thriller story about a haunted house.',
      romantic: 'Write a romantic story about two people meeting in a coffee shop.',
      funny: 'Write a funny story about a breakfast recipe gone wrong.',
    }
    setPrompt(prompts[nextTheme])
  }

  async function copyStory() {
    const textToCopy = generatedText ? generatedText : `${story.title}\n\n${story.body}`
    await navigator.clipboard?.writeText(textToCopy)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  function downloadStory() {
    const title = generatedText ? "Story - " + prompt.slice(0, 24).trim() : story.title
    const body = generatedText ? generatedText : story.body
    const content = `${title}\nAtmosphere: ${themeOptions.find(t => t.id === theme)?.label}\nPrompt: ${prompt}\n\n${body}\n\n---\nCrafted with Story-SLM (7B parameters)`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 1600)
  }

  async function shareStory() {
    const textToShare = generatedText ? generatedText : `${story.title}\n\n${story.body}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: story.title,
          text: textToShare,
        })
        setShowMoreMenu(false)
        return
      } catch (err) {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard?.writeText(textToShare)
    setSharedToast(true)
    setShowMoreMenu(false)
    setTimeout(() => setSharedToast(false), 1600)
  }

  return (
    <main className={`story-app ${displayMode === 'light' ? 'light-mode' : ''}`} data-theme={theme}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />
      
      {/* FLOATING EXPAND BUTTON (when sidebar is collapsed on desktop) */}
      {!showControls && (
        <button
          className="expand-rail-btn desktop-only"
          onClick={() => setShowControls(true)}
          aria-label="Open controls"
          title="Open controls sidebar"
        >
          <PanelLeftOpen size={16} />
          <span>Controls</span>
        </button>
      )}

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Feather size={16} strokeWidth={2.4} /></div>
          <div><span className="brand-name">story<span>-</span>slm</span><span className="brand-status"><i /> local studio</span></div>
        </div>
        <div className="top-actions">
          <button
            className="icon-button desktop-only"
            aria-label="Open library"
            title="Open story library & archives"
            onClick={() => setShowLibrary(true)}
          >
            <Library size={18} />
          </button>
          <button
            className="icon-button desktop-only"
            aria-label="Toggle display theme"
            title={displayMode === 'dark' ? 'Switch to light parchment mode' : 'Switch to dark studio mode'}
            onClick={() => setDisplayMode(prev => prev === 'dark' ? 'light' : 'dark')}
          >
            {displayMode === 'dark' ? <SunMedium size={18} /> : <Moon size={18} />}
          </button>
          <button
            className="icon-button mobile-only"
            aria-label="Toggle controls"
            onClick={() => setShowControls(!showControls)}
          >
            {showControls ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div
            className="avatar"
            onClick={() => setShowModelInfo(true)}
            title="View Model specifications"
            style={{ cursor: 'pointer' }}
          >
            A
          </div>
        </div>
      </header>

      <div className="workspace">
        <aside className={`control-rail ${showControls ? 'is-open' : ''}`}>
          <div className="rail-heading">
            <div><p className="eyebrow">CREATE</p><h1>Story studio</h1></div>
            <button
              className="collapse-button desktop-only"
              aria-label="Collapse controls"
              title="Collapse sidebar"
              onClick={() => setShowControls(false)}
            >
              <PanelLeftClose size={18} />
            </button>
          </div>

          <div className="prompt-block">
            <label htmlFor="story-prompt">Your story begins with</label>
            <div className="prompt-field">
              <textarea
                id="story-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    generate();
                  }
                }}
                placeholder="Type your story starter or idea..."
                aria-label="Story prompt"
              />
              <span className="prompt-count">{prompt.length}/240</span>
            </div>
          </div>

          <section className="control-section" aria-labelledby="mood-title">
            <div className="section-label"><span id="mood-title">Atmosphere</span><span className="active-theme">{themeOptions.find((item) => item.id === theme)?.label} <span style={{ opacity: 0.6, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>· auto</span></span></div>
            <div className="theme-grid">
              {themeOptions.map((item) => (
                <button key={item.id} className={`theme-tile ${theme === item.id ? 'selected' : ''}`} onClick={() => chooseTheme(item.id)} aria-pressed={theme === item.id}>
                  <span className="theme-swatch" style={{ background: item.swatch }} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="control-section parameter-section" aria-labelledby="parameters-title">
            <div className="section-label"><span id="parameters-title">Parameters</span><Gauge size={15} /></div>
            <label className="range-control"><span>Creativity <b>{temperature}%</b></span><input type="range" min="0" max="100" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} /></label>
            <label className="range-control"><span>Story length <b>{length}%</b></span><input type="range" min="0" max="100" value={length} onChange={(event) => setLength(Number(event.target.value))} /></label>
          </section>

          <div className="rail-footer">
            <button className={`generate-button ${isGenerating ? 'loading' : ''}`} onClick={generate} disabled={isGenerating}>
              {isGenerating ? <RefreshCw className="spin" size={18} /> : <WandSparkles size={18} />}
              <span>{isGenerating ? 'Finding the thread...' : 'Generate story'}</span><span className="shortcut">⌘ ↵</span>
            </button>
            <p
              className="model-note"
              onClick={() => setShowModelInfo(true)}
              style={{ cursor: 'pointer' }}
              title="Click to view model details"
            >
              <span className="pulse-dot" /> Story-SLM · 7B parameters
            </p>
          </div>
        </aside>

        <section className="story-canvas" aria-label="Generated story">
          <div className="canvas-toolbar">
            <div className="canvas-context"><span className="live-dot" /> <span>{isGenerating ? 'Composing a new story' : 'Generated just now'}</span></div>
            <div className="canvas-actions">
              <button
                onClick={copyStory}
                aria-label="Copy story"
                title={copied ? 'Copied to clipboard!' : 'Copy story'}
              >
                {copied ? <Check size={17} style={{ color: 'var(--theme-accent)' }} /> : <Copy size={17} />}
              </button>
              <button
                onClick={downloadStory}
                aria-label="Download story"
                title={downloaded ? 'Downloaded story!' : 'Download story (.txt)'}
              >
                {downloaded ? <Check size={17} style={{ color: 'var(--theme-accent)' }} /> : <Download size={17} />}
              </button>
              <div className="more-options-wrapper">
                <button
                  onClick={() => setShowMoreMenu(prev => !prev)}
                  aria-label="More story options"
                  title="More story options"
                >
                  <MoreHorizontal size={18} />
                </button>
                {showMoreMenu && (
                  <div className="more-menu-dropdown">
                    <button onClick={() => { setShowStats(true); setShowMoreMenu(false); }}>
                      <FileText size={14} />
                      <span>Story statistics</span>
                    </button>
                    <button onClick={shareStory}>
                      <Share2 size={14} />
                      <span>{sharedToast ? 'Copied to clipboard!' : 'Share story'}</span>
                    </button>
                    <div className="more-menu-divider" />
                    <button onClick={() => { setGeneratedText(null); setShowMoreMenu(false); }}>
                      <RotateCcw size={14} />
                      <span>Reset to template</span>
                    </button>
                    <button onClick={() => { setGeneratedText(''); setPrompt(''); setShowMoreMenu(false); }} style={{ color: '#ef7070' }}>
                      <Trash2 size={14} />
                      <span>Clear canvas</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <article className={`story-content ${isGenerating ? 'is-generating' : ''}`} style={{ position: 'relative', overflow: 'hidden' }}>
            <ThemeIcon size={340} strokeWidth={1} style={{ position: 'absolute', top: -40, right: -60, opacity: 0.04, zIndex: 0, pointerEvents: 'none', color: 'var(--theme-accent, inherit)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="story-kicker"><ThemeIcon size={14} style={{ color: 'var(--theme-accent, inherit)' }} /> {story.note}</div>
              <h2>{generatedText ? "Your Story" : story.title}</h2>
              <div className="story-rule" />
              {(generatedText || story.body).split('\n\n').map((paragraph, idx) => <p key={idx}>{paragraph}</p>)}
              <div className="story-endmark"><span /> <ThemeIcon size={15} style={{ color: 'var(--theme-accent, inherit)' }} /> <span /></div>
            </div>
          </article>
          <div className="canvas-bottom">
            <span>{wordCount} words · {readingTime} min read</span>
            <span>Crafted with intention</span>
            <span>{copied ? 'Copied to clipboard' : downloaded ? 'Downloaded to disk' : sharedToast ? 'Share link ready' : 'A small story, made for you'}</span>
          </div>
        </section>
      </div>

      <EvaluationDashboard text={prompt} />

      {/* STORY LIBRARY MODAL */}
      {showLibrary && (
        <div className="modal-backdrop" onClick={() => setShowLibrary(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow" style={{ margin: 0, fontSize: '10px' }}>ARCHIVE & INSPIRATION</p>
                <h2>Story Library</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowLibrary(false)} aria-label="Close library">
                <X size={18} />
              </button>
            </div>

            <div className="library-section-title">
              <BookOpen size={14} /> Session Archive ({savedStories.length})
            </div>
            {savedStories.length === 0 ? (
              <div className="library-empty">No stories generated yet. Generate a story to save it to your session archive!</div>
            ) : (
              <div className="library-list">
                {savedStories.map((item) => (
                  <div
                    key={item.id}
                    className="library-item"
                    onClick={() => {
                      setPrompt(item.prompt)
                      setTheme(item.theme)
                      setGeneratedText(item.body)
                      setShowLibrary(false)
                    }}
                  >
                    <div className="library-item-top">
                      <span className="library-item-title">{item.title}</span>
                      <span className="library-item-tag">{item.theme} · {item.time}</span>
                    </div>
                    <div className="library-item-snippet">{item.body}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="library-section-title" style={{ marginTop: '26px' }}>
              <Sparkles size={14} /> Curated Genre Starters
            </div>
            <div className="library-list">
              {Object.entries(stories).map(([themeKey, sample]) => (
                <div
                  key={themeKey}
                  className="library-item"
                  onClick={() => {
                    chooseTheme(themeKey as ThemeName)
                    setGeneratedText(null)
                    setShowLibrary(false)
                  }}
                >
                  <div className="library-item-top">
                    <span className="library-item-title">{sample.title}</span>
                    <span className="library-item-tag">{themeKey}</span>
                  </div>
                  <div className="library-item-snippet">{sample.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STORY STATISTICS MODAL */}
      {showStats && (
        <div className="modal-backdrop" onClick={() => setShowStats(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow" style={{ margin: 0, fontSize: '10px' }}>ANALYSIS</p>
                <h2>Story Metrics</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowStats(false)} aria-label="Close metrics">
                <X size={18} />
              </button>
            </div>
            <div className="stats-grid">
              <div className="stat-box">
                <strong>{wordCount}</strong>
                <span>Total Words</span>
              </div>
              <div className="stat-box">
                <strong>~{readingTime} min</strong>
                <span>Reading Time</span>
              </div>
              <div className="stat-box">
                <strong>{charCount}</strong>
                <span>Characters</span>
              </div>
              <div className="stat-box">
                <strong>{themeOptions.find(t => t.id === theme)?.label}</strong>
                <span>Atmosphere</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODEL PROFILE MODAL */}
      {showModelInfo && (
        <div className="modal-backdrop" onClick={() => setShowModelInfo(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow" style={{ margin: 0, fontSize: '10px' }}>ARCHITECTURE SPECIFICATION</p>
                <h2>Story-SLM 29M</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModelInfo(false)} aria-label="Close model info">
                <X size={18} />
              </button>
            </div>
            <div className="stats-grid">
              <div className="stat-box">
                <strong>29.63M</strong>
                <span>Parameters</span>
              </div>
              <div className="stat-box">
                <strong>8 Layers</strong>
                <span>Transformer Depth</span>
              </div>
              <div className="stat-box">
                <strong>512</strong>
                <span>Embedding Dim</span>
              </div>
              <div className="stat-box">
                <strong>8,192</strong>
                <span>BPE Vocab Size</span>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#8aa1a3', lineHeight: 1.6, marginTop: '20px' }}>
              Story-SLM is a tailored Small Language Model designed for instant, local story generation. Trained on the TinyStories corpus with step 19,999 weights.
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
