import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Play, Pause, Square, Download, Copy, Mic, Volume2, Gauge } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [text, setText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voice, setVoice] = useState("female");
  const [speed, setSpeed] = useState([1.0]);
  const [pitch, setPitch] = useState([1.0]);
  const [volume, setVolume] = useState([0.8]);

  const maxChars = 5000;
  const charCount = text.length;

  const handlePlay = () => {
    if (!text.trim()) {
      toast.error("Please enter some text first");
      return;
    }
    setIsPlaying(true);
    setIsPaused(false);
    toast.success("Playing your text...");
  };

  const handlePause = () => {
    setIsPaused(true);
    toast.info("Paused");
  };

  const handleResume = () => {
    setIsPaused(false);
    toast.success("Resumed");
  };

  const handleStop = () => {
    setIsPlaying(false);
    setIsPaused(false);
    toast.info("Stopped");
  };

  const handleDownload = () => {
    if (!text.trim()) {
      toast.error("Please enter some text first");
      return;
    }
    toast.success("Download will be available soon!");
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

          {/* Voice Selection */}
          <div className="mb-8">
            <label className="text-sm font-medium mb-3 block flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Select Voice
            </label>
            <Select value={voice} onValueChange={setVoice}>
              <SelectTrigger className="rounded-xl glass-card border-border/50 h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl glass-card border-border/50">
                <SelectItem value="male">🎙️ Male Voice</SelectItem>
                <SelectItem value="female">👩 Female Voice</SelectItem>
                <SelectItem value="en-us">🌐 English (US)</SelectItem>
                <SelectItem value="en-uk">🌐 English (UK)</SelectItem>
                <SelectItem value="es">🌐 Spanish</SelectItem>
                <SelectItem value="fr">🌐 French</SelectItem>
                <SelectItem value="de">🌐 German</SelectItem>
                <SelectItem value="ja">🌐 Japanese</SelectItem>
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
