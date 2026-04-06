'use client';

import { useState, useMemo } from 'react';
import { TET24, TET31, FiveLimitJI, PtolemaicJI, WerckmeisterIII, BohlenPierce, MajorScale12TET, NeutralScale24TET, MeantoneMajor31TET, BayatiScale24TET, NeutralTriad24TET, BohlenPierceLambdaChord, BohlenPierceMollChord, BohlenPierceChromaticScale, MajorTriad, ChromaticScale } from '@/lib/music-theory/presets';
import { TET12 } from '@/lib/music-theory/tuning';
import { Scale } from '@/lib/music-theory/scale';
import { parseChordSymbol, parseRomanProgression, parseScaleSymbol, parseNote } from '@/lib/music-theory/parser';
import { ABCBridge } from '@/lib/music-theory/abc-bridge';
import { Polyrhythm, TimeSignature } from '@/lib/music-theory/rhythm';
import { NeoRiemannian } from '@/lib/music-theory/neo-riemannian';
import { KeyDetection } from '@/lib/music-theory/key-detection';
import { SheetMusic } from '@/components/SheetMusic';
import { Chord } from '@/lib/music-theory/chord';
import { Note } from '@/lib/music-theory/note';
import { freqToMidi, midiToFreq, get12TETName, getIntervalName, getEnharmonics, getSemanticIntervalName, freqToMidiPitchBend } from '@/lib/music-theory/utils';
import { synth } from '@/lib/audio';
import { Play, Square, Music, ArrowUpRight, ArrowDownRight, RotateCw, Layers, Activity, Sparkles, Calculator, BookOpen, Download, Compass, Network } from 'lucide-react';
import { EDO } from '@/lib/music-theory/tuning';
import { Interval } from '@/lib/music-theory/interval';
import { CircleOfFifths } from '@/lib/music-theory/circle';
import { Harmony } from '@/lib/music-theory/harmony';
import { SetTheory } from '@/lib/music-theory/set-theory';
import { parseScala } from '@/lib/music-theory/scala';

export default function Home() {
  const [activeTuning, setActiveTuning] = useState<string>('12-TET (Standard)');
  const [rootStep, setRootStep] = useState<number>(-9); // C4 in 12-TET
  const [playingNotes, setPlayingNotes] = useState<Set<number>>(new Set());
  
  const [chordInput, setChordInput] = useState<string>('Cmaj9/E');
  const [chordTranspose, setChordTranspose] = useState<number>(0);
  const [chordInversion, setChordInversion] = useState<number>(0);
  const [voicingType, setVoicingType] = useState<'close' | 'drop2' | 'rootless' | 'open'>('close');

  const [progressionInput, setProgressionInput] = useState<string>('ii7 - V7alt - Imaj7');
  const [progressionKey, setProgressionKey] = useState<string>('C major');

  const [scaleInput, setScaleInput] = useState<string>('D dorian');
  const [scaleMode, setScaleMode] = useState<number>(1);

  const [customEdo, setCustomEdo] = useState<number>(19);
  const [ratioNum, setRatioNum] = useState<number>(3);
  const [ratioDen, setRatioDen] = useState<number>(2);
  const [centsInput, setCentsInput] = useState<number>(700);
  const [midiInput, setMidiInput] = useState<number>(69);
  const [freqInput, setFreqInput] = useState<number>(440);

  const [circleKey, setCircleKey] = useState<string>('C');
  const [note1Midi, setNote1Midi] = useState<number>(60); // C4
  const [note2Midi, setNote2Midi] = useState<number>(67); // G4

  const [harmonyChord1, setHarmonyChord1] = useState<string>('G7');
  const [harmonyChord2, setHarmonyChord2] = useState<string>('Cmaj7');
  const [harmonyKey, setHarmonyKey] = useState<string>('C major');
  
  const [detectorInput, setDetectorInput] = useState<string>('C4 E4 G4 Bb4');

  const [scalaInput, setScalaInput] = useState<string>(`! pelog.scl
!
Javanese Pelog scale
7
!
120.0
250.0
400.0
550.0
700.0
950.0
2/1`);

  const tunings = {
    '12-TET (Standard)': TET12,
    '24-TET (Quarter tones)': TET24,
    '31-TET (Meantone)': TET31,
    'Just Intonation (5-Limit)': FiveLimitJI,
    'Just Intonation (Ptolemaic)': PtolemaicJI,
    'Werckmeister III': WerckmeisterIII,
    'Bohlen-Pierce': BohlenPierce,
  };

  const currentTuning = useMemo(() => {
    if (activeTuning === 'Custom EDO') return new EDO(customEdo);
    return tunings[activeTuning as keyof typeof tunings];
  }, [activeTuning, customEdo]);

  const currentScale = useMemo(() => {
    // Let the tuning system handle the conversion from standard 12-TET steps
    const actualRoot = currentTuning.getStepFromStandard(rootStep);

    if (activeTuning === '12-TET (Standard)') return MajorScale12TET(actualRoot);
    if (activeTuning === '24-TET (Quarter tones)') return NeutralScale24TET(actualRoot);
    if (activeTuning === '31-TET (Meantone)') return MeantoneMajor31TET(actualRoot);
    
    // For JI and others, just show the basic octave
    return ChromaticScale(currentTuning, actualRoot);
  }, [activeTuning, rootStep, currentTuning]);

  const notes = currentScale.getNotes(1);

  const parsedChordData = useMemo(() => {
    try {
      let chord = parseChordSymbol(chordInput);
      if (chordTranspose !== 0) {
        chord = chord.transpose(chordTranspose);
      }
      // Apply voicing first, then inversion (or vice versa, but voicing is usually structural)
      let notes = chord.getVoicing(voicingType);
      
      // If we want to apply inversion to a custom voicing, we can just use the base chord's inversion logic
      // But for simplicity in this demo, if voicing is not 'close', we might skip inversion or apply it manually.
      // Let's just use the chord's inversion if close, otherwise just the voicing.
      if (voicingType === 'close') {
        notes = chord.getInversion(chordInversion);
      }
      return { notes, rootStep: chord.rootStep };
    } catch (e) {
      return null;
    }
  }, [chordInput, chordTranspose, chordInversion, voicingType]);

  const parsedProgression = useMemo(() => {
    try {
      const chords = parseRomanProgression(progressionInput, progressionKey);
      
      // Apply Voice Leading!
      const voiceLedProgression: Note[][] = [];
      let currentNotes: Note[] = [];
      
      for (const chord of chords) {
        const nextNotes = Chord.smoothTransition(currentNotes, chord);
        voiceLedProgression.push(nextNotes);
        currentNotes = nextNotes;
      }
      
      return { chords, voiceLedProgression };
    } catch (e) {
      return null;
    }
  }, [progressionInput, progressionKey]);

  const parsedScaleData = useMemo(() => {
    try {
      const scale = parseScaleSymbol(scaleInput);
      if (scaleMode !== 1) {
        const modeScale = scale.getMode(scaleMode);
        return { notes: modeScale.getNotes(1), rootStep: modeScale.rootStep };
      }
      return { notes: scale.getNotes(1), rootStep: scale.rootStep };
    } catch (e) {
      return null;
    }
  }, [scaleInput, scaleMode]);

  const handlePlay = (id: number, freq: number) => {
    synth.playNote(id, freq);
    setPlayingNotes(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleStop = (id: number) => {
    synth.stopNote(id);
    setPlayingNotes(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const playNotes = (notesToPlay: Note[], baseId: number, duration: number = 1500) => {
    notesToPlay.forEach((note, idx) => {
      setTimeout(() => {
        synth.playNote(baseId + idx, note.frequency);
        setTimeout(() => synth.stopNote(baseId + idx), duration);
      }, idx * 100);
    });
  };

  const playChordSimultaneous = (notesToPlay: Note[], baseId: number, duration: number = 2500) => {
    notesToPlay.forEach((note, idx) => {
      synth.playNote(baseId + idx, note.frequency);
      setTimeout(() => synth.stopNote(baseId + idx), duration);
    });
  };

  const playPureza = (isJI: boolean) => {
    const tuning = isJI ? FiveLimitJI : TET12;
    const chord = MajorTriad(tuning, -9); // C4 Major
    playChordSimultaneous(chord.getNotes(), isJI ? 4000 : 4100);
  };

  const playMaqam = () => {
    const scale = NeutralScale24TET(-18); // C4 in 24-TET is -18
    const notes = scale.getNotes(1);
    notes.forEach((n, i) => {
      setTimeout(() => {
        synth.playNote(4200 + i, n.frequency);
        setTimeout(() => synth.stopNote(4200 + i), 300);
      }, i * 300);
    });
  };

  const playBayatiScale = () => {
    const scale = BayatiScale24TET(-18);
    const notes = scale.getNotes(1);
    notes.forEach((n, i) => {
      setTimeout(() => {
        synth.playNote(4280 + i, n.frequency);
        setTimeout(() => synth.stopNote(4280 + i), 300);
      }, i * 300);
    });
  };

  const playNeutralChord = () => {
    const chord = NeutralTriad24TET(-18);
    playChordSimultaneous(chord.getNotes(), 4250);
  };

  const playBohlenPierce = () => {
    const chord = BohlenPierceLambdaChord(0);
    playChordSimultaneous(chord.getNotes(), 4300);
  };

  const playBPMinor = () => {
    const chord = BohlenPierceMollChord(0);
    playChordSimultaneous(chord.getNotes(), 4350);
  };

  const playBPScale = () => {
    const scale = BohlenPierceChromaticScale(0);
    const notes = scale.getNotes(1);
    notes.forEach((n, i) => {
      setTimeout(() => {
        synth.playNote(4380 + i, n.frequency);
        setTimeout(() => synth.stopNote(4380 + i), 200);
      }, i * 200);
    });
  };

  const playChord = () => {
    if (!parsedChordData) return;
    playNotes(parsedChordData.notes, 1000);
  };

  const playProgression = () => {
    if (!parsedProgression) return;
    
    // Clear any previous progression timeouts if we wanted to be perfectly safe,
    // but for now we'll just make sure they don't overlap by adjusting durations.
    const chordDuration = 1200; // ms
    
    parsedProgression.voiceLedProgression.forEach((notes, chordIdx) => {
      setTimeout(() => {
        // Play simultaneously for a more cohesive progression sound, 
        // and stop them just before the next chord starts.
        playChordSimultaneous(notes, 2000 + chordIdx * 10, chordDuration - 50);
      }, chordIdx * chordDuration);
    });
  };

  const playScale = () => {
    if (!parsedScaleData) return;
    parsedScaleData.notes.forEach((note, idx) => {
      setTimeout(() => {
        synth.playNote(3000 + idx, note.frequency);
        setTimeout(() => synth.stopNote(3000 + idx), 300);
      }, idx * 300);
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <header className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white">
              Universal Music Theory
            </h1>
            <a 
              href="/example.html" 
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
            >
              Ver ejemplo en Vanilla HTML →
            </a>
          </div>
          <p className="text-lg text-neutral-400 max-w-2xl">
            A generalized library for representing harmonic theory, supporting standard equal temperaments and microtonal systems like Just Intonation and arbitrary EDOs.
          </p>
        </header>

        <div className="flex flex-col gap-8">
          {/* Chord Parser Section */}
          <section className="space-y-6 bg-indigo-950/30 border border-indigo-900/50 rounded-2xl p-6">
            <div className="space-y-2">
              <h2 className="text-xl font-medium text-white flex items-center gap-2">
                <Music className="w-5 h-5 text-indigo-400" />
                Acordes & Voicings
              </h2>
            </div>

            <div className="space-y-4">
              <input 
                type="text" 
                value={chordInput}
                onChange={(e) => setChordInput(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-xl font-mono text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full"
                placeholder="Ej: Cmaj7/E"
              />
              
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 rounded-lg p-1">
                  <button onClick={() => setChordTranspose(t => t - 1)} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"><ArrowDownRight className="w-4 h-4" /></button>
                  <span className="text-sm font-mono w-8 text-center text-neutral-300">{chordTranspose > 0 ? '+' : ''}{chordTranspose}</span>
                  <button onClick={() => setChordTranspose(t => t + 1)} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"><ArrowUpRight className="w-4 h-4" /></button>
                </div>

                <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 rounded-lg p-1">
                  <button onClick={() => { setVoicingType('close'); setChordInversion(i => (i + 1) % 4); }} className="px-3 py-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors flex items-center gap-2 text-sm">
                    <RotateCw className="w-4 h-4" /> Inv: {chordInversion}
                  </button>
                </div>

                <select 
                  value={voicingType} 
                  onChange={(e) => setVoicingType(e.target.value as any)}
                  className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="close">Close (Normal)</option>
                  <option value="drop2">Drop 2</option>
                  <option value="drop3">Drop 3</option>
                  <option value="quartal">Quartal (Por cuartas)</option>
                  <option value="open">Open (Spread)</option>
                  <option value="rootless">Rootless</option>
                </select>
              </div>

              <button 
                onClick={playChord}
                disabled={!parsedChordData}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 w-full justify-center"
              >
                <Play className="w-4 h-4 fill-current" />
                Tocar Acorde
              </button>
            </div>

            {parsedChordData ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                {parsedChordData.notes.map((n, i) => (
                  <div key={i} className="bg-neutral-900/80 border border-neutral-800 rounded p-3 text-sm font-mono flex flex-col items-center text-center gap-1">
                    <span className="text-indigo-400 font-bold text-lg">{get12TETName(n.stepsFromBase)}</span>
                    <span className="text-neutral-400 text-xs">{getIntervalName(n.stepsFromBase - parsedChordData.rootStep, activeTuning === '12-TET (Standard)')}</span>
                    <span className="text-neutral-300 mt-1">{n.frequency.toFixed(1)} Hz</span>
                    <span className="text-xs text-neutral-500">MIDI {freqToMidi(n.frequency).toFixed(1)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-red-400 text-sm">Acorde no reconocido</p>
            )}
          </section>

          {/* Roman Numerals & Voice Leading Section */}
          <section className="space-y-6 bg-emerald-950/30 border border-emerald-900/50 rounded-2xl p-6">
            <div className="space-y-2">
              <h2 className="text-xl font-medium text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                Voice Leading & Funciones
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={progressionKey}
                  onChange={(e) => setProgressionKey(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-1/3"
                  placeholder="Key (e.g. C major)"
                />
                <input 
                  type="text" 
                  value={progressionInput}
                  onChange={(e) => setProgressionInput(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-2/3"
                  placeholder="Progression (e.g. ii - V7 - I)"
                />
              </div>

              <button 
                onClick={playProgression}
                disabled={!parsedProgression}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 w-full justify-center"
              >
                <Play className="w-4 h-4 fill-current" />
                Tocar Progresión (Conducción Suave)
              </button>
            </div>

            {parsedProgression ? (
              <div className="space-y-6">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <SheetMusic 
                    abcNotation={ABCBridge.wrapInHeaders(
                      ABCBridge.progressionToABC(parsedProgression.voiceLedProgression),
                      'Progresión Armónica',
                      '4/4',
                      progressionKey.split(' ')[0] || 'C'
                    )} 
                  />
                </div>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                  {parsedProgression.chords.map((chord, i) => {
                  const issues = i > 0 ? Harmony.checkVoiceLeading(
                    parsedProgression.voiceLedProgression[i-1],
                    parsedProgression.voiceLedProgression[i]
                  ) : [];

                  return (
                    <div key={i} className="bg-neutral-900/80 border border-neutral-800 rounded p-4 text-sm flex flex-col">
                      <div className="font-medium text-emerald-400 mb-3 text-lg border-b border-emerald-900/50 pb-2">
                        {progressionInput.split(/[\s-]+/).filter(t=>t)[i]} → {chord.name}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {parsedProgression.voiceLedProgression[i].map((n, j) => (
                          <span key={j} className="text-neutral-300 font-mono text-xs bg-black/30 px-2 py-1.5 rounded flex flex-col items-center min-w-[60px]">
                            <span className="text-emerald-300 font-bold mb-1">{get12TETName(n.stepsFromBase)}</span>
                            <span className="text-emerald-400/70 text-[10px] mb-1">{getIntervalName(n.stepsFromBase - chord.rootStep, activeTuning === '12-TET (Standard)')}</span>
                            <span>{n.frequency.toFixed(1)}Hz</span>
                            <span className="text-[10px] text-emerald-500/70">M:{freqToMidi(n.frequency).toFixed(1)}</span>
                          </span>
                        ))}
                      </div>
                      
                      {issues.length > 0 && (
                        <div className="mt-auto pt-3 border-t border-red-900/30 space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-red-500/70 font-bold mb-1">Alertas de Conducción</div>
                          {issues.map((issue, idx) => (
                            <div key={idx} className="text-xs text-red-400 bg-red-950/30 px-2 py-1 rounded">
                              ⚠️ {issue.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            ) : (
              <p className="text-red-400 text-sm">Progresión o tonalidad no reconocida</p>
            )}
          </section>

          {/* Scale Parser & Modes Section */}
          <section className="space-y-6 bg-amber-950/30 border border-amber-900/50 rounded-2xl p-6">
            <div className="space-y-2">
              <h2 className="text-xl font-medium text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-400" />
                Escalas y Modos
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={scaleInput}
                  onChange={(e) => setScaleInput(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 w-2/3"
                  placeholder="Ej: C harmonic minor"
                />
                <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 rounded-lg p-1 w-1/3">
                  <span className="text-xs text-neutral-400 pl-2">Modo:</span>
                  <input 
                    type="number" 
                    min="1" max="7"
                    value={scaleMode}
                    onChange={(e) => setScaleMode(parseInt(e.target.value) || 1)}
                    className="bg-transparent text-white w-full outline-none font-mono text-center"
                  />
                </div>
              </div>

              <button 
                onClick={playScale}
                disabled={!parsedScaleData}
                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 w-full justify-center"
              >
                <Play className="w-4 h-4 fill-current" />
                Tocar Escala
              </button>
            </div>

            {parsedScaleData ? (
              <div className="space-y-6">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <SheetMusic 
                    abcNotation={ABCBridge.wrapInHeaders(
                      ABCBridge.scaleToABC(parseScaleSymbol(scaleInput).getMode(scaleMode)),
                      `${scaleInput} (Modo ${scaleMode})`,
                      '4/4',
                      scaleInput.split(' ')[0] || 'C'
                    )} 
                  />
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-3 pt-2">
                  {parsedScaleData.notes.map((n, i) => (
                  <div key={i} className="bg-neutral-900/80 border border-neutral-800 rounded p-3 text-xs font-mono text-neutral-300 flex flex-col items-center text-center gap-1">
                    <span className="text-amber-400 font-bold text-lg">{get12TETName(n.stepsFromBase)}</span>
                    <span className="text-neutral-400 text-[10px]">{getIntervalName(n.stepsFromBase - parsedScaleData.rootStep, activeTuning === '12-TET (Standard)')}</span>
                    <span className="mt-1">{n.frequency.toFixed(1)} Hz</span>
                    <span className="text-[10px] text-neutral-500">MIDI {freqToMidi(n.frequency).toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
            ) : (
              <p className="text-red-400 text-sm">Escala no reconocida</p>
            )}
          </section>
        </div>

        {/* Experiencias Microtonales */}
        <section className="space-y-6 bg-rose-950/30 border border-rose-900/50 rounded-2xl p-6 md:p-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-medium text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-rose-400" />
              Experiencias Microtonales
            </h2>
            <p className="text-neutral-400 text-sm">Escucha la diferencia matemática. Usa auriculares para apreciar los batidos de frecuencia.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Demo 1: Pureza */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4 flex flex-col">
              <h3 className="text-rose-300 font-medium text-lg">1. El Comparador de Pureza</h3>
              <p className="text-xs text-neutral-400 flex-grow">
                Escucha un Acorde Mayor. En 12-TET la tercera mayor está desafinada y crea un "batido" (vibración). En Just Intonation (Afinación Justa) las frecuencias encajan perfectamente.
              </p>
              <div className="space-y-2">
                <button onClick={() => playPureza(false)} className="w-full bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2">
                  <Play className="w-3 h-3 fill-current" /> 12-TET (Tenso)
                </button>
                <button onClick={() => playPureza(true)} className="w-full bg-rose-600/80 hover:bg-rose-500 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2">
                  <Play className="w-3 h-3 fill-current" /> Just Intonation (Puro)
                </button>
              </div>
            </div>

            {/* Demo 2: Cuartos de Tono */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4 flex flex-col">
              <h3 className="text-rose-300 font-medium text-lg">2. El Sabor Oriental</h3>
              <p className="text-xs text-neutral-400 flex-grow">
                La música de Oriente Medio utiliza "cuartos de tono" (notas que caen exactamente entre dos teclas del piano). Escucha una escala Neutral en 24-TET.
              </p>
              <div className="space-y-2 mt-auto">
                <button onClick={playMaqam} className="w-full bg-rose-600/80 hover:bg-rose-500 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2">
                  <Play className="w-3 h-3 fill-current" /> Escala Neutral
                </button>
                <button onClick={playBayatiScale} className="w-full bg-rose-600/80 hover:bg-rose-500 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2">
                  <Play className="w-3 h-3 fill-current" /> Escala Bayati
                </button>
                <button onClick={playNeutralChord} className="w-full bg-rose-600/80 hover:bg-rose-500 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2">
                  <Play className="w-3 h-3 fill-current" /> Acorde Neutral
                </button>
              </div>
            </div>

            {/* Demo 3: Bohlen-Pierce */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4 flex flex-col">
              <h3 className="text-rose-300 font-medium text-lg">3. Música Alienígena</h3>
              <p className="text-xs text-neutral-400 flex-grow">
                El sistema Bohlen-Pierce no usa la octava (2:1), sino la "tritava" (3:1). Escucha un acorde "Lambda", consonante matemáticamente pero alienígena para nuestro cerebro.
              </p>
              <div className="space-y-2 mt-auto">
                <button onClick={playBohlenPierce} className="w-full bg-rose-600/80 hover:bg-rose-500 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2">
                  <Play className="w-3 h-3 fill-current" /> Acorde Mayor (Lambda)
                </button>
                <button onClick={playBPMinor} className="w-full bg-rose-600/80 hover:bg-rose-500 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2">
                  <Play className="w-3 h-3 fill-current" /> Acorde Menor
                </button>
                <button onClick={playBPScale} className="w-full bg-rose-600/80 hover:bg-rose-500 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2">
                  <Play className="w-3 h-3 fill-current" /> Escala Completa (13 pasos)
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-xl font-medium text-white">Tuning System</h2>
              <p className="text-sm text-neutral-400">Select how the octave is divided.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(tunings).map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTuning(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTuning === t 
                      ? 'bg-neutral-700 text-white shadow-lg shadow-black/20' 
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {activeTuning === 'Custom EDO' && (
              <div className="mt-4 flex items-center gap-3 bg-neutral-900/80 p-3 rounded-lg border border-neutral-700 w-max">
                <span className="text-sm text-neutral-300">Divisiones por octava:</span>
                <input 
                  type="number" 
                  min="1" max="120" 
                  value={customEdo} 
                  onChange={e => setCustomEdo(parseInt(e.target.value) || 1)} 
                  className="bg-black border border-neutral-600 rounded px-3 py-1.5 w-24 text-white text-center font-mono focus:outline-none focus:border-indigo-500" 
                />
              </div>
            )}
          </div>

          {/* Scala Parser */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4 mt-6">
            <h3 className="text-lg font-medium text-rose-300">Parser de Archivos Scala (.scl)</h3>
            <p className="text-sm text-neutral-400">
              Pega el contenido de un archivo Scala para crear un sistema de afinación microtonal personalizado.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <textarea 
                value={scalaInput}
                onChange={(e) => setScalaInput(e.target.value)}
                className="w-full h-48 bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                spellCheck={false}
              />
              
              <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800/50 overflow-y-auto h-48">
                {(() => {
                  try {
                    const scalaTuning = parseScala(scalaInput);
                    return (
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-neutral-500">Nombre de la Afinación</div>
                          <div className="text-white font-medium">{scalaTuning.name}</div>
                        </div>
                        <div>
                          <div className="text-xs text-neutral-500">Notas por Octava</div>
                          <div className="text-white font-mono">{scalaTuning.octaveSteps}</div>
                        </div>
                        <div>
                          <div className="text-xs text-neutral-500 mb-1">Cents (desde la fundamental)</div>
                          <div className="flex flex-wrap gap-1">
                            {scalaTuning.cents.map((c, i) => (
                              <span key={i} className="bg-rose-900/40 border border-rose-800/50 text-rose-200 px-2 py-1 rounded text-xs font-mono">
                                {c.toFixed(2)}¢
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  } catch (e) {
                    return <div className="text-red-400 text-sm">Error parseando archivo Scala. Verifica el formato.</div>;
                  }
                })()}
              </div>
            </div>
          </div>

          <div className="h-px bg-neutral-800 w-full" />

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">{currentScale.name}</h3>
                <p className="text-sm text-neutral-400">Base Note: {get12TETName(rootStep)} (A4 = 440Hz)</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setRootStep(r => r - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                >
                  -
                </button>
                <button 
                  onClick={() => setRootStep(r => r + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                >
                  +
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {notes.map((note, idx) => {
                const isPlaying = playingNotes.has(idx);
                return (
                  <div 
                    key={idx}
                    className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${
                      isPlaying 
                        ? 'bg-neutral-800 border-neutral-600 shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                        : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                            <span className="text-white font-bold">{note.name}</span>
                            {note.name !== `Step ${note.stepsFromBase}` && (
                              <span className="text-neutral-500">Step {note.stepsFromBase}</span>
                            )}
                          </div>
                          <div className="text-2xl font-mono text-white tracking-tight">
                            {note.frequency.toFixed(1)}<span className="text-sm text-neutral-500 ml-1">Hz</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-xs font-mono text-neutral-500 bg-neutral-950/50 px-2 py-1 rounded inline-block">
                        {note.centsFromBase.toFixed(1)} ¢
                      </div>
                    </div>

                    <button
                      onPointerDown={() => handlePlay(idx, note.frequency)}
                      onPointerUp={() => handleStop(idx)}
                      onPointerLeave={() => handleStop(idx)}
                      className={`absolute bottom-0 right-0 p-3 rounded-tl-xl transition-colors ${
                        isPlaying ? 'bg-neutral-700 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                      }`}
                    >
                      {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Herramientas de Cálculo */}
        <section className="space-y-6 bg-slate-950/30 border border-slate-900/50 rounded-2xl p-6 md:p-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-medium text-white flex items-center gap-2">
              <Calculator className="w-6 h-6 text-slate-400" />
              Herramientas del Motor
            </h2>
            <p className="text-neutral-400 text-sm">Acceso directo a las funciones matemáticas de bajo nivel de la librería.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Intervalos */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4">
              <h3 className="text-slate-300 font-medium text-lg">Matemáticas de Intervalos</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-black/30 p-3 rounded border border-neutral-800">
                  <div className="flex items-center gap-2">
                    <input type="number" value={ratioNum} onChange={e=>setRatioNum(Number(e.target.value))} className="w-14 bg-neutral-800 text-center rounded py-1 text-white focus:outline-none focus:ring-1 focus:ring-slate-500" />
                    <span className="text-neutral-500">/</span>
                    <input type="number" value={ratioDen} onChange={e=>setRatioDen(Number(e.target.value))} className="w-14 bg-neutral-800 text-center rounded py-1 text-white focus:outline-none focus:ring-1 focus:ring-slate-500" />
                  </div>
                  <span className="text-neutral-500">→</span>
                  <div className="text-emerald-400 font-mono">{Interval.fromRatio([ratioNum, ratioDen]).cents.toFixed(2)} ¢</div>
                </div>

                <div className="flex items-center justify-between bg-black/30 p-3 rounded border border-neutral-800">
                  <div className="flex items-center gap-2">
                    <input type="number" value={centsInput} onChange={e=>setCentsInput(Number(e.target.value))} className="w-20 bg-neutral-800 text-center rounded py-1 text-white focus:outline-none focus:ring-1 focus:ring-slate-500" />
                    <span className="text-neutral-500">¢</span>
                  </div>
                  <span className="text-neutral-500">→</span>
                  <div className="text-emerald-400 font-mono">Ratio: {Interval.fromCents(centsInput).ratio.toFixed(4)}</div>
                </div>
              </div>
            </div>

            {/* MIDI */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4">
              <h3 className="text-slate-300 font-medium text-lg">Conversor MIDI ↔ Frecuencia</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-black/30 p-3 rounded border border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400 text-sm">MIDI</span>
                    <input type="number" value={midiInput} onChange={e=>setMidiInput(Number(e.target.value))} className="w-16 bg-neutral-800 text-center rounded py-1 text-white focus:outline-none focus:ring-1 focus:ring-slate-500" />
                  </div>
                  <span className="text-neutral-500">→</span>
                  <div className="text-indigo-400 font-mono">{midiToFreq(midiInput).toFixed(2)} Hz</div>
                </div>

                <div className="flex items-center justify-between bg-black/30 p-3 rounded border border-neutral-800">
                  <div className="flex items-center gap-2">
                    <input type="number" value={freqInput} onChange={e=>setFreqInput(Number(e.target.value))} className="w-24 bg-neutral-800 text-center rounded py-1 text-white focus:outline-none focus:ring-1 focus:ring-slate-500" />
                    <span className="text-neutral-400 text-sm">Hz</span>
                  </div>
                  <span className="text-neutral-500">→</span>
                  <div className="text-right">
                    <div className="text-indigo-400 font-mono">MIDI {freqToMidiPitchBend(freqInput).note}</div>
                    <div className="text-xs text-indigo-300/70 font-mono">
                      {freqToMidiPitchBend(freqInput).centsOffset > 0 ? '+' : ''}
                      {freqToMidiPitchBend(freqInput).centsOffset.toFixed(1)} cents
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Herramientas Avanzadas */}
        <section className="space-y-6 bg-emerald-950/20 border border-emerald-900/40 rounded-2xl p-6 md:p-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-medium text-white flex items-center gap-2">
              <Compass className="w-6 h-6 text-emerald-400" />
              Herramientas de Teoría
            </h2>
            <p className="text-neutral-400 text-sm">
              Explora el círculo de quintas, cálculo de intervalos y enarmónicos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Círculo de Quintas */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4">
              <h3 className="text-lg font-medium text-emerald-300">Círculo de Quintas</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Tonalidad</label>
                  <select 
                    value={circleKey}
                    onChange={(e) => setCircleKey(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <optgroup label="Mayores">
                      {CircleOfFifths.majorKeys.map(k => <option key={k} value={k}>{k} Mayor</option>)}
                    </optgroup>
                    <optgroup label="Menores">
                      {CircleOfFifths.minorKeys.map(k => <option key={k} value={k}>{k} Menor</option>)}
                    </optgroup>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-950 rounded-lg p-3 border border-neutral-800/50">
                    <div className="text-xs text-neutral-500 mb-1">Armadura</div>
                    <div className="text-white font-medium">
                      {CircleOfFifths.getSignature(circleKey).sharps > 0 
                        ? `${CircleOfFifths.getSignature(circleKey).sharps} ♯ (Sostenidos)` 
                        : CircleOfFifths.getSignature(circleKey).flats > 0 
                          ? `${CircleOfFifths.getSignature(circleKey).flats} ♭ (Bemoles)` 
                          : 'Sin alteraciones'}
                    </div>
                  </div>
                  <div className="bg-neutral-950 rounded-lg p-3 border border-neutral-800/50">
                    <div className="text-xs text-neutral-500 mb-1">Relativo</div>
                    <div className="text-white font-medium">{CircleOfFifths.getRelative(circleKey)}</div>
                  </div>
                  <div className="bg-neutral-950 rounded-lg p-3 border border-neutral-800/50">
                    <div className="text-xs text-neutral-500 mb-1">Dominante (V)</div>
                    <div className="text-white font-medium">{CircleOfFifths.getDominant(circleKey)}</div>
                  </div>
                  <div className="bg-neutral-950 rounded-lg p-3 border border-neutral-800/50">
                    <div className="text-xs text-neutral-500 mb-1">Subdominante (IV)</div>
                    <div className="text-white font-medium">{CircleOfFifths.getSubdominant(circleKey)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Intervalos y Enarmónicos */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4">
              <h3 className="text-lg font-medium text-emerald-300">Intervalos y Enarmónicos</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
                      Nota 1: {new Note(TET12, note1Midi - 69).getName()}
                    </label>
                    <input 
                      type="range" min="48" max="84" value={note1Midi} 
                      onChange={(e) => setNote1Midi(parseInt(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
                      Nota 2: {new Note(TET12, note2Midi - 69).getName()}
                    </label>
                    <input 
                      type="range" min="48" max="84" value={note2Midi} 
                      onChange={(e) => setNote2Midi(parseInt(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                </div>

                <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800/50 space-y-3">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Distancia (Intervalo)</div>
                    <div className="text-white font-medium flex items-center gap-2">
                      <span className="text-emerald-400">
                        {getSemanticIntervalName(new Note(TET12, note1Midi - 69).getIntervalTo(new Note(TET12, note2Midi - 69)).cents)}
                      </span>
                      <span className="text-neutral-500 text-sm">
                        ({Math.round(new Note(TET12, note1Midi - 69).getIntervalTo(new Note(TET12, note2Midi - 69)).cents)} cents)
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-neutral-800/50">
                    <div className="text-xs text-neutral-500 mb-1">Enarmónicos de {new Note(TET12, note1Midi - 69).getName()}</div>
                    <div className="text-white font-medium">
                      {getEnharmonics(new Note(TET12, note1Midi - 69).getName()).length > 0 
                        ? getEnharmonics(new Note(TET12, note1Midi - 69).getName()).join(' o ') 
                        : 'Ninguno común'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Armonía Avanzada */}
        <section className="space-y-6 bg-purple-950/20 border border-purple-900/40 rounded-2xl p-6 md:p-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-medium text-white flex items-center gap-2">
              <Network className="w-6 h-6 text-purple-400" />
              Armonía Avanzada (Jazz & Clásica)
            </h2>
            <p className="text-neutral-400 text-sm">
              Análisis de cadencias, sustituciones tritonales, intercambio modal y teoría Acorde-Escala.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Análisis y Escalas */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4">
              <h3 className="text-lg font-medium text-purple-300">Análisis y Teoría Acorde-Escala</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Acorde 1 (Actual)</label>
                    <input 
                      type="text" value={harmonyChord1} 
                      onChange={(e) => setHarmonyChord1(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Acorde 2 (Resolución)</label>
                    <input 
                      type="text" value={harmonyChord2} 
                      onChange={(e) => setHarmonyChord2(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Tonalidad (Contexto)</label>
                  <input 
                    type="text" value={harmonyKey} 
                    onChange={(e) => setHarmonyKey(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800/50 space-y-4">
                  {(() => {
                    try {
                      const c1 = parseChordSymbol(harmonyChord1);
                      const c2 = parseChordSymbol(harmonyChord2);
                      const cadence = Harmony.analyzeCadence(c1, c2, harmonyKey);
                      const scales = Harmony.getSuggestedScales(c1, c2);
                      const subV = c1.getTritoneSubstitution();
                      
                      return (
                        <>
                          <div>
                            <div className="text-xs text-neutral-500 mb-1">Análisis de Cadencia</div>
                            <div className="text-white font-medium text-purple-400">{cadence}</div>
                          </div>
                          <div className="pt-2 border-t border-neutral-800/50">
                            <div className="text-xs text-neutral-500 mb-1">Escalas Sugeridas para {c1.name}</div>
                            <ul className="list-disc list-inside text-white font-medium text-sm">
                              {scales.map((s, i) => (
                                <li key={i}>{s.scale}{s.hint ? <span className="text-neutral-400 font-normal ml-1">({s.hint})</span> : null}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="pt-2 border-t border-neutral-800/50">
                            <div className="text-xs text-neutral-500 mb-1">Sustitución Tritonal de {c1.name}</div>
                            <div className="text-white font-medium">{subV ? subV.name : 'N/A (solo 12-TET)'}</div>
                          </div>
                        </>
                      );
                    } catch (e) {
                      return <div className="text-red-400 text-sm">Error analizando acordes. Revisa la sintaxis.</div>;
                    }
                  })()}
                </div>
              </div>
            </div>

            {/* Intercambio Modal */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4">
              <h3 className="text-lg font-medium text-purple-300">Intercambio Modal y Armonía Negativa</h3>
              <p className="text-sm text-neutral-400">
                Acordes prestados de tonalidades paralelas para <strong>{harmonyKey}</strong>.
              </p>
              
              <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800/50">
                {(() => {
                  try {
                    const borrowed = Harmony.getBorrowedChords(harmonyKey);
                    return (
                      <div className="flex flex-wrap gap-2">
                        {borrowed.map((chord, i) => (
                          <span key={i} className="bg-purple-900/40 border border-purple-800/50 text-purple-200 px-3 py-1.5 rounded-md text-sm font-mono">
                            {chord.name}
                          </span>
                        ))}
                      </div>
                    );
                  } catch (e) {
                    return <div className="text-red-400 text-sm">Error analizando tonalidad.</div>;
                  }
                })()}
              </div>

              <div className="pt-4 border-t border-neutral-800/50">
                <p className="text-sm text-neutral-400 mb-3">
                  <strong>Armonía Negativa</strong> de {harmonyChord1} en {harmonyKey}:
                </p>
                <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800/50">
                  {(() => {
                    try {
                      const c1 = parseChordSymbol(harmonyChord1);
                      const negative = Harmony.getNegativeHarmony(c1, harmonyKey);
                      return (
                        <div className="text-white font-medium text-purple-400">
                          {negative.name}
                        </div>
                      );
                    } catch (e) {
                      return <div className="text-red-400 text-sm">Error analizando armonía negativa.</div>;
                    }
                  })()}
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-purple-900/20 border border-purple-800/30 rounded-lg">
                <h4 className="text-sm font-medium text-purple-300 mb-2">¡Prueba esto en el Parser de Progresiones!</h4>
                <p className="text-xs text-neutral-400 mb-2">
                  El parser ahora soporta dominantes secundarios y sustituciones tritonales. Sube a la sección de progresiones y prueba:
                </p>
                <code className="text-xs bg-black/50 px-2 py-1 rounded text-purple-200 block text-center">
                  ii7 - V7/ii - subV7 - Imaj7
                </code>
              </div>
            </div>
          </div>

          {/* Detector de Acordes */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4 mt-6">
            <h3 className="text-lg font-medium text-purple-300">Detector de Acordes (Chord Guesser)</h3>
            <p className="text-sm text-neutral-400">
              Introduce notas separadas por espacios (ej. "C4 E4 G4 Bb4" o "D F A C") y la librería deducirá el acorde.
            </p>
            
            <div className="flex gap-4">
              <input 
                type="text" value={detectorInput} 
                onChange={(e) => setDetectorInput(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-purple-500"
                placeholder="Notas (ej. C E G B)"
              />
            </div>

            <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800/50">
              {(() => {
                try {
                  const tokens = detectorInput.split(/\s+/).filter(t => t.length > 0);
                  if (tokens.length === 0) return <div className="text-neutral-500">Esperando notas...</div>;
                  
                  // Parse notes
                  const notes = tokens.map(t => parseNote(t));
                  
                  const detected = Harmony.detectChords(notes);
                  
                  return (
                    <div>
                      <div className="text-xs text-neutral-500 mb-2">Posibles Acordes:</div>
                      <div className="flex flex-wrap gap-2">
                        {detected.map((name, i) => (
                          <span key={i} className="bg-purple-900/40 border border-purple-800/50 text-purple-200 px-3 py-1.5 rounded-md font-mono">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                } catch (e) {
                  return <div className="text-red-400 text-sm">Error analizando notas. Asegúrate de usar notación estándar (C, D#, Bb).</div>;
                }
              })()}
            </div>
          </div>

          {/* Set Theory */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4 mt-6">
            <h3 className="text-lg font-medium text-purple-300">Teoría de Conjuntos (Set Theory)</h3>
            <p className="text-sm text-neutral-400">
              Análisis matemático de conjuntos de clases de altura (Pitch-Class Sets).
            </p>
            
            <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800/50 space-y-4">
              {(() => {
                try {
                  const notesStr = detectorInput.split(/\s+/).filter(n => n.length > 0);
                  if (notesStr.length === 0) return <div className="text-neutral-500 text-sm">Introduce notas en el detector de arriba.</div>;

                  const notes = notesStr.map(n => parseNote(n));

                  const pcs = SetTheory.getPitchClasses(notes);
                  const normal = SetTheory.normalForm(pcs);
                  const prime = SetTheory.primeForm(pcs);
                  const iv = SetTheory.intervalVector(pcs);
                  const keys = KeyDetection.detect(notes);

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-neutral-500 mb-1">Pitch Classes (0=A)</div>
                          <div className="text-white font-mono bg-black/50 px-2 py-1 rounded inline-block">
                            {`{${pcs.join(', ')}}`}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-neutral-500 mb-1">Forma Normal (Normal Form)</div>
                          <div className="text-white font-mono bg-black/50 px-2 py-1 rounded inline-block">
                            {`[${normal.join(', ')}]`}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-neutral-500 mb-1">Forma Prima (Prime Form)</div>
                          <div className="text-white font-mono bg-black/50 px-2 py-1 rounded inline-block text-purple-400">
                            {`(${prime.join('')})`}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-neutral-500 mb-1">Vector Interválico</div>
                          <div className="text-white font-mono bg-black/50 px-2 py-1 rounded inline-block text-emerald-400">
                            {`<${iv.join('')}>`}
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t border-neutral-800/50 pt-4">
                        <div className="text-xs text-neutral-500 mb-2">Detección de Tonalidad (Krumhansl-Schmuckler)</div>
                        <div className="flex flex-wrap gap-2">
                          {keys.slice(0, 3).map((k, i) => (
                            <span key={i} className="bg-blue-900/40 border border-blue-800/50 text-blue-200 px-3 py-1.5 rounded-md font-mono text-xs flex items-center gap-2">
                              {k.key}
                              <span className="text-blue-400/50">{(k.confidence * 100).toFixed(0)}%</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                } catch (e) {
                  return <div className="text-red-400 text-sm">Error analizando conjunto.</div>;
                }
              })()}
            </div>
          </div>

          {/* Neo-Riemannian Theory */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4 mt-6">
            <h3 className="text-lg font-medium text-pink-300">Transformaciones Neo-Riemannianas (PLR)</h3>
            <p className="text-sm text-neutral-400">
              Transformaciones geométricas de acordes mayores y menores (Parallel, Leading-tone, Relative).
            </p>
            
            <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800/50 space-y-4">
              {(() => {
                try {
                  const notesStr = detectorInput.split(/\s+/).filter(n => n.trim() !== '');
                  if (notesStr.length === 0) return <div className="text-neutral-500 text-sm">Introduce un acorde mayor o menor arriba (ej. C E G).</div>;
                  
                  const notes = notesStr.map(n => parseNote(n));
                  // Try to build a chord from the notes to test PLR
                  // We'll just assume the first note is the root for this quick demo
                  const chord = new Chord("Input", notes[0].tuningSystem, notes[0].stepsFromBase, notes.map(n => n.stepsFromBase - notes[0].stepsFromBase));
                  
                  const p = NeoRiemannian.P(chord);
                  const l = NeoRiemannian.L(chord);
                  const r = NeoRiemannian.R(chord);

                  if (!p && !l && !r) {
                    return <div className="text-neutral-500 text-sm">Las transformaciones PLR solo se aplican a tríadas mayores y menores puras.</div>;
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-neutral-500 mb-1">Parallel (P)</div>
                        <div className="text-white font-mono bg-black/50 px-3 py-2 rounded inline-block border border-pink-900/30">
                          {p ? p.name : '-'}
                        </div>
                        <div className="text-[10px] text-neutral-500 mt-1">Mueve la 3ra</div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-500 mb-1">Leading-tone (L)</div>
                        <div className="text-white font-mono bg-black/50 px-3 py-2 rounded inline-block border border-pink-900/30">
                          {l ? l.name : '-'}
                        </div>
                        <div className="text-[10px] text-neutral-500 mt-1">Intercambia Tónica/Sensible</div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-500 mb-1">Relative (R)</div>
                        <div className="text-white font-mono bg-black/50 px-3 py-2 rounded inline-block border border-pink-900/30">
                          {r ? r.name : '-'}
                        </div>
                        <div className="text-[10px] text-neutral-500 mt-1">Relativo menor/mayor</div>
                      </div>
                    </div>
                  );
                } catch (e) {
                  return <div className="text-red-400 text-sm">Error analizando acorde para PLR.</div>;
                }
              })()}
            </div>
          </div>
        </section>

        {/* Rhythm & Meter Section */}
        <section className="space-y-6 bg-indigo-950/30 border border-indigo-900/50 rounded-2xl p-6 md:p-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-medium text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-indigo-400" />
              Ritmo, Métrica y Polirritmia
            </h2>
            <p className="text-neutral-400 text-sm">
              Soporte para compases complejos, aditivos, tuplos y generación de polirritmos euclidianos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4">
              <h3 className="text-indigo-300 font-medium text-lg">Compases Complejos</h3>
              <p className="text-xs text-neutral-400">
                La clase <code>TimeSignature</code> soporta métricas aditivas comunes en la música balcánica o progresiva.
              </p>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between border-b border-neutral-800 pb-1">
                  <span className="text-neutral-300">Balkan 7/8</span>
                  <span className="text-emerald-400">{TimeSignature.Balkan7.toString()} (3+2+2)</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-1">
                  <span className="text-neutral-300">Balkan 9/8</span>
                  <span className="text-emerald-400">{TimeSignature.Balkan9.toString()} (2+2+2+3)</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-1">
                  <span className="text-neutral-300">Waltz</span>
                  <span className="text-emerald-400">{TimeSignature.Waltz.toString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4">
              <h3 className="text-indigo-300 font-medium text-lg">Polirritmos Euclidianos</h3>
              <p className="text-xs text-neutral-400">
                Distribución de K pulsos lo más uniformemente posible en N pasos. Base de muchos ritmos mundiales.
              </p>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between border-b border-neutral-800 pb-1">
                  <span className="text-neutral-300">E(3, 8) - Tresillo</span>
                  <span className="text-emerald-400">
                    {Polyrhythm.euclidean(3, 8).map(b => b ? 'X' : '.').join(' ')}
                  </span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-1">
                  <span className="text-neutral-300">E(5, 8) - Cinquillo</span>
                  <span className="text-emerald-400">
                    {Polyrhythm.euclidean(5, 8).map(b => b ? 'X' : '.').join(' ')}
                  </span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-1">
                  <span className="text-neutral-300">E(7, 12) - Bembé</span>
                  <span className="text-emerald-400">
                    {Polyrhythm.euclidean(7, 12).map(b => b ? 'X' : '.').join(' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* API Reference */}
        <section className="space-y-6 bg-cyan-950/20 border border-cyan-900/40 rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-medium text-white flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-cyan-400" />
                Referencia de la API
              </h2>
              <p className="text-neutral-400 text-sm">
                Documentación de la librería <code>Universal Music Theory (UMT)</code>.
              </p>
            </div>
            
            <a 
              href="/umt.js" 
              download="umt.js"
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-fit"
            >
              <Download className="w-4 h-4" />
              Descargar umt.js (11 KB)
            </a>
          </div>

          <div className="space-y-8">
            {/* Clases Principales */}
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-cyan-300 border-b border-cyan-900/50 pb-2">Clases Principales</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Note */}
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                  <h4 className="text-lg font-mono text-white mb-2">class Note</h4>
                  <p className="text-sm text-neutral-400 mb-3">Representa una nota musical dentro de un sistema de afinación específico.</p>
                  <ul className="text-sm space-y-2 text-neutral-300">
                    <li><code className="text-pink-400">frequency: number</code> - Frecuencia exacta en Hercios (Hz).</li>
                    <li><code className="text-pink-400">name: string</code> - Nombre de la nota (ej. "C4", "Step -9").</li>
                    <li><code className="text-blue-300">getName(options)</code> - Obtiene el nombre (soporta <code className="text-white">preferFlats</code>).</li>
                    <li><code className="text-blue-300">transpose(steps: number): Note</code> - Devuelve una nueva nota transpuesta N pasos.</li>
                    <li><code className="text-blue-300">getIntervalTo(other: Note): Interval</code> - Calcula la distancia exacta hacia otra nota.</li>
                  </ul>
                </div>

                {/* Chord */}
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                  <h4 className="text-lg font-mono text-white mb-2">class Chord</h4>
                  <p className="text-sm text-neutral-400 mb-3">Colección de intervalos desde una nota raíz.</p>
                  <ul className="text-sm space-y-2 text-neutral-300">
                    <li><code className="text-blue-300">getNotes(): Note[]</code> - Obtiene las notas del acorde.</li>
                    <li><code className="text-blue-300">getInversion(n: number): Note[]</code> - Aplica la n-ésima inversión.</li>
                    <li><code className="text-blue-300">getVoicing(type: string): Note[]</code> - Aplica voicings (close, drop2, open, rootless).</li>
                    <li><code className="text-emerald-400">static smoothTransition(curr, target): Note[]</code> - Calcula el mejor voice leading.</li>
                  </ul>
                </div>

                {/* Scale */}
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                  <h4 className="text-lg font-mono text-white mb-2">class Scale</h4>
                  <p className="text-sm text-neutral-400 mb-3">Secuencia de intervalos que forman una escala.</p>
                  <ul className="text-sm space-y-2 text-neutral-300">
                    <li><code className="text-blue-300">getNotes(octaves: number): Note[]</code> - Genera las notas de la escala.</li>
                    <li><code className="text-blue-300">getMode(degree: number): Scale</code> - Deriva un modo (ej. 2 para Dórico).</li>
                  </ul>
                </div>

                {/* Interval */}
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                  <h4 className="text-lg font-mono text-white mb-2">class Interval</h4>
                  <p className="text-sm text-neutral-400 mb-3">Representa la distancia matemática entre dos frecuencias.</p>
                  <ul className="text-sm space-y-2 text-neutral-300">
                    <li><code className="text-pink-400">cents: number</code> - Distancia logarítmica.</li>
                    <li><code className="text-pink-400">ratio: number</code> - Fracción multiplicadora (ej. 1.5).</li>
                    <li><code className="text-emerald-400">static fromRatio([num, den]): Interval</code> - Crea desde fracción.</li>
                    <li><code className="text-emerald-400">static fromCents(cents): Interval</code> - Crea desde cents.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Sistemas de Afinación */}
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-cyan-300 border-b border-cyan-900/50 pb-2">Sistemas de Afinación (Tuning Systems)</h3>
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                <p className="text-sm text-neutral-400 mb-3">Todas las afinaciones heredan de la clase abstracta <code className="text-white">TuningSystem</code>.</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <ul className="text-sm space-y-2 text-neutral-300">
                    <li><code className="text-pink-400">class EDO</code> - Divisiones Iguales de la Octava (ej. 12-TET, 24-TET).</li>
                    <li><code className="text-pink-400">class JustIntonation</code> - Basado en fracciones puras (ej. 5-Limit).</li>
                  </ul>
                  <ul className="text-sm space-y-2 text-neutral-300">
                    <li><code className="text-pink-400">class CentTuning</code> - Basado en cents exactos (ej. Werckmeister).</li>
                    <li><code className="text-pink-400">class NonOctaveTuning</code> - Sistemas sin octavas (ej. Bohlen-Pierce).</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Parsers */}
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-cyan-300 border-b border-cyan-900/50 pb-2">Parsers (Análisis de Texto)</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                  <h4 className="text-md font-mono text-white mb-2">parseChordSymbol()</h4>
                  <p className="text-sm text-neutral-400">Convierte cifrado americano (ej. "Cmaj9/E") en un objeto <code className="text-white">Chord</code>.</p>
                </div>
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                  <h4 className="text-md font-mono text-white mb-2">parseRomanProgression()</h4>
                  <p className="text-sm text-neutral-400">Convierte números romanos (ej. "ii7 - V7") en un array de <code className="text-white">Chord</code>.</p>
                </div>
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                  <h4 className="text-md font-mono text-white mb-2">parseScaleSymbol()</h4>
                  <p className="text-sm text-neutral-400">Convierte nombres de escalas (ej. "D dorian") en un objeto <code className="text-white">Scale</code>.</p>
                </div>
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                  <h4 className="text-md font-mono text-white mb-2">parseScala()</h4>
                  <p className="text-sm text-neutral-400">Convierte texto de un archivo <code>.scl</code> en un objeto <code className="text-white">ScalaTuning</code>.</p>
                </div>
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                  <h4 className="text-md font-mono text-white mb-2">parseNote()</h4>
                  <p className="text-sm text-neutral-400">Convierte texto (ej. "C#4") en un objeto <code className="text-white">Note</code>.</p>
                </div>
              </div>
            </div>

            {/* Circle of Fifths */}
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-cyan-300 border-b border-cyan-900/50 pb-2">Círculo de Quintas (CircleOfFifths)</h3>
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                <p className="text-sm text-neutral-400 mb-3">Clase estática para navegar por tonalidades y armaduras de clave.</p>
                <ul className="text-sm space-y-2 text-neutral-300 grid md:grid-cols-2 gap-x-4 gap-y-2">
                  <li><code className="text-emerald-400">static getSignature(key)</code> - Devuelve <code className="text-white">{'{ sharps, flats }'}</code>.</li>
                  <li><code className="text-emerald-400">static getRelative(key)</code> - Relativo menor/mayor (ej. "C" &rarr; "a").</li>
                  <li><code className="text-emerald-400">static getDominant(key)</code> - Tonalidad vecina derecha (ej. "C" &rarr; "G").</li>
                  <li><code className="text-emerald-400">static getSubdominant(key)</code> - Tonalidad vecina izquierda (ej. "C" &rarr; "F").</li>
                </ul>
              </div>
            </div>

            {/* Harmony */}
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-cyan-300 border-b border-cyan-900/50 pb-2">Armonía (Harmony)</h3>
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                <p className="text-sm text-neutral-400 mb-3">Clase estática para análisis armónico avanzado.</p>
                <ul className="text-sm space-y-2 text-neutral-300 grid md:grid-cols-2 gap-x-4 gap-y-2">
                  <li><code className="text-emerald-400">static getBorrowedChords(key)</code> - Acordes de intercambio modal.</li>
                  <li><code className="text-emerald-400">static analyzeCadence(c1, c2, key)</code> - Detecta tipo de cadencia.</li>
                  <li><code className="text-emerald-400">static getSuggestedScales(c1, c2?, ruleset?)</code> - Teoría Acorde-Escala ('berklee', 'classical', 'modal').</li>
                  <li><code className="text-emerald-400">static checkVoiceLeading(notesA, notesB, ruleset?)</code> - Auditor de conducción de voces ('strict', 'contemporary').</li>
                  <li><code className="text-emerald-400">static detectChords(notes)</code> - Deduce acordes desde un array de notas.</li>
                  <li><code className="text-blue-300">chord.getTritoneSubstitution()</code> - Sustitución tritonal (en clase Chord).</li>
                </ul>
              </div>
            </div>

            {/* Set Theory */}
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-cyan-300 border-b border-cyan-900/50 pb-2">Teoría de Conjuntos (SetTheory)</h3>
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                <p className="text-sm text-neutral-400 mb-3">Clase estática para análisis matemático de Pitch-Class Sets.</p>
                <ul className="text-sm space-y-2 text-neutral-300 grid md:grid-cols-2 gap-x-4 gap-y-2">
                  <li><code className="text-emerald-400">static getPitchClasses(notes)</code> - Extrae clases de altura únicas.</li>
                  <li><code className="text-emerald-400">static normalForm(pcs)</code> - Calcula la Forma Normal.</li>
                  <li><code className="text-emerald-400">static primeForm(pcs)</code> - Calcula la Forma Prima.</li>
                  <li><code className="text-emerald-400">static intervalVector(pcs)</code> - Calcula el Vector Interválico.</li>
                </ul>
              </div>
            </div>

            {/* Neo-Riemannian & Key Detection */}
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-cyan-300 border-b border-cyan-900/50 pb-2">Análisis Avanzado</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                  <h4 className="text-md font-mono text-white mb-2">NeoRiemannian</h4>
                  <p className="text-sm text-neutral-400 mb-3">Transformaciones geométricas (PLR) de tríadas.</p>
                  <ul className="text-sm space-y-2 text-neutral-300">
                    <li><code className="text-emerald-400">static P(chord)</code> - Transformación Paralela.</li>
                    <li><code className="text-emerald-400">static L(chord)</code> - Transformación Leading-tone.</li>
                    <li><code className="text-emerald-400">static R(chord)</code> - Transformación Relativa.</li>
                  </ul>
                </div>
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                  <h4 className="text-md font-mono text-white mb-2">KeyDetection</h4>
                  <p className="text-sm text-neutral-400 mb-3">Algoritmo de Krumhansl-Schmuckler.</p>
                  <ul className="text-sm space-y-2 text-neutral-300">
                    <li><code className="text-emerald-400">static detect(notes)</code> - Devuelve un array de tonalidades probables ordenadas por confianza.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Rhythm & Meter */}
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-cyan-300 border-b border-cyan-900/50 pb-2">Ritmo y Métrica (Rhythm)</h3>
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                <p className="text-sm text-neutral-400 mb-3">Clases para modelar duraciones, compases aditivos y polirritmos.</p>
                <ul className="text-sm space-y-2 text-neutral-300 grid md:grid-cols-2 gap-x-4 gap-y-2">
                  <li><code className="text-pink-400">class Duration</code> - Fracciones de nota y tuplos.</li>
                  <li><code className="text-pink-400">class TimeSignature</code> - Compases estándar y aditivos (ej. 3+2+2/8).</li>
                  <li><code className="text-emerald-400">Polyrhythm.generate(voices)</code> - Genera polirritmos N contra M.</li>
                  <li><code className="text-emerald-400">Polyrhythm.euclidean(k, n)</code> - Genera ritmos euclidianos.</li>
                </ul>
              </div>
            </div>

            {/* ABC Bridge & Stream */}
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-cyan-300 border-b border-cyan-900/50 pb-2">Integración y Exportación</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                  <h4 className="text-md font-mono text-white mb-2">ABCBridge</h4>
                  <p className="text-sm text-neutral-400 mb-3">Convierte objetos a notación ABC para renderizado visual.</p>
                  <ul className="text-sm space-y-2 text-neutral-300">
                    <li><code className="text-emerald-400">static noteToABC(note)</code></li>
                    <li><code className="text-emerald-400">static chordToABC(chord)</code></li>
                    <li><code className="text-emerald-400">static scaleToABC(scale)</code></li>
                    <li><code className="text-emerald-400">static progressionToABC(prog)</code></li>
                  </ul>
                </div>
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                  <h4 className="text-md font-mono text-white mb-2">MusicStream</h4>
                  <p className="text-sm text-neutral-400 mb-3">Contrato estándar de eventos temporales para Tone.js o MIDI.</p>
                  <ul className="text-sm space-y-2 text-neutral-300">
                    <li><code className="text-emerald-400">addEvent(notes, duration)</code> - Añade evento y avanza el cursor.</li>
                    <li><code className="text-emerald-400">addEventAt(time, notes, dur)</code> - Añade evento en un tiempo específico.</li>
                    <li><code className="text-emerald-400">toJSON()</code> - Exporta el stream a un formato agnóstico.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Utilidades */}
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-cyan-300 border-b border-cyan-900/50 pb-2">Utilidades (Utils)</h3>
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                <ul className="text-sm space-y-2 text-neutral-300 grid md:grid-cols-2 gap-x-4 gap-y-2">
                  <li><code className="text-blue-300">freqToMidi(freq, baseA4?)</code> - Convierte Hz a número MIDI.</li>
                  <li><code className="text-blue-300">freqToMidiPitchBend(freq, baseA4?)</code> - Devuelve <code className="text-white">{'{ note, centsOffset }'}</code>.</li>
                  <li><code className="text-blue-300">midiToFreq(midi, baseA4?)</code> - Convierte número MIDI a Hz.</li>
                  <li><code className="text-blue-300">get12TETName(steps, preferFlats?)</code> - Obtiene el nombre de la nota (ej. "C4").</li>
                  <li><code className="text-blue-300">getIntervalName(steps, is12TET)</code> - Obtiene el nombre del intervalo (ej. "m3").</li>
                  <li><code className="text-blue-300">getSemanticIntervalName(cents)</code> - Nombre semántico (ej. "Perfect 5th").</li>
                  <li><code className="text-blue-300">getEnharmonics(name)</code> - Devuelve equivalentes (ej. "F#" &rarr; ["Gb", "Ex"]).</li>
                  <li><code className="text-blue-300">usesFlats(rootName)</code> - Devuelve true si la tonalidad usa bemoles.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
