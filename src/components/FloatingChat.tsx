import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Image as ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image_url?: string;
  created_at: string;
}

interface FloatingChatProps {
  session: Session | null;
}

const FloatingChat = ({ session }: FloatingChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const openAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen && session) {
      loadChatHistory();
    }
  }, [isOpen, session]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadChatHistory = async () => {
    if (!session) return;

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("Error loading chat history:", error);
      return;
    }

    setMessages((data as Message[]) || []);
  };

  const handleToggle = () => {
    if (!isOpen && !openAudioRef.current) {
      openAudioRef.current = new Audio("data:audio/wav;base64,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");
    }
    
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    if (newIsOpen && openAudioRef.current) {
      openAudioRef.current.play().catch(e => console.log("Audio play failed:", e));
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearChat = async () => {
    if (!session) return;

    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", session.user.id);

    if (error) {
      toast({ title: "Error", description: "Failed to clear chat", variant: "destructive" });
      return;
    }

    setMessages([]);
    toast({ title: "Success", description: "Chat history cleared" });
  };

  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage) || !session || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      image_url: imagePreview || undefined,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Save user message
    await supabase.from("chat_messages").insert({
      user_id: session.user.id,
      role: "user",
      content: userMessage.content,
      image_url: userMessage.image_url,
    });

    // Handle image generation
    if (input.toLowerCase().includes("generate image") || input.toLowerCase().includes("create image")) {
      try {
        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: { prompt: input },
        });

        if (error) throw error;

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Here's the generated image:",
          image_url: data.image,
          created_at: new Date().toISOString(),
        };

        setMessages(prev => [...prev, assistantMessage]);
        await supabase.from("chat_messages").insert({
          user_id: session.user.id,
          role: "assistant",
          content: assistantMessage.content,
          image_url: assistantMessage.image_url,
        });

        setIsLoading(false);
        removeImage();
        return;
      } catch (error) {
        toast({ title: "Error", description: "Image generation failed", variant: "destructive" });
        setIsLoading(false);
        return;
      }
    }

    // Regular chat
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: messages.map(m => ({ role: m.role, content: m.content })).concat([{ role: "user", content: userMessage.content }]) }),
      });

      if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev =>
                prev.map(m => m.id === assistantMessage.id ? { ...m, content: assistantContent } : m)
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save assistant message
      await supabase.from("chat_messages").insert({
        user_id: session.user.id,
        role: "assistant",
        content: assistantContent,
      });

      setIsLoading(false);
      removeImage();
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={handleToggle}
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-50"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-card border rounded-lg shadow-2xl flex flex-col z-50">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Assistant</h3>
        </div>
        <div className="flex gap-2">
          <Button onClick={clearChat} size="icon" variant="ghost">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button onClick={handleToggle} size="icon" variant="ghost">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>Start a conversation!</p>
            <p className="text-sm mt-2">Ask me anything or request to generate images</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.image_url && (
                    <img src={msg.image_url} alt="Chat image" className="mt-2 rounded max-w-full" />
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t">
        {imagePreview && (
          <div className="mb-2 relative">
            <img src={imagePreview} alt="Preview" className="max-h-20 rounded" />
            <Button
              onClick={removeImage}
              size="icon"
              variant="destructive"
              className="absolute top-0 right-0 h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="icon"
            variant="outline"
            disabled={isLoading}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-32 resize-none"
            disabled={isLoading}
          />
          <Button onClick={sendMessage} size="icon" disabled={isLoading || (!input.trim() && !selectedImage)}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FloatingChat;