import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, RotateCcw, Download, Music, CheckCircle2, ChevronUp, Clock } from 'lucide-react';

interface LyricLine {
  id: string;
  text: string;
  time: number | null;
}

const formatTimeLrc = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const hundredths = Math.floor((time % 1) * 100);
  return `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}]`;
};

const formatTimeDisplay = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const tenths = Math.floor((time % 1) * 10);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
};

export default function App() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [rawLyrics, setRawLyrics] = useState('');
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  const isSetupComplete = audioUrl && lines.length > 0;

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
    }
  };

  const handleParseLyrics = () => {
    let cleaned = rawLyrics.replace(/<[^>]*>?/gm, '');
    // Strip Genius annotations e.g. [lyric text](123456) -> lyric text
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // Strip section headers like [Intro: bbno$]
    cleaned = cleaned.replace(/\[.*?\]/g, '');
    
    const parsed = cleaned.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((text, index) => ({
        id: `line-${index}`,
        text,
        time: null
      }));
      
    setLines(parsed);
    setCurrentLineIndex(0);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const syncCurrentLine = () => {
    if (currentLineIndex < lines.length) {
      const newLines = [...lines];
      const adjustedTime = Math.max(0, currentTime - 0.15);
      newLines[currentLineIndex].time = adjustedTime;
      setLines(newLines);
      setCurrentLineIndex(prev => prev + 1);
    }
  };

  const clearSync = (index: number) => {
    const newLines = [...lines];
    newLines[index].time = null;
    setLines(newLines);
    if (index < currentLineIndex) {
      setCurrentLineIndex(index);
    }
  };

  const moveUp = () => {
    if (currentLineIndex > 0) {
      setCurrentLineIndex(prev => prev - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }
      
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowDown' || e.code === 'Enter') {
        e.preventDefault();
        syncCurrentLine();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        moveUp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentLineIndex, lines, currentTime]);

  useEffect(() => {
    if (lyricsContainerRef.current) {
      const activeElement = lyricsContainerRef.current.querySelector('.active-line');
      if (activeElement) {
        // Use a slight timeout to ensure rendering is complete before scrolling
        setTimeout(() => {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
      }
    }
  }, [currentLineIndex]);

  const exportLrc = () => {
    const lrcContent = lines
      .filter(line => line.time !== null)
      .map(line => `${formatTimeLrc(line.time!)}${line.text}`)
      .join('\n');
      
    const blob = new Blob([lrcContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${audioFile?.name.replace(/\.[^/.]+$/, "") || 'lyrics'}.lrc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 p-3 backdrop-blur-md sticky top-0 z-30 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-semibold tracking-tight">LRC Maker</h1>
          </div>
          {isSetupComplete && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAudioFile(null);
                  setAudioUrl(null);
                  setLines([]);
                  setRawLyrics('');
                  setCurrentTime(0);
                  setIsPlaying(false);
                }}
                className="p-2 text-zinc-400 hover:text-zinc-100 active:scale-95 transition-all"
                aria-label="Start Over"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={exportLrc}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 active:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {!isSetupComplete ? (
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col gap-6">
          {/* Setup: Audio */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-base font-medium mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold">1</span>
              Audio File
            </h2>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-800 border-dashed rounded-xl cursor-pointer bg-zinc-900/50 active:bg-zinc-800/50 transition-colors">
              <div className="flex flex-col items-center justify-center">
                <Upload className="w-6 h-6 text-zinc-500 mb-2" />
                <p className="text-sm text-zinc-400">
                  <span className="font-semibold text-zinc-300">Tap to upload</span>
                </p>
              </div>
              <input type="file" className="hidden" accept="audio/*" onChange={handleAudioUpload} />
            </label>
            {audioFile && (
              <div className="mt-3 flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                <Music className="w-5 h-5 text-indigo-400 shrink-0" />
                <span className="text-sm truncate flex-1">{audioFile.name}</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              </div>
            )}
          </div>

          {/* Setup: Lyrics */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-col flex-1 min-h-[300px]">
            <h2 className="text-base font-medium mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold">2</span>
              Raw Lyrics
            </h2>
            {/* text-base prevents iOS auto-zoom on focus */}
            <textarea
              value={rawLyrics}
              onChange={(e) => setRawLyrics(e.target.value)}
              placeholder="Paste Genius lyrics here...&#10;[Intro] tags will be stripped."
              className="w-full flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-base text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none font-mono"
            />
            <button
              onClick={handleParseLyrics}
              disabled={!rawLyrics.trim()}
              className="mt-4 w-full py-3.5 bg-zinc-100 text-zinc-900 active:bg-zinc-300 disabled:opacity-50 rounded-xl font-bold text-base transition-colors"
            >
              Parse & Continue
            </button>
          </div>
        </main>
      ) : (
        <div className="flex flex-col flex-1 relative">
          {/* Sticky Player */}
          <div className="bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 p-4 shrink-0 sticky top-[53px] z-20 shadow-md">
            <div className="max-w-5xl mx-auto">
              <audio
                ref={audioRef}
                src={audioUrl || undefined}
                onTimeUpdate={() => {
                  if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
                }}
                onLoadedMetadata={() => {
                  if (audioRef.current) setDuration(audioRef.current.duration);
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
              
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-12 h-12 flex items-center justify-center bg-indigo-600 active:bg-indigo-500 text-white rounded-full transition-colors shrink-0 shadow-lg shadow-indigo-500/20"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                </button>
                
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-zinc-400 font-mono">
                    <span>{formatTimeDisplay(currentTime)}</span>
                    <span>{formatTimeDisplay(duration)}</span>
                  </div>
                  <div 
                    className="h-3 bg-zinc-800 rounded-full overflow-hidden relative"
                    onTouchStart={(e) => {
                      if (audioRef.current) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const touch = e.touches[0];
                        const pos = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
                        audioRef.current.currentTime = pos * duration;
                      }
                    }}
                    onClick={(e) => {
                      if (audioRef.current) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        audioRef.current.currentTime = pos * duration;
                      }
                    }}
                  >
                    <div 
                      className="h-full bg-indigo-500 pointer-events-none"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lyrics List */}
          <div 
            ref={lyricsContainerRef}
            className="flex-1 overflow-y-auto p-4 pb-32 space-y-2 max-w-5xl mx-auto w-full"
          >
            {lines.map((line, index) => {
              const isActive = index === currentLineIndex;
              const isSynced = line.time !== null;
              const isPast = index < currentLineIndex;

              return (
                <div 
                  key={line.id}
                  className={`
                    group flex items-center gap-3 p-3 rounded-xl transition-all
                    ${isActive ? 'bg-indigo-500/15 border border-indigo-500/40 active-line shadow-sm' : 'border border-transparent'}
                    ${isPast && !isActive ? 'opacity-50' : ''}
                  `}
                  onClick={() => setCurrentLineIndex(index)}
                >
                  <div className="w-16 shrink-0 font-mono text-[11px] text-zinc-500 flex flex-col gap-1">
                    {isSynced ? (
                      <span className="text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded inline-block text-center">
                        {formatTimeDisplay(line.time!)}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-center">--:--.-</span>
                    )}
                  </div>
                  
                  <div className={`flex-1 text-base leading-snug ${isActive ? 'text-indigo-50 font-semibold' : 'text-zinc-300'}`}>
                    {line.text}
                  </div>

                  <div className="shrink-0 flex items-center gap-1">
                    {isSynced && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearSync(index);
                        }}
                        className="p-2.5 text-zinc-500 active:text-red-400 active:bg-red-400/10 rounded-lg transition-colors"
                        aria-label="Clear timestamp"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (audioRef.current && isSynced) {
                          audioRef.current.currentTime = line.time!;
                        }
                      }}
                      disabled={!isSynced}
                      className="p-2.5 text-zinc-500 active:text-indigo-400 active:bg-indigo-400/10 rounded-lg transition-colors disabled:opacity-20"
                      aria-label="Jump to time"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            
            {lines.length > 0 && currentLineIndex >= lines.length && (
              <div className="p-8 text-center text-zinc-500 flex flex-col items-center justify-center gap-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/50" />
                <p className="font-medium">All lines synced!</p>
                <p className="text-sm">Tap Export in the top right.</p>
              </div>
            )}
          </div>

          {/* Mobile Fixed Bottom Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 z-30 pb-safe">
            <div className="max-w-5xl mx-auto flex gap-3">
              <button
                onClick={moveUp}
                disabled={currentLineIndex === 0}
                className="w-16 h-16 flex flex-col items-center justify-center gap-1 bg-zinc-800 active:bg-zinc-700 disabled:opacity-50 disabled:active:bg-zinc-800 rounded-2xl text-zinc-300 transition-colors shrink-0"
              >
                <ChevronUp className="w-6 h-6" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Up</span>
              </button>
              
              <button
                onClick={syncCurrentLine}
                disabled={currentLineIndex >= lines.length}
                className="flex-1 h-16 bg-indigo-600 active:bg-indigo-500 disabled:opacity-50 disabled:active:bg-indigo-600 rounded-2xl text-white text-lg font-bold tracking-widest shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Clock className="w-5 h-5" />
                SYNC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
