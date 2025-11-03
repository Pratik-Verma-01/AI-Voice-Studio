import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Image as ImageIcon, Trash2, Download, Plus, History, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface FloatingChatProps {
  session: Session | null;
  showHistory?: boolean;
}

const FloatingChat = ({ session, showHistory = false }: FloatingChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const openAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen && session) {
      loadChatSessions();
    }
  }, [isOpen, session]);

  useEffect(() => {
    if (currentSessionId && session) {
      loadMessages(currentSessionId);
    }
  }, [currentSessionId, session]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadChatSessions = async () => {
    if (!session) return;

    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading chat sessions:", error);
      return;
    }

    setChatSessions(data || []);
    
    if (data && data.length > 0 && !currentSessionId) {
      setCurrentSessionId(data[0].id);
    }
  };

  const loadMessages = async (sessionId: string) => {
    if (!session) return;

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    setMessages((data as Message[]) || []);
  };

  const createNewChat = async () => {
    if (!session) return;

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: session.user.id,
        title: "New Chat",
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: "Failed to create new chat", variant: "destructive" });
      return;
    }

    setChatSessions(prev => [data, ...prev]);
    setCurrentSessionId(data.id);
    setMessages([]);
    toast({ title: "Success", description: "New chat created" });
  };

  const deleteSession = async (sessionId: string) => {
    if (!session) return;

    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      toast({ title: "Error", description: "Failed to delete chat", variant: "destructive" });
      return;
    }

    setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    
    if (currentSessionId === sessionId) {
      const remaining = chatSessions.filter(s => s.id !== sessionId);
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id);
      } else {
        createNewChat();
      }
    }

    toast({ title: "Success", description: "Chat deleted" });
  };

  const exportAllChats = async () => {
    if (!session) return;

    const allChats = [];

    for (const chatSession of chatSessions) {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", chatSession.id)
        .order("created_at", { ascending: true });

      if (data) {
        allChats.push({
          session: chatSession,
          messages: data,
        });
      }
    }

    const exportData = JSON.stringify(allChats, null, 2);
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-chat-export-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Success", description: "Chat history exported" });
  };

  const handleToggle = () => {
    if (!isOpen && !openAudioRef.current) {
      openAudioRef.current = new Audio("data:audio/wav;base64,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");
    }
    
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    if (newIsOpen && openAudioRef.current) {
      openAudioRef.current.play().catch(e => console.log("Audio play failed:", e));
      
      if (chatSessions.length === 0) {
        createNewChat();
      }
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

  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage) || !session || isLoading || !currentSessionId) return;

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

    await supabase.from("chat_messages").insert({
      user_id: session.user.id,
      session_id: currentSessionId,
      role: "user",
      content: userMessage.content,
      image_url: userMessage.image_url,
    });

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
          session_id: currentSessionId,
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

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: messages.map(m => ({ role: m.role, content: m.content }))
            .concat([{ role: "user", content: userMessage.content }]) 
        }),
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

      await supabase.from("chat_messages").insert({
        user_id: session.user.id,
        session_id: currentSessionId,
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
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-50 animate-fade-in hover-scale"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-background z-50 flex animate-scale-in">
        {showHistory && (
          <div className="w-80 border-r bg-muted/30 flex flex-col animate-slide-in-right">
            <div className="p-4 border-b flex items-center justify-between bg-card/50 backdrop-blur">
              <h2 className="font-semibold flex items-center gap-2 text-lg">
                <History className="h-5 w-5 text-primary" />
                AI Chat History
              </h2>
              <div className="flex gap-1">
                <Button 
                  onClick={exportAllChats} 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 hover-scale rounded-full" 
                  title="Export all chats"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={createNewChat} 
                  size="icon" 
                  variant="default" 
                  className="h-8 w-8 hover-scale rounded-full" 
                  title="New chat"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {chatSessions.map((chatSession) => (
                  <div
                    key={chatSession.id}
                    className={`group p-3 rounded-lg cursor-pointer transition-all hover:bg-muted ${
                      currentSessionId === chatSession.id ? "bg-muted border-l-4 border-primary" : ""
                    }`}
                    onClick={() => setCurrentSessionId(chatSession.id)}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate flex-1">{chatSession.title}</p>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(chatSession.id);
                        }}
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(chatSession.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className={`flex-1 flex flex-col ${!showHistory ? 'w-full' : ''}`}>
          <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur">
            <div className="flex items-center gap-3">
              {!showHistory && (
                <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                  <SheetTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="hover-scale rounded-full"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 sm:w-96 p-0">
                    <SheetHeader className="p-4 border-b bg-card/50">
                      <SheetTitle className="flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        AI Chat History
                      </SheetTitle>
                    </SheetHeader>
                    <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                      <Button 
                        onClick={() => {
                          createNewChat();
                          setHistoryOpen(false);
                        }} 
                        size="sm" 
                        variant="default" 
                        className="hover-scale flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        New Chat
                      </Button>
                      <Button 
                        onClick={exportAllChats} 
                        size="sm" 
                        variant="outline" 
                        className="hover-scale flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </Button>
                    </div>
                    <ScrollArea className="h-[calc(100vh-180px)]">
                      <div className="p-2 space-y-2">
                        {chatSessions.map((chatSession) => (
                          <div
                            key={chatSession.id}
                            className={`group p-3 rounded-lg cursor-pointer transition-all hover:bg-muted ${
                              currentSessionId === chatSession.id ? "bg-muted border-l-4 border-primary" : ""
                            }`}
                            onClick={() => {
                              setCurrentSessionId(chatSession.id);
                              setHistoryOpen(false);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate flex-1">{chatSession.title}</p>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSession(chatSession.id);
                                }}
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(chatSession.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              )}
              <MessageCircle className="h-6 w-6 text-primary" />
              <h3 className="font-semibold text-lg">AI Assistant</h3>
            </div>
            <div className="flex items-center gap-2">
              {!showHistory && (
                <Button 
                  onClick={createNewChat} 
                  size="icon" 
                  variant="ghost" 
                  className="hover-scale rounded-full" 
                  title="New chat"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              )}
              <Button onClick={handleToggle} size="icon" variant="ghost" className="hover-scale rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-muted-foreground animate-fade-in">
                <div>
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 text-primary/50" />
                  <p className="text-lg font-medium">Start a conversation!</p>
                  <p className="text-sm mt-2">Ask me anything or request to generate images</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-4xl mx-auto">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                  >
                    <div 
                      className={`max-w-[70%] rounded-2xl p-4 transition-all hover-scale ${
                        msg.role === "user" 
                          ? "bg-primary text-primary-foreground shadow-lg" 
                          : "bg-muted shadow-md"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      {msg.image_url && (
                        <img 
                          src={msg.image_url} 
                          alt="Chat image" 
                          className="mt-3 rounded-lg max-w-full shadow-md hover-scale" 
                        />
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-muted rounded-2xl p-4 shadow-md">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="p-6 border-t bg-card/50 backdrop-blur">
            {imagePreview && (
              <div className="mb-3 relative inline-block animate-scale-in">
                <img src={imagePreview} alt="Preview" className="max-h-24 rounded-lg shadow-md" />
                <Button
                  onClick={removeImage}
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-lg hover-scale"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex gap-3 max-w-4xl mx-auto">
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
                className="hover-scale"
              >
                <ImageIcon className="h-5 w-5" />
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
                className="min-h-[52px] max-h-32 resize-none transition-all focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              />
              <Button 
                onClick={sendMessage} 
                size="icon" 
                disabled={isLoading || (!input.trim() && !selectedImage)}
                className="h-[52px] w-[52px] hover-scale"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FloatingChat;