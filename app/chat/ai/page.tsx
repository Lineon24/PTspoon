'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef, useState, JSX, useLayoutEffect } from 'react';
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
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem('pitu_ai_user_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('pitu_ai_user_id', id);
    }
    setUserId(id);
  }, []);
  
  const { messages: chatMessages, sendMessage, status, error, clearError } = useChat();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<NormalizedMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true); // 초기값을 true로 설정
  const [lastSentByUser, setLastSentByUser] = useState(false);
  
  const [countdown, setCountdown] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  // ⭐ 2. autoResize 함수를 스크롤까지 처리하는 개선된 버전으로 교체합니다.
  const autoResize = (el: HTMLTextAreaElement) => {
    const chatContainer = containerRef.current;
    if (!chatContainer) return;
    const isScrolledToBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 5;

    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';

    if (isScrolledToBottom) {
      setTimeout(() => { chatContainer.scrollTop = chatContainer.scrollHeight; }, 0);
    }
  };


  useEffect(() => {
    if (!Array.isArray(chatMessages)) return;

    const updated: NormalizedMessage[] = chatMessages.map(cm => ({
      id: cm.id ?? `ai-${Date.now()}`,
      role: cm.role === 'assistant' ? 'assistant' : 'user',
      text: getMessageText(cm),
    }));

    setMessages(updated);
  }, [chatMessages]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setIsAtBottom(atBottom);
  };

  useLayoutEffect(() => {
  const chatContainer = containerRef.current;
  if (!chatContainer) return;

  // --- 조건 1: 내가 메시지를 보냈을 경우 ---
  // lastSentByUser가 true이면, 스크롤 위치와 상관없이 무조건 맨 아래로 이동합니다.
  if (lastSentByUser) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
    setLastSentByUser(false); // 플래그는 다시 원상태로 돌려놓습니다.
    return; // 내 메시지 전송 시의 로직은 여기서 끝냅니다.
  }

  // --- 조건 2: 상대방(AI)의 메시지를 받았을 경우 ---
  // isAtBottom이 true일 때만 (즉, 사용자가 이미 맨 아래에 있을 때만) 스크롤을 맨 아래로 이동시킵니다.
  if (isAtBottom) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  
  // 사용자가 스크롤을 위로 올려서 이전 내용을 보고 있는 경우(isAtBottom === false)에는 아무 동작도 하지 않습니다.

}, [messages, lastSentByUser]);

  const onSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !userId || !textareaRef.current) return;

    if (status === 'error') {
      clearError();
      return;
    }
    textareaRef.current.style.height = 'auto'; 
    const messageToSend = input;
    setInput('');

    setLastSentByUser(true);
      await sendMessage({ text: messageToSend, metadata: { userId } });
  };

  useEffect(() => { // 상태 api를 통해 남은 시간을 가져오는 로직
    const checkRateLimitStatus = async () => {
      if (status === 'error') {
        try {
          const res = await fetch(`/api/status?userId=${userId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.isBlocked) {
              setCountdown(data.remainingTime);
            } else {
              setCountdown(0);
            }
          }
        } catch (e) {
          console.error("Failed to fetch rate limit status:", e);
          setCountdown(0);
        }
      }
    };
    if (userId) {
      checkRateLimitStatus();
    }
  }, [status, userId]);

  useEffect(() => { // 카운트 담당 로직 겸 카운트다운 이상한 값 일시 수정
    if (countdown === null || countdown <= 0) {
      if (countdown === 0) {
        setCountdown(null);
        clearError();
      }
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => (prev ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, clearError]);

  const placeholderText =
    countdown !== null && countdown > 0
      ? `피투가 너무 많은 질문을 받았어요. ${countdown}초 후에 다시 시도해주세요.`
      : status === 'ready'
      ? '메시지를 입력하세요...'
      : '피투가 열심히 생각 중이에요!';

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && textarea.value === '' && placeholderText) {
      textarea.value = placeholderText;
      autoResize(textarea);
      textarea.value = '';
    }
  }, [placeholderText]);

  return (
    <main
      style={{
        maxWidth: 540,
        width: '100%',
        paddingTop: '44px',
        margin: '0 auto',
        height: '100dvh',
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
        style={{ flex: 1, overflowY: 'auto', padding: 12, minHeight: 0 }}
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

      {/* ⭐ 1. 입력창에서 position: fixed 관련 스타일을 모두 제거합니다. */}
      <div
        style={{
          width: '100%',
          padding: 8,
          background: '#fff',
          borderTop: '1.5px solid #e6eaf2',
          flexShrink: 0, // 입력창이 찌그러지는 것을 방지
        }}
      >
        <form onSubmit={onSend} style={{ display: 'flex', gap: 8, alignItems: 'flex-end'}}>
          <textarea
            ref={textareaRef}
            rows={1}
            maxLength={300}
            value={input}
            disabled={status !== 'ready' || countdown !== null}
            onChange={(e) => {
              setInput(e.target.value)
              autoResize(e.target) // 높이 자동 조절
            }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                onSend()
              }
            }}
            placeholder={placeholderText} 
            style={{
              flex: 1,
              borderRadius: 8,
              border: '1px solid #d2e0f4',
              padding: '8px 10px',
              fontSize: 14,
              resize: 'none',
              overflow: 'hidden'
            }}
          />
          <button
            type="submit"
            disabled={status !== 'ready' || countdown !== null || !input.trim()}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "none",
              background: (status === 'ready' && countdown === null && input.trim())
                ? '#2e7fff'
                : '#ccc',
              color: '#fff',
              cursor: "pointer",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SendHorizontal size={18} />
          </button>
        </form>
      </div>
    </main>
  );
}