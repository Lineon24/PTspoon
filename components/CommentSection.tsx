'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useParams } from 'next/navigation';
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
// 인자 값으로 포스트 id, 댓글 리스트, 프로필 정보를 받아옴 
export default function CommentSection({ postId, comments, profile }: CommentSectionProps) { 
  const [newCommentContent, setNewCommentContent] = useState<string>('');
  const router = useRouter();
  const params = useParams();
  const commentOpenTF = !!params.posts_id; 
  const [isOpen, setIsOpen] = useState(commentOpenTF); // 댓글 열림 상태 기본값은 닫힌 상태

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault(); // 폼 제출 시 새로고침 방지

    if (!profile) { // 댓글 작성 권한 확인용
      alert('댓글을 작성하려면 로그인해주세요.');
      router.push('/login');
      return;
    }
    if (!newCommentContent.trim()) { // 제출 시 댓글이 빈 내용이면 알림 및 빈 내용을 데이터 베이스에 올리는 것을 방지
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    const { error } = await supabase.from('comments').insert([ // 댓글 내용 데이터 베이스 삽입 부분
      { 
        post_id: postId,
        user_id: profile.id, 
        username: profile.nickname, 
        content: newCommentContent.trim()
      }
    ]);

    if (error) { // 오류 시 처리 부분
      console.error('댓글 작성 오류:', error);
      alert('댓글 작성에 실패했습니다.');
    } else {
      setNewCommentContent(''); // 입력 필드 초기화
    }
  };
const deleteComment = async (commentId: string) => { // 댓글 삭제 부분
  const confirmDelete = window.confirm('정말로 이 댓글을 삭제하시겠습니까?');
  if (!confirmDelete) return; // confirm 윈도우 정보 창이 나오고 거절 시 취소

  const { error } = await supabase.from('comments') // 실제 데이터 베이스 삭제 부분
    .delete()
    .eq('id', commentId);
  if (error) { // 오류 시 처리 부분
    alert('댓글 삭제에 실패했습니다.');
    console.error('삭제 오류:', error);
    return;
  }
  alert('댓글이 삭제되었습니다.');
  };

  return (
    <div style={{ borderTop: '1px solid #eee', marginTop: '10px', paddingTop: '13px'}}>
      <h2 style={{ fontSize: '16px', marginLeft: '5px', marginBottom: '0px', color: '#555'}}>댓글 ({comments.length || 0}) {/*댓글 수 정보 표현*/}
        <button
          onClick={() => setIsOpen(prev => !prev)} // 댓글 창 접기 기능
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
              background: '#f9f9f9', borderRadius: '8px', padding: '8px', margin: '2px 3px 8px 3px',
              border: '1px solid #f0f0f0'
          }}>
            <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
            }}>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 5px 0' }}>
              <span style={{ fontWeight: 'bold', color: '#333' }}>{comment.username}</span> | {new Date(comment.created_at).toLocaleString()}
            </p>
            {profile?.id === comment.user_id && ( // 댓글 작성자와 현 사용자의 id 같으면 삭제 버튼 표시
            <button
            onClick={() => deleteComment(comment.id)}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '20px',
              color: '#999',
              cursor: 'pointer',
              marginLeft: '1px',
              }}
            title="댓글 삭제"
              >
              ×
          </button>)}
            </div>
            <p style={{ fontSize: '14px', color: '#444', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{comment.content}</p>
          </div>
        ))
      )}

      {/* 댓글 입력 폼 */}
      <form onSubmit={handleSubmitComment} style={{ width: '100%', display: 'flex', gap: '8px', marginTop: '15px', margin: '15px 0'}}>
        <input
          type="text"
          placeholder={profile ? "댓글을 입력하세요..." : "로그인 후 댓글을 작성할 수 있습니다."}
          value={newCommentContent}
          onChange={(e) => setNewCommentContent(e.target.value)}
          disabled={!profile} // 로그인 안 되어 있으면 비활성화
          style={{ flexGrow: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: 14, background: profile ? '#fff' : '#f0f0f0', boxSizing: 'border-box' }}
        />
        <button
          type="submit"
          disabled={!profile} // 로그인 안 되어 있으면 비활성화
          style={{ padding: '10px 15px', borderRadius: '8px', border: 'none', background: profile ? '#414de4' : '#ccc', color: 'white', fontSize: '10px', fontWeight: 'bold', cursor: profile ? 'pointer' : 'not-allowed', boxSizing: 'border-box' }}
        >
          <SendHorizontal size={20}/> {/*전송 아이콘*/}
        </button>
      </form>
      </>
      )}
    </div>
  );
}