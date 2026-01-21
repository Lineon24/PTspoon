// 게시글 '상세보기' 페이지 입니다.
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import CommentSection from '@/components/CommentSection';
import { Carousel } from 'react-responsive-carousel';
import { useRouter, useParams } from 'next/navigation';
import HeaderWithBack from '@/components/HeaderWithBack';
import "react-responsive-carousel/lib/styles/carousel.min.css"
import { SendHorizontal } from 'lucide-react';
import PostShareButton from '@/components/PostShareButton';

// 인터페이스 정의 (기존과 동일)
interface Post {
  id: string;
  created_at: string;
  user_id: string;
  username: string;
  title: string;
  content: string;
  image_urls: string[];
  tag?:string[];
}

interface Comment {
  id: string;
  created_at: string;
  post_id: string;
  user_id: string;
  username: string;
  content: string;
}
interface Image_comments {
  id: string;
  user_id: string;
  post_id: string;
  username: string;
  content: string;
  image_id: string;
  created_at: string;
}

interface Profile {
  id: string;
  nickname: string;
}

// 컴포넌트 이름을 PostPage 또는 PostDetail 등으로 변경하는 것을 추천합니다.
export default function PostPage({ }) {
  const router = useRouter();
  const params = useParams();
  const posts_id = params.posts_id as string; // 주소에서 post_id 가져오기

  const [profile, setProfile] = useState<Profile | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [image_comments, setimage_comments] = useState<Image_comments[]>([]);
  const [image_idx, setimage_idx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false); // 댓글 열림 상태 기본값은 닫힌 상태
  const [newCommentContent, setNewCommentContent] = useState<string>('');

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
  
      const { error } = await supabase.from('image_comments').insert([ // 댓글 내용 데이터 베이스 삽입 부분
        { 
          post_id: posts_id,
          user_id: profile.id, 
          username: profile.nickname, 
          content: newCommentContent.trim(),
          image_id: String(image_idx),
        }
      ]);
  
      if (error) { // 오류 시 처리 부분
        console.error('댓글 작성 오류:', error);
        alert('댓글 작성에 실패했습니다.');
      } else {
        setNewCommentContent(''); // 입력 필드 초기화
      }
    };

  useEffect(() => { // 댓글 권한과 게시글 삭제 권한 체크용 프로필 가져오기
    async function getUserProfile() {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', userData.user.id)
          .single();
        if (profileData) {
          setProfile({ id: userData.user.id, ...profileData });
        } else {
          setProfile({ id: userData.user.id, nickname: '게스트' });
        }
      }
      setLoading(false);
    }
    getUserProfile();
  }, []); // 한번만 실행

  // posts_id가 바뀔 때마다 해당 게시글과 댓글을 새로 불러오기
  useEffect(() => {
    if (!posts_id) return; // posts_id가 없으면 아무것도 실행하지 않음 게시글이 없을때의 메시지는 아래에 있음

    const fetchPostAndComments = async () => {
      setLoading(true);

      // 특정 게시글 불러오기
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', posts_id)
        .single(); 

      if (postError || !postData) {
        console.error('게시글 불러오기 오류:', postError);
        setPost(null); // 게시글이 없으면 null 처리
        setLoading(false);
        return;
      }
      setPost(postData);

      // 해당 게시글의 댓글 목록 불러오기
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', posts_id)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('댓글 불러오기 오류:', commentsError);
      } else {
        setComments(commentsData || []);
      }
      
      const { data: Image_commentsData, error: Image_commentsError } = await supabase
        .from('image_comments')
        .select('*')
        .eq('post_id', posts_id)
        .order('created_at', { ascending: true });

      if (Image_commentsError) {
        console.error('댓글 불러오기 오류:', Image_commentsError);
      } else {
        setimage_comments(Image_commentsData || []);
      }
      
      setLoading(false);
    };

    fetchPostAndComments();

  }, [posts_id]); // URL의 posts_id가 변경될 때마다 다시 실행


  const visibleImageComments = useMemo(() => {
   if (!image_comments) return []; // 항상 빈 배열이라도 반환하도록 합니다.

    // 필터링된 결과를 바로 return 합니다.
    return image_comments.filter(
      (image_comments) => image_comments.image_id === String(image_idx)
    );
  }, [image_idx, image_comments]);

  // 실시간 댓글 구독
  useEffect(() => {
    if (!posts_id) return;

    const commentsChannel = supabase
      .channel(`public:comments:post_id=eq.${posts_id}`) // 채널 이름 겹치지 않게 변경
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${posts_id}` },
        (payload) => {
          // 새 댓글이 추가되면 배열에 추가
          setComments((prevComments) => [...prevComments, payload.new as Comment]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments', filter: `post_id=eq.${posts_id}` },
        (payload) => {
          // 삭제된 댓글을 배열에서 제거
          setComments((prevComments) => prevComments.filter(comment => comment.id !== payload.old.id));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'image_comments', filter: `post_id=eq.${posts_id}` },
        (payload) => {
          // 이미지에 새 댓글이 추가되면 배열에 추가
          setimage_comments((prevImage_Comments) => [...prevImage_Comments, payload.new as Image_comments]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'image_comments', filter: `post_id=eq.${posts_id}` },
        (payload) => {
          // 이미지에 있던 삭제된 댓글을 배열에서 제거
          setimage_comments((prevImage_Comments) => prevImage_Comments.filter(image_comments => image_comments.id !== payload.old.id));
        }
      )
      .subscribe();

    // 컴포넌트가 사라질 때 구독 해제
    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [posts_id]); // posts_id가 변경될 때마다 구독도 새로 설정


  // 게시글 삭제 함수 
  const deletePost = async () => {
    if (!post) return; // post가 없으면 실행 안 함

    if (profile?.id !== post.user_id) { // 내 게시글이면 삭제 가능
      alert('삭제 권한이 없습니다.');
      return;
    }
    const confirmDelete = window.confirm('정말로 이 게시글을 삭제하시겠습니까?');
    if (!confirmDelete) return;

    try {
      if (post.image_urls && post.image_urls.length > 0) {
        const filePaths = post.image_urls.map(url => url.split('/board-image/')[1]);
        await supabase.storage.from('board-image').remove(filePaths);
      }
      await supabase.from('posts').delete().eq('id', post.id);

      alert('게시글이 삭제되었습니다.');
      router.push('/posts'); // 삭제 후 게시글 페이지로 이동
    } catch (error: any) {
      console.error('삭제 오류:', error);
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  // 로딩 중일 때 표시
  if (loading) return ( 
    <main>
    <p style={{ textAlign: 'center', color: '#777', fontSize: 20, padding: '20px' }}>게시글을 불러오는 중입니다...</p>
    <HeaderWithBack title={post?.title ?? '게시글' } backTF= {true} /> {/* 상단 고정 헤더 */}
    </main>
  );

  // 게시글이 없을 때 표시
  if (!post) return(
    <main>
    <p style={{ textAlign: 'center', color: '#777', fontSize: 20, padding: '20px' }}>게시글을 찾을 수 없습니다.</p>
    <HeaderWithBack title={'게시글'} backTF= {true} /> {/* 상단 고정 헤더 */}
    </main>
  );

const deleteimageComment = async (image_commentsid: string) => { // 댓글 삭제 부분
  const confirmDelete = window.confirm('정말로 이 댓글을 삭제하시겠습니까?');
  if (!confirmDelete) return; // 윈도우 정보 창이 나오고 거절 시 취소

  const { error } = await supabase.from('image_comments') // 실제 데이터 베이스 삭제 부분
    .delete()
    .eq('id', image_commentsid);
  if (error) { // 오류 시 처리 부분
    alert('댓글 삭제에 실패했습니다.');
    console.error('삭제 오류:', error);
    return;
  }
  alert('댓글이 삭제되었습니다.');
  };


return (
  <div style={{
    maxWidth: 540,
    width: '100vw',
    margin: '0 auto',
    minHeight: '100svh',
    
  }}>
    <HeaderWithBack title={'게시글'} backTF={true} />
    {/*게시글 제목 + 태그*/}
    <div style={{
      display: 'flex',
      maxWidth:'530px',
      justifyContent:'space-between',
      alignItems: 'flex-start',
      marginBottom: '8px',
    }}>
      <div style={{
        display:'flex',
        flexDirection: 'column',
        alignItems:'flex-start',
        flex:1,
      }}>
        {post.tag && post.tag.length > 0 && (
  <div style={{
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    marginLeft: 8,
    marginTop: 14,
    marginBottom: 2,
  }}>
    {post.tag.map((t) => {
      // 시스템용 키워드인 'promotion'은 화면에 렌더링하지 않고 건너뜁니다.
      if (t === 'promotion') return null;

      return (
        <span
          key={t}
          style={{
            fontSize: 12,
            padding: '2px 2px',
            borderRadius: 999,
            color: '#414de4',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          #{t}
        </span>
            );
          })}
        </div>
      )}
        <div style={{
          fontSize:'25px', 
          fontWeight: 'bold', 
          margin: post.tag && post.tag.length>0 ? '2px 0 5px 8px': '20px 0 5px 8px',
          color:'#222',
          }}>{post.title}
          </div>
      </div>
      <div style={{display : 'flex', gap: 8, alignItems:'center'}}>
        <PostShareButton
          postId={post.id}
          postTitle={post.title}
        />
      {profile?.id === post.user_id && (
        <button
          onClick={deletePost}
          style={{
            border:'none',
            background: 'transparent',
            fontSize: '32px',
            color: '#999',
            cursor: 'pointer',
            marginLeft: '8px',
            marginRight: '18px'
          }}
          title="게시글 삭제"
          >x</button>
      )}
      </div>
    </div>
    <div>
      <p style={{ fontSize: '15px', color: '#888', margin: '0 0 10px 7px' }}>
        작성자: <span style={{ fontWeight: 'bold', color: '#555' }}>{post.username}</span> | {new Date(post.created_at).toLocaleString()}
      </p>

      {/* 이미지가 있을 경우만 보임 (이미지와 이미지 댓글)*/}
      {post.image_urls && post.image_urls.length > 0 && (
        <div style={{border: '1px solid #cccccc', borderRadius: '0px 0px 8px 8px' ,}}>
          <div style={{ width: '100%', margin: '0px 0px 0px 0px' }}>
            <Carousel showArrows={true} showStatus={false} showIndicators={false} infiniteLoop={true} dynamicHeight={true} showThumbs={false}
              onChange={(idx) => setimage_idx(idx)}>
              {post.image_urls.map((url, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img src={url} alt={`post-${post.id}-img-${idx}`} style={{ maxHeight: 'auto', objectFit: 'contain', width: '100%' }} />
                </div>
              ))}
            </Carousel>
          </div>

          {/* 이미지 댓글 섹션 */}
          <div style={{padding:'1px'}}>
            <div style={{ marginTop: '0px', paddingTop: '0px', paddingBottom: '4px'}}>
              <div style={{
                paddingTop: '0px',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => setIsOpen(prev => !prev)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: '#414de4',
                    fontSize: 16, fontWeight: 'bold', padding: '0px',
                  }}
                >
                  {isOpen ? '접기' : '펼치기'}
                  <span
                    style={{
                      padding: '8px', display: 'inline-block', transition: 'transform 0.3s ease',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', lineHeight: 1,
                    }}
                  >
                    ▼
                  </span>
                </button>
              </div>

              {/* 댓글 목록 (펼쳤을 때만 보임) */}
              {isOpen && (
                <>
                  <span style={{ display: 'block', marginLeft: '10px', fontSize: '16px', paddingBottom: '10px', color: '#555' }}>이미지 댓글 ({visibleImageComments.length || 0})</span>
                  {visibleImageComments.length === 0 ? (
                    <p style={{ fontSize: '14px', color: '#999', marginBottom: '10px', marginLeft: '10px' }}>해당 이미지에 아직 댓글이 없습니다.</p>
                  ) : (
                    visibleImageComments.map((ImageComments) => (
                      <div key={ImageComments.id} style={{ padding: '5px 10px' }}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', marginBottom: '5px',
                        }}>
                          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 5px 0' }}>
                            <span style={{ fontWeight: 'bold', color: '#333' }}>{ImageComments.username}</span> | {new Date(ImageComments.created_at).toLocaleString()}
                          </p>
                          {profile?.id === ImageComments.user_id && (
                            <button
                              onClick={() => deleteimageComment(ImageComments.id)}
                              style={{
                                border: 'none', background: 'transparent', fontSize: '20px',
                                color: '#999', cursor: 'pointer', marginLeft: '10px',
                              }}
                              title="댓글 삭제"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        <p style={{ fontSize: '14px', color: '#444', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{ImageComments.content}</p>
                        <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #eee' }} />
                      </div>
                    ))
                  )}

                  {/* 댓글 입력 폼 */}
                  <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: '8px', margin: '5px 3px 15px 5px' }}>
                    <input
                      type="text"
                      maxLength={200}
                      placeholder={profile ? "댓글을 입력하세요..." : "로그인 후 댓글을 작성할 수 있습니다."}
                      value={newCommentContent}
                      onChange={(e) => setNewCommentContent(e.target.value)}
                      disabled={!profile}
                      style={{ flexGrow: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: 14, background: profile ? '#fff' : '#f0f0f0' }}
                    />
                    <button
                      type="submit"
                      disabled={!profile}
                      style={{ marginRight: '3px', padding: '10px 15px', borderRadius: '8px', border: 'none', background: profile ? '#414de4' : '#ccc', color: 'white', fontSize: '10px', fontWeight: 'bold', cursor: profile ? 'pointer' : 'not-allowed' }}
                    >
                      <SendHorizontal size={20} />
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <p style={{ paddingLeft:'8px', paddingBottom:'20px', paddingTop: '20px', fontSize: '20px', color: '#444', lineHeight: '1.6', whiteSpace: 'pre-wrap',  marginTop: '20px' }}>
        {post.content}
      </p>
      <div style={{padding: '8px'}}>
      <CommentSection 
        postId={post.id}
        comments={comments}
        profile={profile}
      />
      </div>
    </div>
  </div>
);
}