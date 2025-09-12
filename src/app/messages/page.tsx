'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  Search, 
  Send, 
  User, 
  Clock,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  participantRole: 'PROVIDER' | 'SEEKER';
  lastMessage?: Message;
  unreadCount: number;
  isOnline: boolean;
}

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    fetchConversations();
  }, [session, status, router]);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/messages');
      const data = await response.json();
      
      if (response.ok) {
        setConversations(data.conversations);
        if (data.conversations.length > 0) {
          setSelectedConversation(data.conversations[0].id);
          fetchMessages(data.conversations[0].id);
        }
      } else {
        console.error('Failed to fetch conversations:', data.error);
        setConversations([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversations([]);
      setLoading(false);
    }
  };

  // Keep old function for fallback
  const fetchConversationsOld = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockConversations: Conversation[] = [
        {
          id: '1',
          participantId: 'p1',
          participantName: 'Dr. Sarah Johnson',
          participantRole: 'PROVIDER',
          lastMessage: {
            id: 'm1',
            senderId: 'p1',
            content: 'Thanks for booking the consultation. I will send you the meeting details shortly.',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            isRead: false
          },
          unreadCount: 2,
          isOnline: true
        },
        {
          id: '2',
          participantId: 'p2',
          participantName: 'John Smith',
          participantRole: 'PROVIDER',
          lastMessage: {
            id: 'm2',
            senderId: session?.user?.id || 'current-user',
            content: 'Thank you for the great session yesterday!',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            isRead: true
          },
          unreadCount: 0,
          isOnline: false
        },
        {
          id: '3',
          participantId: 'p3',
          participantName: 'Emily Davis',
          participantRole: 'PROVIDER',
          lastMessage: {
            id: 'm3',
            senderId: 'p3',
            content: 'I have prepared the documents you requested. Let me know when you are ready to review them.',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            isRead: true
          },
          unreadCount: 0,
          isOnline: true
        }
      ];
      
      setConversations(mockConversations);
      if (mockConversations.length > 0) {
        setSelectedConversation(mockConversations[0].id);
        fetchMessages(mockConversations[0].id);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/${conversationId}`);
      const data = await response.json();
      
      if (response.ok) {
        const formattedMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          senderId: msg.senderId,
          content: msg.content,
          timestamp: msg.createdAt,
          isRead: true // Assuming all messages are read for now
        }));
        setMessages(formattedMessages);
      } else {
        console.error('Failed to fetch messages:', data.error);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  };

  // Keep old function for fallback
  const fetchMessagesOld = async (conversationId: string) => {
    try {
      // Mock messages for the selected conversation
      const mockMessages: Message[] = [
        {
          id: 'm1',
          senderId: 'p1',
          content: 'Hi! I received your booking request for tax consultation.',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          isRead: true
        },
        {
          id: 'm2',
          senderId: session?.user?.id || 'current-user',
          content: 'Great! I have some questions about capital gains tax.',
          timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
          isRead: true
        },
        {
          id: 'm3',
          senderId: 'p1',
          content: 'Perfect! I specialize in capital gains. Could you share some details about your investments?',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          isRead: true
        },
        {
          id: 'm4',
          senderId: 'p1',
          content: 'Thanks for booking the consultation. I will send you the meeting details shortly.',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          isRead: false
        }
      ];
      
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: session?.user?.id || 'current-user',
      content: newMessage,
      timestamp: new Date().toISOString(),
      isRead: true
    };

    setMessages([...messages, message]);
    setNewMessage('');

    // Update the last message in conversations
    setConversations(conversations.map(conv => 
      conv.id === selectedConversation 
        ? { ...conv, lastMessage: message }
        : conv
    ));
  };

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Conversations Sidebar */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-900" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-slate-900"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <User className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations</h3>
              <p className="text-gray-900 mb-4">Start consulting with experts to begin messaging</p>
              <button
                onClick={() => router.push('/search')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
              >
                Find Experts
              </button>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => {
                  setSelectedConversation(conversation.id);
                  fetchMessages(conversation.id);
                }}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedConversation === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      {conversation.participantAvatar ? (
                        <img
                          src={conversation.participantAvatar}
                          alt={conversation.participantName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-gray-900" />
                      )}
                    </div>
                    {conversation.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {conversation.participantName}
                      </h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-gray-800">
                          {new Date(conversation.lastMessage.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                    
                    {conversation.lastMessage && (
                      <p className="text-sm text-gray-900 truncate">
                        {conversation.lastMessage.senderId === session?.user?.id ? 'You: ' : ''}
                        {conversation.lastMessage.content}
                      </p>
                    )}
                  </div>

                  {conversation.unreadCount > 0 && (
                    <div className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                      {conversation.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    {selectedConv.participantAvatar ? (
                      <img
                        src={selectedConv.participantAvatar}
                        alt={selectedConv.participantName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-gray-900" />
                    )}
                  </div>
                  {selectedConv.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedConv.participantName}</h2>
                  <p className="text-sm text-gray-900">
                    {selectedConv.isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-900" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Video className="w-5 h-5 text-gray-900" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <MoreVertical className="w-5 h-5 text-gray-900" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.senderId === session?.user?.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.senderId === session?.user?.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className="flex items-center justify-end mt-1">
                      <span className="text-xs opacity-75">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <form onSubmit={sendMessage} className="flex items-center space-x-2">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Paperclip className="w-5 h-5 text-gray-900" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-slate-900"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2 p-1 hover:bg-gray-100 rounded"
                  >
                    <Smile className="w-4 h-4 text-gray-900" />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <User className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-900">Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}