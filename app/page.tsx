'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Search, Send, ArrowLeft, Phone, Video, Paperclip, User } from 'lucide-react';

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

let socket: Socket;

const USER_COLORS = [
  { text: 'text-sky-500', border: 'border-sky-400' },
  { text: 'text-rose-500', border: 'border-rose-400' },
  { text: 'text-amber-500', border: 'border-amber-400' },
  { text: 'text-emerald-500', border: 'border-emerald-400' },
  { text: 'text-purple-500', border: 'border-purple-400' },
];

export default function Home() {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'home' | 'chat' | 'notFound'>('home');
  const [activeKeyword, setActiveKeyword] = useState('message');
  
  const [username, setUsername] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [inputMsg, setInputMsg] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket = io();

    socket.on('init-keyword', (kw: string) => {
      setActiveKeyword(kw);
    });

    socket.on('keyword-updated', (newKw: string) => {
      setActiveKeyword(newKw);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'System',
          text: `[Admin] Search secret keyword updated to: "${newKw}". Old search terms will no longer work.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    });

    socket.on('receive-message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('system-message', (text: string) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: 'System', text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);
    });

    // Auto-revert to Google search page when alt-tabbing or switching tabs
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setView('home');
        setQuery('');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      socket.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return;

    // ONLY the current active secret keyword works. Old keywords fail with a 404.
    if (cleanQuery === activeKeyword) {
      setView('chat');
    } else {
      setView('notFound');
    }
  };

  const handleJoinChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      setHasJoined(true);
      socket.emit('join-room', username.trim());
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMsg.trim();
    if (!text) return;

    // Command to change the secret search keyword: /changepassword <new_word>
    if (text.startsWith('/changepassword ')) {
      const newWord = text.replace('/changepassword ', '').trim().toLowerCase();
      if (newWord) {
        socket.emit('change-keyword', newWord);
      }
      setInputMsg('');
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: username,
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    socket.emit('send-message', newMessage);
    setInputMsg('');
  };

  const getUserStyle = (senderName: string) => {
    if (senderName === username) {
      return { text: 'text-rose-500', border: 'border-rose-400' };
    }
    let hash = 0;
    for (let i = 0; i < senderName.length; i++) {
      hash = senderName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % USER_COLORS.length;
    return USER_COLORS[index];
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col font-sans select-none">
      {/* GOOGLE SEARCH HOMEPAGE */}
      {view === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="mb-8">
            <h1 className="text-7xl font-bold tracking-tighter">
              <span className="text-blue-500">G</span>
              <span className="text-red-500">o</span>
              <span className="text-yellow-500">o</span>
              <span className="text-blue-500">g</span>
              <span className="text-green-500">l</span>
              <span className="text-red-500">e</span>
            </h1>
          </div>

          <form onSubmit={handleSearch} className="w-full max-w-2xl">
            <div className="relative flex items-center w-full rounded-full border border-gray-200 shadow-sm hover:shadow-md focus-within:shadow-md transition-shadow px-4 py-3">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input
                type="text"
                className="w-full outline-none text-gray-700 text-base"
                placeholder="Search Google or type a URL"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex justify-center gap-3 mt-6">
              <button
                type="submit"
                className="bg-gray-50 border border-transparent hover:border-gray-200 text-sm text-gray-800 px-4 py-2 rounded focus:outline-none"
              >
                Google Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuery(activeKeyword);
                  setView('chat');
                }}
                className="bg-gray-50 border border-transparent hover:border-gray-200 text-sm text-gray-800 px-4 py-2 rounded focus:outline-none"
              >
                I'm Feeling Lucky
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MESSAGING UI */}
      {view === 'chat' && (
        <div className="flex-1 flex flex-col h-screen bg-white">
          {/* Header */}
          <header className="border-b px-4 py-3 flex items-center justify-between bg-white shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('home')}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                title="Back to search"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                  <User className="w-5 h-5" />
                </div>
                {/* 9 Yellow 9 Blue 9 Green GC Name */}
                <h2 className="text-lg font-bold tracking-tight">
                  <span className="text-yellow-500">9 Yellow </span>
                  <span className="text-blue-500">9 Blue </span>
                  <span className="text-green-500">9 Green</span>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3 text-gray-600">
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Video className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Phone className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* User Display Name Setup */}
          {!hasJoined ? (
            <div className="flex-1 flex items-center justify-center p-4 bg-gray-50">
              <div className="bg-white p-8 rounded-2xl shadow-md max-w-sm w-full border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Join Group Chat</h3>
                <p className="text-gray-500 text-sm mb-6">Enter a display name to start chatting.</p>
                <form onSubmit={handleJoinChat} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Display Name</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. Alex"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-800 outline-none focus:ring-2 focus:ring-sky-500 transition-all text-sm"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-2.5 rounded-xl transition-colors text-sm shadow-sm"
                  >
                    Start Chatting
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Active Clean Chat feed */
            <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto overflow-hidden bg-white">
              <div className="flex-1 px-6 py-4 overflow-y-auto space-y-6">
                {messages.map((msg) => {
                  const isSystem = msg.sender === 'System';
                  const isSelf = msg.sender === username;
                  const style = getUserStyle(msg.sender);

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="text-center text-xs text-gray-400 py-1 font-medium">
                        {msg.text}
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="flex flex-col items-start text-left">
                      <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${style.text}`}>
                        {isSelf ? 'ME' : msg.sender}
                      </span>
                      <div className={`pl-3 border-l-2 ${style.border} text-gray-800 text-base leading-relaxed py-0.5 max-w-2xl`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              <div className="p-4 border-t bg-white">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-sky-400 transition-all">
                  <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    placeholder="Send a chat (use /changepassword <word> to change trigger)"
                    className="flex-1 bg-transparent outline-none text-gray-800 text-sm px-2"
                  />
                  <button
                    type="button"
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button
                    type="submit"
                    className="p-2 bg-sky-500 hover:bg-sky-600 text-white rounded-full transition-colors flex items-center justify-center shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 404 ERROR PAGE */}
      {view === 'notFound' && (
        <div className="flex-1 flex flex-col p-8 items-start justify-start max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-4 mb-8 w-full border-b pb-4">
            <h1 className="text-2xl font-bold">
              <span className="text-blue-500">G</span>
              <span className="text-red-500">o</span>
              <span className="text-yellow-500">o</span>
              <span className="text-blue-500">g</span>
              <span className="text-green-500">l</span>
              <span className="text-red-500">e</span>
            </h1>
            <button 
              onClick={() => {
                setQuery('');
                setView('home');
              }} 
              className="text-blue-600 hover:underline text-sm ml-auto"
            >
              ← Back to Search
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-lg font-medium text-gray-800">
              <strong>404.</strong> <span className="text-gray-500">That’s an error.</span>
            </p>
            <p className="text-sm text-gray-600">
              The requested URL <code>/search?q={encodeURIComponent(query)}</code> was not found on this server. <span className="text-gray-500">That’s all we know.</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
