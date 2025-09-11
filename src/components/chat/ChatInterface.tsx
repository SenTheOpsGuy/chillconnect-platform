'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Send, Clock, AlertCircle } from 'lucide-react';
import { subscribeToChatChannel, unsubscribeFromChatChannel } from '@/lib/pusher/client';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderName: string;
  isOwn: boolean;
  senderId: string;
}

interface ChatInterfaceProps {
  bookingId: string;
}

export default function ChatInterface({ bookingId }: ChatInterfaceProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatAvailable, setChatAvailable] = useState(false);
  const [chatExpiresAt, setChatExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchMessages();
  }, [bookingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!bookingId) return;

    // Subscribe to real-time updates
    const channel = subscribeToChatChannel(bookingId);
    
    channel.bind('new-message', (data: any) => {
      // Only add the message if it's not from the current user
      // (current user's messages are added optimistically)
      if (data.senderId !== session?.user?.id) {
        const newMessage: Message = {
          id: data.id,
          content: data.content,
          createdAt: data.createdAt,
          senderName: data.senderName,
          isOwn: false,
          senderId: data.senderId
        };
        setMessages(prev => [...prev, newMessage]);
      }
    });

    return () => {
      unsubscribeFromChatChannel(bookingId);
    };
  }, [bookingId, session?.user?.id]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/chat/${bookingId}`);
      const data = await response.json();

      if (response.ok) {
        setMessages(data.messages || []);
        setChatAvailable(data.chatAvailable);
        setChatExpiresAt(data.expiresAt);
      } else {
        setError(data.error || 'Failed to load messages');
      }
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      createdAt: new Date().toISOString(),
      senderName: session?.user?.name || 'You',
      isOwn: true,
      senderId: session?.user?.id || ''
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          content: messageContent
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }

      const data = await response.json();
      
      // Replace optimistic message with real one
      setMessages(prev => 
        prev.map(msg => 
          msg.id === optimisticMessage.id 
            ? { ...msg, id: data.messageId, createdAt: data.createdAt }
            : msg
        )
      );
    } catch (err) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatExpiryTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!chatAvailable) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-900 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chat Not Available</h3>
          <p className="text-gray-900">
            {chatExpiresAt 
              ? `Chat expired on ${formatExpiryTime(chatExpiresAt)}`
              : 'Chat is not available for this booking'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-96 bg-white border border-gray-200 rounded-lg">
      {/* Chat Header */}
      <div className="p-4 bg-gray-50 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Session Chat</h3>
          {chatExpiresAt && (
            <div className="flex items-center text-sm text-gray-900">
              <Clock className="w-4 h-4 mr-1" />
              <span>Until {formatExpiryTime(chatExpiresAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-800">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.isOwn
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                {!message.isOwn && (
                  <p className="text-xs font-medium mb-1 opacity-75">
                    {message.senderName}
                  </p>
                )}
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.isOwn ? 'text-blue-200' : 'text-gray-800'
                }`}>
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
        <div className="flex space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}