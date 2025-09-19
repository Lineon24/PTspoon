'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef, useState, JSX } from 'react';
import HeaderWithBack from '@/components/HeaderWithBack';
import { SendHorizontal } from 'lucide-react';

type NormalizedMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

// (https://...) 패턴을 <a> 엘리먼트로 변환
function linkify(text: string) {
  const urlRegex = /\(https?:\/\/[^\s)]+\)/g;
  const matches = text.match(urlRegex) || [];
  if (matches.length === 0) return [text];

  let lastIndex = 0;
  const elements: (string | JSX.Element)[] = [];

  matches.forEach((match, idx) => {
    const index = text.indexOf(match, lastIndex);
    if (index > lastIndex) elements.push(text.slice(lastIndex, index));
    const url = match.slice(1, -1);
    elements.push(
      <a
        key={`link-${idx}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#007aff', textDecoration: 'underline' }}
      >
        {url}
      </a>
    );
    lastIndex = index + match.length;
  });

  if (lastIndex < text.length) elements.push(text.slice(lastIndex));
  return elements;
}

// 메시지 텍스트 안전하게 추출
function getMessageText(msg: any): string {
  if (!msg) return '';
  if (typeof msg === 'string') return msg;
  if ('text' in msg && typeof msg.text === 'string') return msg.text;
  if (Array.isArray(msg.parts))
    return msg.parts.filter((p: any) => p && typeof p.text === 'string').map((p: any) => p.text).join('');
  if (Array.isArray(msg.content))
    return msg.content.filter((c: any) => c && c.type === 'text' && typeof c.text === 'string').map((c: any) => c.text).join('');
  return '';
}

export default function AiChatPage() {
  const { messages: chatMessages, sendMessage, status } = useChat();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<NormalizedMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  // chatMessages -> messages 상태에 정규화
  useEffect(() => {
    if (!Array.isArray(chatMessages)) return;

    const updated: NormalizedMessage[] = chatMessages.map(cm => ({
      id: cm.id ?? `ai-${Date.now()}`,
      role: cm.role === 'assistant' ? 'assistant' : 'user',
      text: getMessageText(cm),
    }));

    setMessages(updated);
  }, [chatMessages]);

  // 자동 스크롤
  useEffect(() => {
    if (isUserScrolling) return;

    if (status !== 'ready') {
      const iv = setInterval(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 250);
      return () => clearInterval(iv);
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, status, isUserScrolling]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollTop, clientHeight, scrollHeight } = el;
    setIsUserScrolling(scrollTop + clientHeight < scrollHeight - 20);
  };

  // 메시지 전송
  const onSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const messageToSend = input;  // 보내는 메시지 저장
    setInput(''); // 전송 즉시 입력창 비우기
    await sendMessage({ text: messageToSend });
    
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  return (
    <main
      style={{
        maxWidth: 540,
        width: '100%',
        margin: '0 auto',
        minHeight: '90svh',
        background: '#f5f8fb',
        fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <HeaderWithBack title={'피투 AI'} backTF={true} />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', padding: 12 }}
      >
        {messages.map((m, idx) => {
          const elements = linkify(m.text || '');
          return (
            <div
              key={`${m.id}-${idx}`}
              style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                marginBottom: 12,
                width: '100%',
              }}
            >
              {m.role === 'assistant' && (
                <img
                  src="/image/logo_bgx.png"
                  alt="AI"
                  style={{ width: 36, height: 36, marginRight: 8, borderRadius: '50%' }}
                />
              )}
              <div
                style={{
                  padding: '10px 14px',
                  background: m.role === 'user' ? '#007aff' : 'white',
                  color: m.role === 'user' ? 'white' : 'black',
                  borderRadius: 20,
                  maxWidth: '70%',
                  wordWrap: 'break-word',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                  whiteSpace: 'pre-wrap',
                  display: 'inline-block',
                }}
              >
                {elements.map((el, i) => (
                  <span key={i} style={{ display: 'inline' }}>
                    {el}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          width: '100%',
          padding: 8,
          background: '#fff',
          borderTop: '1.5px solid #e6eaf2',
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: 540,
          zIndex: 3,
        }}
      >
        <form onSubmit={onSend} style={{ display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status !== 'ready'}
            placeholder={status === 'ready' ? '메시지를 입력하세요...' : '피투가 열심히 생각 중이에요!'}
            style={{
              flex: 1,
              borderRadius: 8,
              border: '1px solid #d2e0f4',
              padding: '8px 10px',
              fontSize: 14,
            }}
          />
          <button
            type="submit"
            disabled={status !== 'ready' || !input.trim()}
            style={{
              padding: '8px 12px',
              borderRadius: 999,
              border: 'none',
              background: status === 'ready' && input.trim() ? '#2e7fff' : '#ccc',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <SendHorizontal size={18} />
          </button>
        </form>
      </div>
    </main>
  );
}
