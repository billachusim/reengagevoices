import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { StoryDTO } from "@/lib/types";
import { incrementPlay } from "@/lib/catalog.functions";

type RepeatMode = "off" | "one";

interface PlayerCtx {
  queue: StoryDTO[];
  current: StoryDTO | null;
  index: number;
  isPlaying: boolean;
  progress: number; // 0..1
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  playStory: (story: StoryDTO, queue?: StoryDTO[]) => void;
  playQueue: (stories: StoryDTO[], startIndex?: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (fraction: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (story: StoryDTO) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
}

const Ctx = createContext<PlayerCtx | null>(null);

const INTRO_SRC = "/audio/intro.mp3";

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const introRef = useRef<HTMLAudioElement | null>(null);
  const introPlayingRef = useRef(false);
  const [queue, setQueue] = useState<StoryDTO[]>([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const countedRef = useRef<Set<string>>(new Set());

  const current = index >= 0 && index < queue.length ? queue[index] : null;

  if (typeof window !== "undefined" && !audioRef.current) {
    audioRef.current = new Audio();
  }
  if (typeof window !== "undefined" && !introRef.current) {
    introRef.current = new Audio(INTRO_SRC);
    introRef.current.preload = "auto";
  }

  const stopIntro = useCallback(() => {
    const intro = introRef.current;
    if (intro) {
      intro.pause();
      intro.onended = null;
    }
    introPlayingRef.current = false;
  }, []);

  const load = useCallback((story: StoryDTO, autoplay = true) => {
    const audio = audioRef.current;
    if (!audio || !story.audio_url) return;
    stopIntro();
    audio.src = story.audio_url;
    audio.volume = volume;
    if (autoplay) {
      const intro = introRef.current;
      const startStory = () => audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      if (intro) {
        introPlayingRef.current = true;
        intro.volume = volume;
        intro.currentTime = 0;
        intro.onended = () => { introPlayingRef.current = false; intro.onended = null; startStory(); };
        intro.play().then(() => setIsPlaying(true)).catch(() => { introPlayingRef.current = false; intro.onended = null; startStory(); });
      } else {
        startStory();
      }
    }
    if (!countedRef.current.has(story.id)) {
      countedRef.current.add(story.id);
      incrementPlay({ data: { id: story.id } }).catch(() => {});
    }
  }, [volume, stopIntro]);

  const playQueue = useCallback((stories: StoryDTO[], startIndex = 0) => {
    const playable = stories.filter((s) => s.audio_url);
    if (playable.length === 0) return;
    setQueue(playable);
    setIndex(startIndex);
    load(playable[startIndex]);
  }, [load]);

  const playStory = useCallback((story: StoryDTO, q?: StoryDTO[]) => {
    const list = (q && q.length ? q : [story]).filter((s) => s.audio_url);
    const start = Math.max(0, list.findIndex((s) => s.id === story.id));
    setQueue(list);
    setIndex(start);
    load(list[start]);
  }, [load]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    const intro = introRef.current;
    if (!audio || !current) return;
    // If the intro is currently playing, pause/resume the intro instead of the story.
    if (introPlayingRef.current && intro) {
      if (intro.paused) {
        intro.play().then(() => setIsPlaying(true)).catch(() => {});
      } else {
        intro.pause();
        setIsPlaying(false);
      }
      return;
    }
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [current]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (queue.length === 0) return i;
      let n: number;
      if (shuffle) n = Math.floor(Math.random() * queue.length);
      else n = i + 1 >= queue.length ? 0 : i + 1;
      load(queue[n]);
      return n;
    });
  }, [queue, shuffle, load]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
    setIndex((i) => {
      if (queue.length === 0) return i;
      const n = i - 1 < 0 ? queue.length - 1 : i - 1;
      load(queue[n]);
      return n;
    });
  }, [queue, load]);

  const seek = useCallback((fraction: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = fraction * audio.duration;
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
    if (introRef.current) introRef.current.volume = v;
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(() => setRepeat((r) => (r === "off" ? "one" : "off")), []);
  const addToQueue = useCallback((story: StoryDTO) => {
    if (!story.audio_url) return;
    setQueue((q) => [...q, story]);
  }, []);
  const removeFromQueue = useCallback((i: number) => {
    setQueue((q) => q.filter((_, idx) => idx !== i));
    setIndex((cur) => (i < cur ? cur - 1 : cur));
  }, []);
  const clearQueue = useCallback(() => { setQueue(current ? [current] : []); setIndex(current ? 0 : -1); }, [current]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => { setCurrentTime(audio.currentTime); setDuration(audio.duration || 0); };
    const onEnd = () => {
      if (repeat === "one") { audio.currentTime = 0; audio.play().catch(() => {}); return; }
      next();
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onTime);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onTime);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [next, repeat]);

  const progress = duration ? currentTime / duration : 0;

  return (
    <Ctx.Provider value={{
      queue, current, index, isPlaying, progress, currentTime, duration, volume, shuffle, repeat,
      playStory, playQueue, toggle, next, prev, seek, setVolume, toggleShuffle, cycleRepeat, addToQueue, removeFromQueue, clearQueue,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlayer must be used within AudioProvider");
  return ctx;
}
