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
  caseId?: string;
}

export function ChatInterface({ selectedImage, analyzedImages = [], caseId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
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

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputValue('');

    try {
      const formData = new FormData();
      formData.append('query', userMessage.content);
      
      // Add the image if one is selected
      if (selectedImage) {
        formData.append('image', selectedImage);
      }
      
      // Add case_id if available
      caseId=sessionStorage.getItem("caseId")
      if (caseId) {
        formData.append('case_id', caseId);
      }

      const response = await fetch("http://localhost:5000/api/analysis/process_query", {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'Accept': 'text/event-stream',
          'x-auth-token': sessionStorage.getItem("authToken") // Use the token from sessionStorage
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server response:", errorData);
        throw new Error(errorData.error || 'Network response was not ok');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: ''
      };
      
      setMessages(prevMessages => [...prevMessages, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert the Uint8Array to text
        const text = new TextDecoder().decode(value);
        
        // Process the SSE data format
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            
            setMessages(prevMessages => {
              const newMessages = [...prevMessages];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage.role === 'assistant') {
                lastMessage.content += data;
              }
              return newMessages;
            });
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      setMessages(prevMessages => [
        ...prevMessages, 
        { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error processing your request. Please try again.' 
        }
      ]);
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
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-4">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
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



