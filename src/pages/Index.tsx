import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Play, Pause, Square, Download, Copy, Mic, Volume2, Gauge } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Voice {
  voice_id: string;
  name: string;
  labels?: {
    accent?: string;
    description?: string;
    age?: string;
    gender?: string;
    use_case?: string;
    language?: string;
  };
  preview_url?: string;
}

const Index = () => {
  const [text, setText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [voice, setVoice] = useState("9BWtsMINqrJLrRacOk9x"); // Aria
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [speed, setSpeed] = useState([1.0]);
  const [pitch, setPitch] = useState([1.0]);
  const [volume, setVolume] = useState([0.8]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const maxChars = 5000;
  const charCount = text.length;

  // Load available voices on mount
  useEffect(() => {
    const loadVoices = async () => {
      try {
        setIsLoadingVoices(true);
        const { data, error } = await supabase.functions.invoke('get-voices');
        
        if (error) {
          console.error('Error loading voices:', error);
          toast.error("Failed to load voices");
          return;
        }

        if (data?.voices && Array.isArray(data.voices)) {
          setAvailableVoices(data.voices);
          console.log('Loaded voices:', data.voices.length);
        }
      } catch (error) {
        console.error('Error loading voices:', error);
      } finally {
        setIsLoadingVoices(false);
      }
    };

    loadVoices();
  }, []);

  // Get unique languages from voices
  const availableLanguages = Array.from(
    new Set(
      availableVoices
        .map(v => v.labels?.language)
        .filter((lang): lang is string => !!lang)
    )
  ).sort();

  // Filter voices by selected language
  const filteredVoices = selectedLanguage === "all" 
    ? availableVoices 
    : availableVoices.filter(v => v.labels?.language === selectedLanguage);

  const getVoiceLabel = (voice: Voice) => {
    const parts = [voice.name];
    
    if (voice.labels?.language) {
      parts.push(`${voice.labels.language}`);
    }
    
    if (voice.labels?.gender) {
      parts.push(`${voice.labels.gender}`);
    }
    
    if (voice.labels?.accent) {
      parts.push(`${voice.labels.accent}`);
    }
    
    if (voice.labels?.age) {
      parts.push(`${voice.labels.age}`);
    }
    
    return parts.join(' • ');
  };

  const getVoiceIcon = (voice: Voice) => {
    const gender = voice.labels?.gender?.toLowerCase();
    if (gender === 'male') return '🎙️';
    if (gender === 'female') return '👩';
    return '🌐';
  };

  const handlePlay = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text first");
      return;
    }

    try {
      setIsLoading(true);
      toast.loading("Generating speech...");

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: text,
          voiceId: voice,
          speed: speed[0],
          pitch: pitch[0],
        }
      });

      if (error) throw error;

      if (data.audioContent) {
        // Clean up previous audio URL
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }

        // Convert base64 to blob and create URL
        const audioData = atob(data.audioContent);
        const arrayBuffer = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          arrayBuffer[i] = audioData.charCodeAt(i);
        }
        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Create and play audio
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(url);
        audio.volume = volume[0];
        audioRef.current = audio;

        audio.onended = () => {
          setIsPlaying(false);
          setIsPaused(false);
        };

        await audio.play();
        setIsPlaying(true);
        setIsPaused(false);
        toast.dismiss();
        toast.success("Playing your text!");
      }
    } catch (error) {
      console.error('Error generating speech:', error);
      toast.dismiss();
      toast.error("Failed to generate speech. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPaused(true);
      toast.info("Paused");
    }
  };

  const handleResume = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPaused(false);
      toast.success("Resumed");
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsPaused(false);
    toast.info("Stopped");
  };

  const handleDownload = () => {
    if (!audioUrl) {
      toast.error("Please generate speech first");
      return;
    }
    
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = 'speech.mp3';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Download started!");
  };

  const handleCopy = () => {
    if (!text.trim()) {
      toast.error("No text to copy");
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success("Text copied to clipboard!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <ThemeToggle />
      
      {/* Floating orbs for decoration */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      
      <main className="w-full max-w-4xl mx-auto relative z-10 animate-slide-in">
        <div className="glass-card rounded-3xl p-8 md:p-12 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AI Voice Studio
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Transform your text into natural-sounding speech
            </p>
          </div>

          {/* Text Input Area */}
          <div className="mb-6 relative">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, maxChars))}
              placeholder="Enter your text here... The AI will bring it to life with natural-sounding speech."
              className="min-h-[200px] text-base rounded-2xl glass-card border-border/50 focus:border-primary/50 transition-smooth resize-none"
              maxLength={maxChars}
            />
            <div className="flex justify-between items-center mt-2 px-1">
              <span className="text-xs text-muted-foreground">
                Maximum {maxChars} characters
              </span>
              <span className={`text-xs font-medium ${charCount > maxChars * 0.9 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {charCount} / {maxChars}
              </span>
            </div>
          </div>

          {/* Language Selection */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-3 block flex items-center gap-2">
              🌍 Select Language
            </label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage} disabled={isLoadingVoices}>
              <SelectTrigger className="rounded-xl glass-card border-border/50 h-12">
                <SelectValue placeholder="All Languages" />
              </SelectTrigger>
              <SelectContent className="rounded-xl glass-card border-border/50">
                <SelectItem value="all">All Languages</SelectItem>
                {availableLanguages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Voice Selection */}
          <div className="mb-8">
            <label className="text-sm font-medium mb-3 block flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Select Voice {isLoadingVoices && <span className="text-xs text-muted-foreground">(Loading...)</span>}
              {selectedLanguage !== "all" && <span className="text-xs text-muted-foreground">({filteredVoices.length} voices)</span>}
            </label>
            <Select value={voice} onValueChange={setVoice} disabled={isLoadingVoices}>
              <SelectTrigger className="rounded-xl glass-card border-border/50 h-12">
                <SelectValue placeholder="Choose a voice..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl glass-card border-border/50 max-h-[400px]">
                {filteredVoices.length > 0 ? (
                  filteredVoices.map((v) => (
                    <SelectItem key={v.voice_id} value={v.voice_id}>
                      {getVoiceIcon(v)} {getVoiceLabel(v)}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="loading" disabled>
                    {selectedLanguage !== "all" ? `No voices for ${selectedLanguage}` : "Loading voices..."}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Control Sliders */}
          <div className="space-y-6 mb-10">
            {/* Speed */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Gauge className="w-4 h-4" />
                  Speed
                </label>
                <span className="text-xs font-mono bg-muted/50 px-3 py-1 rounded-full">
                  {speed[0].toFixed(1)}x
                </span>
              </div>
              <Slider
                value={speed}
                onValueChange={setSpeed}
                min={0.5}
                max={2.0}
                step={0.1}
                className="cursor-pointer"
              />
            </div>

            {/* Pitch */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Pitch
                </label>
                <span className="text-xs font-mono bg-muted/50 px-3 py-1 rounded-full">
                  {pitch[0].toFixed(1)}x
                </span>
              </div>
              <Slider
                value={pitch}
                onValueChange={setPitch}
                min={0.5}
                max={2.0}
                step={0.1}
                className="cursor-pointer"
              />
            </div>

            {/* Volume */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Volume
                </label>
                <span className="text-xs font-mono bg-muted/50 px-3 py-1 rounded-full">
                  {Math.round(volume[0] * 100)}%
                </span>
              </div>
              <Slider
                value={volume}
                onValueChange={setVolume}
                min={0}
                max={1}
                step={0.05}
                className="cursor-pointer"
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center items-center gap-4 mb-8">
            {!isPlaying ? (
              <Button
                onClick={handlePlay}
                variant="control"
                size="controlLg"
                className="shadow-xl"
                disabled={isLoading}
              >
                <Play className="w-6 h-6 fill-current" />
              </Button>
            ) : (
              <>
                {!isPaused ? (
                  <Button
                    onClick={handlePause}
                    variant="controlSecondary"
                    size="controlMd"
                  >
                    <Pause className="w-5 h-5 fill-current" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleResume}
                    variant="control"
                    size="controlMd"
                  >
                    <Play className="w-5 h-5 fill-current" />
                  </Button>
                )}
                <Button
                  onClick={handleStop}
                  variant="destructive"
                  size="controlMd"
                  className="rounded-full hover:scale-110 active:scale-95 transition-bounce"
                >
                  <Square className="w-5 h-5 fill-current" />
                </Button>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              onClick={handleDownload}
              variant="outline"
              className="rounded-full glass-card border-primary/30 hover:border-primary/60 transition-smooth"
            >
              <Download className="w-4 h-4 mr-2" />
              Download MP3
            </Button>
            <Button
              onClick={handleCopy}
              variant="outline"
              className="rounded-full glass-card border-secondary/30 hover:border-secondary/60 transition-smooth"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Text
            </Button>
          </div>

          {/* Progress Bar Placeholder */}
          {isPlaying && (
            <div className="mt-8">
              <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden backdrop-blur-sm">
                <div className="h-full bg-gradient-to-r from-primary to-secondary animate-pulse-glow" style={{ width: '45%' }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center mt-8 text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            Developed with <span className="text-destructive animate-pulse">❤️</span> by <span className="font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Code-With-Pratik</span>
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
