import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Play, Pause, Square, Download, Copy, Mic, Volume2, Gauge, Globe, User, Menu, History, Loader2, Upload, FileAudio } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  verified_languages?: Array<{
    language: string;
    accent?: string;
    locale?: string;
  }>;
}

interface VoiceHistoryItem {
  id: string;
  text: string;
  voice_id: string;
  voice_name: string | null;
  audio_url: string;
  speed: number;
  pitch: number;
  created_at: string;
  type: 'tts' | 'stt';
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
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [voiceHistory, setVoiceHistory] = useState<VoiceHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [playingHistoryId, setPlayingHistoryId] = useState<string | null>(null);
  const historyAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

  // Load voice history
  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const { data, error } = await supabase
        .from('voice_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setVoiceHistory((data || []) as VoiceHistoryItem[]);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error("Failed to load history");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Language code to full name mapping
  const getLanguageFullName = (code: string): string => {
    const languageMap: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'pl': 'Polish',
      'nl': 'Dutch',
      'ja': 'Japanese',
      'zh': 'Chinese',
      'ko': 'Korean',
      'hi': 'Hindi',
      'ar': 'Arabic',
      'ru': 'Russian',
      'tr': 'Turkish',
      'sv': 'Swedish',
      'da': 'Danish',
      'fi': 'Finnish',
      'no': 'Norwegian',
      'cs': 'Czech',
      'ro': 'Romanian',
      'uk': 'Ukrainian',
      'el': 'Greek',
      'bg': 'Bulgarian',
      'hr': 'Croatian',
      'sk': 'Slovak',
      'ta': 'Tamil',
      'id': 'Indonesian',
      'ms': 'Malay',
      'fil': 'Filipino',
    };
    return languageMap[code] || code.toUpperCase();
  };

  // Get unique languages from verified_languages array
  const availableLanguages = Array.from(
    new Set(
      availableVoices
        .flatMap(v => v.verified_languages?.map(vl => vl.language) || [])
        .filter((lang): lang is string => !!lang)
    )
  ).sort();

  // Filter voices by selected language
  const filteredVoices = selectedLanguage === "all" 
    ? availableVoices 
    : availableVoices.filter(v => 
        v.verified_languages?.some(vl => vl.language === selectedLanguage)
      );

  const getVoiceLabel = (voice: Voice) => {
    const gender = voice.labels?.gender;
    return gender ? `${voice.name} (${gender})` : voice.name;
  };

  const getVoiceIcon = (voice: Voice) => {
    const gender = voice.labels?.gender?.toLowerCase();
    if (gender === 'male' || gender === 'female') {
      return <User className="w-4 h-4 inline mr-1" />;
    }
    return <Mic className="w-4 h-4 inline mr-1" />;
  };

  const handleGenerate = async () => {
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
        setGeneratedAudioUrl(url);

        // Save to history
        const selectedVoice = availableVoices.find(v => v.voice_id === voice);
        const { error: saveError } = await supabase
          .from('voice_history')
          .insert({
            text: text,
            voice_id: voice,
            voice_name: selectedVoice?.name || null,
            audio_url: url,
            speed: speed[0],
            pitch: pitch[0],
            type: 'tts',
          });

        if (saveError) {
          console.error('Error saving to history:', saveError);
        } else {
          loadHistory(); // Reload history
        }

        toast.dismiss();
        toast.success("Speech generated successfully!");
      }
    } catch (error) {
      console.error('Error generating speech:', error);
      toast.dismiss();
      toast.error("Failed to generate speech. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = async () => {
    if (!generatedAudioUrl) {
      toast.error("Please generate speech first");
      return;
    }

    try {
      // Create and play audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(generatedAudioUrl);
      audio.volume = volume[0];
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };

      await audio.play();
      setIsPlaying(true);
      setIsPaused(false);
      toast.success("Playing your text!");
    } catch (error) {
      console.error('Error playing speech:', error);
      toast.error("Failed to play speech. Please try again.");
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
    if (!generatedAudioUrl) {
      toast.error("Please generate speech first");
      return;
    }
    
    const a = document.createElement('a');
    a.href = generatedAudioUrl;
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

  const playHistoryItem = (item: VoiceHistoryItem) => {
    if (item.type === 'stt') {
      toast.info("Speech-to-Text entries don't have audio");
      return;
    }

    if (historyAudioRef.current) {
      historyAudioRef.current.pause();
    }

    if (playingHistoryId === item.id) {
      setPlayingHistoryId(null);
      return;
    }

    const audio = new Audio(item.audio_url);
    audio.volume = volume[0];
    historyAudioRef.current = audio;

    audio.onended = () => {
      setPlayingHistoryId(null);
    };

    audio.play();
    setPlayingHistoryId(item.id);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingAudio(true);
      toast.loading("Transcribing audio...");

      const formData = new FormData();
      formData.append('audio', file);

      const { data, error } = await supabase.functions.invoke('speech-to-text', {
        body: formData,
      });

      if (error) throw error;

      const transcribedText = data.text || '';
      setTranscribedText(transcribedText);

      // Save to history
      const { error: saveError } = await supabase
        .from('voice_history')
        .insert({
          text: transcribedText,
          voice_id: '',
          voice_name: null,
          audio_url: '',
          speed: 1.0,
          pitch: 1.0,
          type: 'stt',
        });

      if (saveError) {
        console.error('Error saving to history:', saveError);
      } else {
        loadHistory();
      }

      toast.dismiss();
      toast.success("Audio transcribed successfully!");
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast.dismiss();
      toast.error("Failed to transcribe audio. Please try again.");
    } finally {
      setIsProcessingAudio(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudioBlob(audioBlob);
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started!");
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error("Failed to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.info("Recording stopped, processing...");
    }
  };

  const processAudioBlob = async (audioBlob: Blob) => {
    try {
      setIsProcessingAudio(true);
      toast.loading("Transcribing audio...");

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const { data, error } = await supabase.functions.invoke('speech-to-text', {
        body: formData,
      });

      if (error) throw error;

      const transcribedText = data.text || '';
      setTranscribedText(transcribedText);

      // Save to history
      const { error: saveError } = await supabase
        .from('voice_history')
        .insert({
          text: transcribedText,
          voice_id: '',
          voice_name: null,
          audio_url: '',
          speed: 1.0,
          pitch: 1.0,
          type: 'stt',
        });

      if (saveError) {
        console.error('Error saving to history:', saveError);
      } else {
        loadHistory();
      }

      toast.dismiss();
      toast.success("Audio transcribed successfully!");
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast.dismiss();
      toast.error("Failed to transcribe audio. Please try again.");
    } finally {
      setIsProcessingAudio(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <ThemeToggle />
      
      {/* Menu Button */}
      <div className="absolute top-4 left-4 z-20">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full glass-card">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                History
              </SheetTitle>
            </SheetHeader>
            <Tabs defaultValue="tts" className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tts">Text-to-Speech</TabsTrigger>
                <TabsTrigger value="stt">Speech-to-Text</TabsTrigger>
              </TabsList>
              <ScrollArea className="h-[calc(100vh-180px)] mt-4">
                <TabsContent value="tts" className="mt-0">
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : voiceHistory.filter(item => item.type === 'tts').length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No TTS history yet</p>
                  ) : (
                    <div className="space-y-4 pr-4">
                      {voiceHistory.filter(item => item.type === 'tts').map((item) => (
                        <div key={item.id} className="glass-card p-4 rounded-xl space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm line-clamp-2 flex-1">{item.text}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0"
                              onClick={() => playHistoryItem(item)}
                            >
                              {playingHistoryId === item.id ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span>{item.voice_name || 'Unknown'}</span>
                            <span>•</span>
                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="stt" className="mt-0">
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : voiceHistory.filter(item => item.type === 'stt').length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No STT history yet</p>
                  ) : (
                    <div className="space-y-4 pr-4">
                      {voiceHistory.filter(item => item.type === 'stt').map((item) => (
                        <div key={item.id} className="glass-card p-4 rounded-xl space-y-3">
                          <p className="text-sm">{item.text}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FileAudio className="w-3 h-3" />
                            <span>Transcribed</span>
                            <span>•</span>
                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </SheetContent>
        </Sheet>
      </div>
      
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
              Transform text to speech and speech to text
            </p>
          </div>

          <Tabs defaultValue="tts" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="tts">Text-to-Speech</TabsTrigger>
              <TabsTrigger value="stt">Speech-to-Text</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tts" className="mt-0">

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
              <Globe className="w-4 h-4" />
              Select Language
            </label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage} disabled={isLoadingVoices}>
              <SelectTrigger className="rounded-xl glass-card border-border/50 h-12">
                <SelectValue placeholder="All Languages" />
              </SelectTrigger>
              <SelectContent className="rounded-xl glass-card border-border/50">
                <SelectItem value="all">
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    All Languages
                  </span>
                </SelectItem>
                {availableLanguages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    <span className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      {getLanguageFullName(lang)}
                    </span>
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
                      <span className="flex items-center gap-2">
                        {getVoiceIcon(v)}
                        {getVoiceLabel(v)}
                      </span>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="loading" disabled>
                    {selectedLanguage !== "all" ? `No voices for ${getLanguageFullName(selectedLanguage)}` : "Loading voices..."}
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

          {/* Generate and Control Buttons */}
          <div className="flex flex-col gap-4 mb-8">
            <Button
              onClick={handleGenerate}
              variant="default"
              size="lg"
              className="w-full rounded-xl shadow-lg"
              disabled={isLoading || !text.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Generate Voice
                </>
              )}
            </Button>

            {generatedAudioUrl && (
              <div className="flex justify-center items-center gap-4">
                {!isPlaying ? (
                  <Button
                    onClick={handlePlay}
                    variant="control"
                    size="controlLg"
                    className="shadow-xl"
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
            </TabsContent>

            <TabsContent value="stt" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Direct Recording */}
                <div>
                  <label className="text-sm font-medium mb-3 block flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    Record Voice
                  </label>
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    variant={isRecording ? "destructive" : "default"}
                    className="w-full rounded-xl h-32"
                    disabled={isProcessingAudio}
                  >
                    {isRecording ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                          <Mic className="w-6 h-6" />
                        </div>
                        <span>Recording... Click to stop</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Mic className="w-8 h-8" />
                        <span>Click to record</span>
                        <span className="text-xs opacity-80">Use your microphone</span>
                      </div>
                    )}
                  </Button>
                </div>

                {/* File Upload */}
                <div>
                  <label className="text-sm font-medium mb-3 block flex items-center gap-2">
                    <FileAudio className="w-4 h-4" />
                    Upload Audio File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="audio-upload"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full rounded-xl glass-card border-border/50 h-32"
                    disabled={isProcessingAudio || isRecording}
                  >
                    {isProcessingAudio ? (
                      <>
                        <Loader2 className="w-8 h-8 mr-3 animate-spin" />
                        Processing Audio...
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8" />
                        <span>Click to upload</span>
                        <span className="text-xs text-muted-foreground">MP3, WAV, etc.</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>

              {transcribedText && (
                <div className="mb-6">
                  <label className="text-sm font-medium mb-3 block">
                    Transcribed Text
                  </label>
                  <Textarea
                    value={transcribedText}
                    readOnly
                    className="min-h-[200px] text-base rounded-2xl glass-card border-border/50 resize-none"
                  />
                  <div className="flex gap-3 mt-4">
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(transcribedText);
                        toast.success("Text copied to clipboard!");
                      }}
                      variant="outline"
                      className="rounded-full glass-card"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Text
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
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
