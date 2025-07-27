// app/posts/components/PostList.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import CommentSection from '@/components/CommentSection'; // CommentSection 컴포넌트 임포트

// Post 인터페이스 (PostPage와 동일하게 정의)
interface Post {
  id: string;
  created_at: string;
  user_id: string;
  username: string;
  title: string;
  content: string;
}

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

interface PostListProps {
  posts: Post[]; // 외부에서 받아올 게시글 목록
  profile: Profile | null; // 현재 로그인된 사용자 프로필 (댓글 작성 권한 확인용)
}

export default function PostList({ posts, profile }: PostListProps) {
  const [commentsByPostId, setCommentsByPostId] = useState<{ [postId: string]: Comment[] }>({});

  // 1. 모든 게시글의 댓글 목록 불러오기 (한 번에 다 가져옴)
  useEffect(() => {
    const fetchAllComments = async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('댓글 불러오기 오류:', error);
        return;
      }

      const groupedComments: { [postId: string]: Comment[] } = {};
      data?.forEach(comment => {
        if (!groupedComments[comment.post_id]) {
          groupedComments[comment.post_id] = [];
        }
        groupedComments[comment.post_id].push(comment);
      });
      setCommentsByPostId(groupedComments);
    };

    fetchAllComments();

    // 2. 실시간 댓글 구독
    const commentsChannel = supabase
      .channel('public:comments_for_post_list') // 채널 이름 변경 (충돌 방지)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        (payload) => {
          const newComment = payload.new as Comment;
          setCommentsByPostId((prev) => ({
            ...prev,
            [newComment.post_id]: [...(prev[newComment.post_id] || []), newComment],
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, []); // 의존성 배열 비움: 컴포넌트 마운트 시 한 번만 실행

  if (posts.length === 0) {
    return <p style={{ textAlign: 'center', color: '#777', fontSize: 16 }}>아직 게시글이 없습니다.</p>;
  }

  return (
    <>
      {posts.map((post) => (
        <div key={post.id} style={{
          border: '1px solid #e0e0e0', borderRadius: '10px', padding: '18px', marginBottom: '25px',
          background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
        }}>
          <h3 style={{ fontSize: '18px', margin: '0 0 8px 0', color: '#222' }}>{post.title}</h3>
          <p style={{ fontSize: '13px', color: '#888', margin: '0 0 12px 0' }}>
            작성자: <span style={{ fontWeight: 'bold', color: '#555' }}>{post.username}</span> | {new Date(post.created_at).toLocaleString()}
          </p>
          <p style={{ fontSize: '15px', color: '#444', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{post.content}</p>

          {/* CommentSection 컴포넌트 사용 */}
          <CommentSection
            postId={post.id}
            comments={commentsByPostId[post.id] || []}
            profile={profile}
          />
        </div>
      ))}
    </>
  );
}