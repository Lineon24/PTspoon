// app/posts/components/CommentSection.tsx
'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { SendHorizontal } from 'lucide-react';

// Comment 인터페이스 (PostPage와 동일하게 정의)
interface Comment {
  id: string;
  created_at: string;
  post_id: string;
  user_id: string;
  username: string;
  content: string;
}

// Profile 인터페이스 (로그인된 사용자의 닉네임을 가져오기 위함)
interface Profile {
  id: string;
  nickname: string;
}

interface CommentSectionProps {
  postId: string;
  comments: Comment[]; // 해당 게시글의 댓글 목록
  profile: Profile | null; // 현재 로그인된 사용자 프로필 (댓글 작성 권한 확인용)
}

export default function CommentSection({ postId, comments, profile }: CommentSectionProps) {
  const [newCommentContent, setNewCommentContent] = useState<string>('');
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false); // 댓글 열림 상태 기본값은 닫힌 상태

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      alert('댓글을 작성하려면 로그인해주세요.');
      router.push('/login');
      return;
    }
    if (!newCommentContent.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    const { error } = await supabase.from('comments').insert([
      { 
        post_id: postId,
        user_id: profile.id, 
        username: profile.nickname, 
        content: newCommentContent.trim()
      }
    ]);

    if (error) {
      console.error('댓글 작성 오류:', error);
      alert('댓글 작성에 실패했습니다.');
    } else {
      setNewCommentContent(''); // 입력 필드 초기화
    }
  };

  return (
    <div style={{ borderTop: '1px solid #eee', marginTop: '10px', paddingTop: '13px'}}>
      <h2 style={{ fontSize: '16px', marginBottom: '0px', color: '#555'}}>댓글 ({comments.length || 0})
        <button
          onClick={() => setIsOpen(prev => !prev)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#414de4',
            fontSize: 16,
            fontWeight: 'bold',
            padding: '10px',
            }}
            >
            {isOpen ? '접기' : '펼치기'}
            <span
              style={{
                padding: '5px',
                display: 'inline-block',
                transition: 'transform 0.3s ease',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                lineHeight: 1,
            }}
            >
            ▼
            </span>
        </button>
      </h2>
      {/* 댓글 목록 */}
      {isOpen && (
      <>
      {comments.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#999', marginBottom: '10px' }}>아직 댓글이 없습니다.</p>
      ) : (
          comments.map((comment) => (
            <div key={comment.id} style={{
              background: '#f9f9f9', borderRadius: '8px', padding: '12px', marginBottom: '8px',
              border: '1px solid #f0f0f0'
          }}>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 5px 0' }}>
              <span style={{ fontWeight: 'bold', color: '#333' }}>{comment.username}</span> | {new Date(comment.created_at).toLocaleString()}
            </p>
            <p style={{ fontSize: '14px', color: '#444', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{comment.content}</p>
          </div>
        ))
      )}

      {/* 댓글 입력 폼 */}
      <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
        <input
          type="text"
          placeholder={profile ? "댓글을 입력하세요..." : "로그인 후 댓글을 작성할 수 있습니다."}
          value={newCommentContent}
          onChange={(e) => setNewCommentContent(e.target.value)}
          disabled={!profile} // 로그인 안 되어 있으면 비활성화
          style={{ flexGrow: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: 14, background: profile ? '#fff' : '#f0f0f0' }}
        />
        <button
          type="submit"
          disabled={!profile} // 로그인 안 되어 있으면 비활성화
          style={{ padding: '5px 15px', borderRadius: '8px', border: 'none', background: profile ? '#414de4' : '#ccc', color: 'white', fontSize: '10px', fontWeight: 'bold', cursor: profile ? 'pointer' : 'not-allowed' }}
        >
          <SendHorizontal size={20}/>
        </button>
      </form>
      </>
      )}
    </div>
  );
}