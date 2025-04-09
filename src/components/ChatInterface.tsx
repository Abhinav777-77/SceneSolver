import React, { useState, useRef, useEffect } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";
import { ArrowDown } from "lucide-react";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ImageFile {
  file: File;
  preview: string;
}

interface ChatInterfaceProps {
  selectedImage?: string | null;
  analyzedImages?: string[];
}

export function ChatInterface({ selectedImage, analyzedImages = [] }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [uploadedImages, setUploadedImages] = useState<ImageFile[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [storedImageBlob, setStoredImageBlob] = useState<Blob | null>(null);

  // Store the image blob when selectedImage changes
  useEffect(() => {
    const storeImageBlob = async () => {
      if (selectedImage && analyzedImages.includes(selectedImage) && !storedImageBlob) {
        try {
          const response = await fetch(selectedImage);
          const blob = await response.blob();
          setStoredImageBlob(blob);
        } catch (error) {
          console.error('Error storing image blob:', error);
        }
      }
    };
    
    storeImageBlob();
  }, [selectedImage, analyzedImages]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        requestAnimationFrame(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
          setShowScrollButton(false);
        });
      }
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [messages, isLoading]);

  const handleScroll = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Create a FormData object to send both text and image
      const formData = new FormData();
      formData.append('query', input.trim());
      
      // Only send the image if it has been analyzed and the user is actually chatting
      if (selectedImage && analyzedImages.includes(selectedImage)) {
        if (storedImageBlob) {
          // Use the stored blob
          formData.append('image', storedImageBlob, 'selected_image.jpg');
          formData.append('is_analyzed', 'true');
        } else {
          try {
            // Fallback to fetching the image if not stored
            const response = await fetch(selectedImage);
            const blob = await response.blob();
            formData.append('image', blob, 'selected_image.jpg');
            formData.append('is_analyzed', 'true');
          } catch (error) {
            console.error('Error processing image:', error);
            // Continue without the image if there's an error
          }
        }
      }

      const response = await fetch('http://localhost:5000/query', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: ''
      };
      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert the Uint8Array to text
        const text = new TextDecoder().decode(value);
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content += text;
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error:', error);
      let errorMessage = 'Sorry, there was an error processing your request.';
      
      if (error instanceof Error) {
        if (error.message.includes('Network response was not ok')) {
          errorMessage = 'Sorry, there was a network error. Please check your connection and try again.';
        } else if (error.message.includes('No reader available')) {
          errorMessage = 'Sorry, there was an issue with the response format. Please try again.';
        } else if (error.message.includes('Gemini API')) {
          errorMessage = 'Sorry, there was an issue with the AI service. Please try again later.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages: ImageFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = (e) => {
          newImages.push({
            file: file,
            preview: e.target?.result?.toString() || ''
          });
          setUploadedImages(newImages);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto h-[600px] flex flex-col relative">
      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-hidden">
        {messages.length > 0 ? (
          <ScrollArea 
            ref={scrollAreaRef} 
            className="h-full"
            onScroll={handleScroll}
          >
            <div className="p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="whitespace-pre-wrap">
                        {message.content.split('\n').map((line, i) => {
                          // Check if the line is a header (starts with **)
                          if (line.trim().startsWith('**')) {
                            return (
                              <div key={i} className="font-bold mt-2 mb-1">
                                {line.replace(/\*\*/g, '')}
                              </div>
                            );
                          }
                          // Check if the line is a bullet point (starts with -)
                          else if (line.trim().startsWith('-')) {
                            return (
                              <div key={i} className="ml-4">
                                {line}
                              </div>
                            );
                          }
                          // Regular line
                          else {
                            return <div key={i}>{line}</div>;
                          }
                        })}
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <span className="animate-pulse">...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
            <div className="text-2xl font-semibold">Welcome to Crime Sleuth AI</div>
            <div className="text-center max-w-md">
              I'm your AI assistant for crime analysis. Ask me questions about cases, evidence, or investigative techniques.
            </div>
            {selectedImage && !analyzedImages.includes(selectedImage) && (
              <div className="text-center max-w-md mt-4 p-3 bg-yellow-100 rounded-lg">
                <p className="text-yellow-800">
                  You have selected an image. Please click the "Analyze Evidence" button first to analyze this image before asking questions about it.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && messages.length > 0 && (
        <Button
          variant="outline"
          size="icon"
          className="absolute bottom-20 right-4 rounded-full shadow-md"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}

      {/* Input Area - Fixed */}
      <div className="border-t bg-background sticky bottom-0">
        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading}>
              Send
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
} 