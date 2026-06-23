import { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext.jsx';
import { usePlayer } from '../../context/PlayerContext.jsx';

export default function ChatPanel() {
  const { chatLog, sendChat } = useGame();
  const { playerName } = usePlayer();
  const [message, setMessage] = useState('');
  const chatEndRef = useRef(null);

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    sendChat(trimmed);
    setMessage('');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  return (
    <div className="bg-white rounded-2xl border border-navy/10 shadow-sm flex flex-col h-[350px] md:h-[450px] overflow-hidden">
      <div className="bg-bg-slate px-4 py-3 border-b border-navy/10 flex justify-between items-center">
        <span className="font-heading font-extrabold text-sm text-navy uppercase tracking-wider">
          Battle Communications
        </span>
        <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-bold">
          SECURE CHANNEL
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-bg-slate/30">
        {chatLog.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-navy/40 font-medium">
            Transmission link established. Enter message to broadcast.
          </div>
        ) : (
          chatLog.map((msg, index) => {
            const isMe = msg.sender === playerName;
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div
                key={index}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className={`text-[10px] font-bold ${isMe ? 'text-ocean' : 'text-navy/60'}`}>
                    {isMe ? 'You' : msg.sender}
                  </span>
                  <span className="text-[8px] text-navy/35 font-semibold">{time}</span>
                </div>
                <div
                  className={`px-3.5 py-2 rounded-2xl max-w-[85%] text-sm font-medium leading-relaxed ${
                    isMe
                      ? 'bg-navy text-white rounded-tr-none shadow-sm'
                      : 'bg-white border border-navy/5 text-navy-dark rounded-tl-none shadow-sm'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-navy/10 bg-white flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Transmit signal..."
          maxLength={150}
          className="flex-1 px-4 py-2 border border-navy/15 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean focus:border-transparent transition-all placeholder-navy/40 text-navy-dark"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-navy hover:bg-navy/90 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-all"
        >
          Send
        </button>
      </form>
    </div>
  );
}
