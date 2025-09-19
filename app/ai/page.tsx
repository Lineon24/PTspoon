'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect, useRef } from 'react';
import HeaderWithBack from '@/components/HeaderWithBack';
import { SendHorizontal } from 'lucide-react';


// 메인 채팅 페이지 컴포넌트
export default function ChatPage() {
  // --- Hooks & State (최신 방식) ---
  const { messages, sendMessage, status } = useChat();

  // 1. 입력창의 상태를 useState로 직접 관리합니다.
  const [input, setInput] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 새 메시지가 올 때마다 맨 아래로 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // --- JSX Rendering ---
  return (
    <main
      style={{
        maxWidth: 540,
        width: '100%',
        margin: '0 auto',
        minHeight: '100svh',
        background: '#f5f8fb',
        fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <HeaderWithBack title={'피투 AI'} backTF={true} />

      {/* 2. 메시지 목록 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px'
      }}>
        {messages.map(message => {
          const contentText = message.parts.map(p => p.type === 'text' ? p.text : '').join('');

          return (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '12px',
                width: '100%'
              }}
            >
              <div style={{
                padding: '10px 14px',
                background: message.role === 'user' ? '#007aff' : 'white',
                color: message.role === 'user' ? 'white' : 'black',
                borderRadius: '20px',
                maxWidth: '70%',
                wordWrap: 'break-word',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                whiteSpace: 'pre-wrap'
              }}>
                <span>{contentText}</span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. 메시지 입력창 */}
      <div
        style={{
          width: '100%',
          padding: '8px 6px',
          background: '#fff',
          borderTop: '1.5px solid #e6eaf2',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          position: 'fixed',
          maxWidth: 540,
          margin: '0 auto',
          bottom: 0,
          zIndex: 3
        }}
      >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim() && status === 'ready') {
            // 2. 직접 관리하는 input 값을 sendMessage로 전송합니다.
            sendMessage({ text: input });
            setInput(''); // 전송 후 입력창을 비웁니다.
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flexWrap: 'nowrap'
        }}>
        <input
          value={input}
          // 3. onChange 이벤트도 직접 setInput 함수를 호출합니다.
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== 'ready'}
          placeholder={status === 'ready' ? '메시지를 입력하세요...' : 'AI가 응답 중입니다...'}
            style={{
              flex: 1,
              borderRadius: 8,
              border: '1.2px solid #d2e0f4',
              fontSize: 14,
              padding: '7px 9px',
              minWidth: 0
            }}
        />
        <button
          type="submit"
          disabled={status !== 'ready'}
          style={{
            flexShrink: 0,
            padding: '10px 9px',
            border: 'none',
            borderRadius: 50,
            background: status === 'ready' && input.trim() ? '#2e7fff' : '#ccc',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <SendHorizontal size={18} />
        </button>
      </form>
    </div>
    </main>
  );
}