import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Check, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />

      <div className="glass-card rounded-3xl p-8 md:p-12 max-w-md w-full text-center space-y-6 relative z-10 animate-slide-in">
        <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Smartphone className="w-12 h-12 text-primary" />
        </div>

        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Install AI Voice Studio
        </h1>

        <p className="text-muted-foreground text-sm leading-relaxed">
          Install our app on your device for the best experience — works offline, launches instantly, and feels like a native app!
        </p>

        {isInstalled ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm font-medium text-primary">App is already installed!</p>
          </div>
        ) : deferredPrompt ? (
          <Button onClick={handleInstall} size="lg" className="w-full rounded-xl shadow-lg gap-2 text-base">
            <Download className="w-5 h-5" />
            Install Now
          </Button>
        ) : (
          <div className="space-y-4 text-left">
            <p className="text-sm font-medium text-center text-muted-foreground">
              To install, use your browser menu:
            </p>
            <div className="space-y-3">
              <div className="glass-card rounded-xl p-4">
                <p className="text-sm font-semibold mb-1">📱 Android (Chrome)</p>
                <p className="text-xs text-muted-foreground">Tap the ⋮ menu → "Add to Home screen"</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-sm font-semibold mb-1">🍎 iPhone (Safari)</p>
                <p className="text-xs text-muted-foreground">Tap the Share button → "Add to Home Screen"</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-sm font-semibold mb-1">💻 Desktop (Chrome/Edge)</p>
                <p className="text-xs text-muted-foreground">Click the install icon in the address bar</p>
              </div>
            </div>
          </div>
        )}

        <Link to="/">
          <Button variant="ghost" className="rounded-full gap-2 mt-4">
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Install;
