// 게시글 작성 페이지 입니다.
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import HeaderWithBack from '@/components/HeaderWithBack';
import PostList from '@/components/PostList'; // PostList 컴포넌트 임포트 경로 수정

// Post, Comment, Profile 인터페이스는 동일하게 유지
interface Post {
  id: string;
  created_at: string;
  user_id: string;
  username: string;
  title: string;
  content: string;
  image_urls: string[];
}

interface Profile {
  id: string;
  nickname: string;
}

export default function WritePostPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. 사용자 로그인 및 프로필 불러오기 (동일)
  useEffect(() => {
    async function getUserProfile() {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        console.error('사용자 정보 가져오기 오류:', userError);
        router.replace('/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', userData.user.id)
        .single();

      if (profileError) {
        console.error('프로필 가져오기 오류:', profileError);
        setProfile({ id: userData.user.id, nickname: '알 수 없음' });
      } else if (profileData) {
        setProfile({ id: userData.user.id, ...profileData });
      } else {
        console.log('해당 ID의 프로필을 찾을 수 없습니다:', userData.user.id);
        setProfile({ id: userData.user.id, nickname: '게스트' });
      }
      setLoading(false);
    }
    getUserProfile();
  }, [router]); // 주소가 바뀔 경우 함수 재실행

  // 내 게시글 목록 불러오기 및 실시간 구독
  useEffect(() => {
    if (!profile) return;

    const fetchMyPosts = async () => { // 게시글 불러오는 함수
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', profile.id) // 내 게시글만 필터링
        .order('created_at', { ascending: false }); // 만든 시간 순 내림차 순으로
      
      if (error) {
        console.error('내 게시글 불러오기 오류:', error);
      } else {
        setPosts(data || []);
      }
    };
    fetchMyPosts(); 

    const channel = supabase
      .channel('my_posts_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          const newPost = payload.new as Post;
          if (newPost.user_id === profile.id) {
            setPosts((prev) => [newPost, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]); // profile이 변경될 때마다 이 useEffect가 다시 실행

  // 게시글 작성 
  const handleSubmitPost = async (e: React.FormEvent) => { e.preventDefault(); // 폼 제출 시 발동 이벤트
    if (!profile || !newPostTitle.trim() || !newPostContent.trim()) {
      alert('제목과 내용을 모두 입력해주세요.'); // 로그인 상태 포스트 제목, 포스트 내용이 모두 들어가 있어야 제출 가능
    return;
    }
    setIsSubmitting(true);
  //  이미지 업로드
    let uploadedUrls: string[] = []; // 여러 장 받기에 배열로
      if (selectedFiles.length > 0) {
        try { // 예외처리 부분
        const uploadPromises = selectedFiles.map((file, index) => 
          handleImageUpload(file, profile, index) // profile과 index를 추가로 전달
        );
        uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean) as string[]; // 모든 프로미스 객체(모든 파일 업로드 되어야 정상 작동) 이미지 공용 주소 받아옴
        } catch (err) {
          console.error('이미지 업로드 중 오류:', err);
          alert('이미지 업로드에 실패했습니다.');
          return;
        }
      }

  // 게시글 업로드
  const { data, error } = await supabase.from('posts').insert([ // 데이터 베이스에 게시글 정보 업로드
    {
      user_id: profile.id,
      username: profile.nickname,
      title: newPostTitle,
      content: newPostContent,
      image_urls: uploadedUrls,
    },
  ])
  .select();

  if (error) {
    console.error('게시글 작성 오류:', error);
    alert('게시글 작성에 실패했습니다.');
    setIsSubmitting(false);
  } else {
    // 업로드 후 초기화
    setNewPostTitle('');
    setNewPostContent('');
    setSelectedFiles([]);
    setPreviewUrls([]);
    router.push(`/posts/${data[0].id}`); // 해당 게시글 페이지로 이동
  }
};

 
 const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => { // 사용자 파일 선택 또는 취소 시 발동
  if (!e.target.files) return; // 파일이 없다면 취소

  const files = Array.from(e.target.files); // 여기서 진짜 배열 객체로 변환해줌

  // 파일은 5장 까지 업로드 가능
  if (selectedFiles.length + files.length > 5) {
    alert('이미지는 최대 5장까지 업로드할 수 있습니다.');
    return;
  }
  // 미리보기 저장
  const localPreviews = files.map(file => URL.createObjectURL(file));
  setPreviewUrls(prev => [...prev, ...localPreviews]);

  // 실제 파일 저장 (기존 파일에 추가)
  setSelectedFiles(prev => [...prev, ...files]);
 };


const handleImageUpload = async (file: File, profile: Profile | null, index: number): Promise<string | null> => {
  // 0. 사용자 프로필이 없는 경우 업로드 중단 (안정성)
  if (!profile?.id) {
    console.error('사용자 정보가 없어 업로드를 중단합니다.');
    return null;
  }

  const filePath = `user-${profile?.id}/${Date.now()}-${index}`; // 파일 저장 경로

  const { data, error } = await supabase.storage
    .from('board-image') // 저장할 스토리지 이름
    .upload(filePath, file); // 업로드

  if (error) {
    console.error('이미지 업로드 오류:', error.message);
    alert('이미지 업로드에 실패했습니다.');
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('board-image') // 다시 스토리지의  해당 버킷에서
    .getPublicUrl(filePath); // 공개 URL을 가져옴 이걸 데이터베이스에 저장할 것 

  return urlData.publicUrl ?? null; // 없다면 빈값으로 설정
};
  const removeImage = (index: number) => { // 업로드 전 이미지 삭제 부분
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };
  const handlePostDeleted = (deletedPostId: string) => { // 실시간 삭제 적용 부분
    setPosts(currentPosts =>
    currentPosts.filter(post => post.id !== deletedPostId)
  );
};

  if (loading) return <div style={{ margin: 60, textAlign: 'center', fontSize: 18, color: '#555' }}>로딩중...</div>;
  if (!profile) return <div style={{ margin: 60, textAlign: 'center', fontSize: 18, color: '#ff0000' }}>프로필 정보 없음. 로그인 상태를 확인해주세요.</div>;

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '20px', fontFamily: 'Pretendard, sans-serif', minHeight: '100vh', background: '#f8f9fa' }}>
      <HeaderWithBack title="게시글 작성" backTF= {true} /> {/* 상단 고정 헤더 */}
      <div style={{ height: '20px' }}></div>

      {/* 게시글 작성 폼 */}
      <form onSubmit={handleSubmitPost} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px', padding: '20px', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
        <input
          type="text" placeholder="게시글 제목을 입력하세요" value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)}
          maxLength={40} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: 16 }}
        />
        <div style={{ textAlign: 'right', fontSize: 12, color: '#888' }}>{newPostTitle.length}/40 </div>
        <textarea 
          placeholder="게시글 내용을 입력하세요" value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} rows={7}
          maxLength={3000} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', resize: 'vertical', fontSize: 15, lineHeight: 1.5 }}
        ></textarea>
        <div style={{ textAlign: 'right', fontSize: 12, color: '#888' }}>{newPostContent.length}/3000 </div>
            <div>
              {/* 파일 업로드 버튼 */}
                <input
                id="fileInput"
                type="file"
                multiple
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFilesChange}
              />
              <div
                  style={{
                  width: 100,
                  height: 100,
                  borderRadius: 10,
                  borderWidth: '2px',
                  borderStyle: 'dashed',
                  borderColor: selectedFiles.length >= 5 ? '#f7888aff' : '#ccc',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: '#fafafa',
                  fontSize: 32,
                  color: '#aaa',
                  transition: 'border-color 0.3s',
                  }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = selectedFiles.length >= 5 ? '#ff0206ff' : '#007bff';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = selectedFiles.length >= 5 ? '#f7888aff' : '#ccc';
                    }}
                      onClick={() => {
                        document.getElementById('fileInput')?.click();
                    }}
                  >
                  +
                  <div style={{justifyContent: 'center', fontSize: 15,}}>
                  {selectedFiles.length}/5
                  </div>
                </div>

            {/* 이미지 미리보기 */}
              <div
                style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                marginTop: 10,
                }}
              >
                {previewUrls.map((url, idx) => (
                  <div key={idx} style={{
                    position: 'relative',
                    width: 100,
                    height: 100,
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: '1px solid #ddd',
                    }}
                  >
                    <img src={url} alt={`preview-${idx}`} style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      }}
                      onClick={() => window.open(url, '_blank')}
                    />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  fontSize: 14,
                  cursor: 'pointer',
                  lineHeight: '20px',
                  textAlign: 'center',
                }}
              >
                ×
              </button>
            </div>
          ))}
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} style={{ padding: '12px 25px', borderRadius: '8px', border: 'none', background: isSubmitting ? '#a0a0a0' : '#414de4', color: 'white', fontSize: 16, fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: 'background 0.2s ease-in-out' }}
        >
          {isSubmitting ? '작성 중...' : '게시글 작성'}
        </button>
      </form>

      {/* 내 게시글 목록 (PostList 컴포넌트를 사용하여 표시) */}
      <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '20px', color: '#333' }}>나의 게시글 목록</h2>
        {/* PostList 컴포넌트에 게시글과 프로필 정보를 전달 */}
        <PostList posts={posts} profile={profile} onPostDeleted={handlePostDeleted} />
                {/* 로딩도 끝났고, 글도 0개일 때만 '게시글 없음' 표시 */}
        {!loading && posts.length === 0 && (
           <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
             아직 작성된 게시글이 없습니다. 
           </div>
        )}
      </div>
    </div>
  );
}