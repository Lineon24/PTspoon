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
  }, [router]);

  // 내 게시글 목록 불러오기 및 실시간 구독
  useEffect(() => {
    if (!profile) return;

    const fetchMyPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', profile.id) // 내 게시글만 필터링
        .order('created_at', { ascending: false });
      
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
  const handleSubmitPost = async (e: React.FormEvent) => { e.preventDefault();
    if (!profile || !newPostTitle.trim() || !newPostContent.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
    return;
    }

  // 1. 이미지 업로드
    let uploadedUrls: string[] = [];
      if (selectedFiles.length > 0) {
        try {
        const uploadPromises = selectedFiles.map((file) => handleImageUpload(file));
        uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean) as string[];
        } catch (err) {
          console.error('이미지 업로드 중 오류:', err);
          alert('이미지 업로드에 실패했습니다.');
          return;
        }
      }

  // 2. 게시글 업로드
  const { error } = await supabase.from('posts').insert([
    {
      user_id: profile.id,
      username: profile.nickname,
      title: newPostTitle,
      content: newPostContent,
      image_urls: uploadedUrls,
    },
  ]);

  if (error) {
    console.error('게시글 작성 오류:', error);
    alert('게시글 작성에 실패했습니다.');
  } else {
    // 3. 초기화
    setNewPostTitle('');
    setNewPostContent('');
    setSelectedFiles([]);
    setPreviewUrls([]);
  }
};

 
 const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!e.target.files) return;

  const files = Array.from(e.target.files);

  // 미리보기 저장
  const localPreviews = files.map(file => URL.createObjectURL(file));
  setPreviewUrls(localPreviews);

  // 실제 파일 저장 (업로드는 하지 않음)
  setSelectedFiles(files);
 };


const handleImageUpload = async (file: File): Promise<string | null> => {
  const filePath = `user-${profile?.id}/${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from('board-image')
    .upload(filePath, file);

  if (error) {
    console.error('이미지 업로드 오류:', error.message);
    alert('이미지 업로드에 실패했습니다.');
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('board-image')
    .getPublicUrl(filePath);

  return urlData.publicUrl ?? null;
};
  const removeImage = (index: number) => {
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) return <div style={{ margin: 60, textAlign: 'center', fontSize: 18, color: '#555' }}>로딩중...</div>;
  if (!profile) return <div style={{ margin: 60, textAlign: 'center', fontSize: 18, color: '#ff0000' }}>프로필 정보 없음. 로그인 상태를 확인해주세요.</div>;

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '20px', fontFamily: 'Pretendard, sans-serif', minHeight: '100vh', background: '#f8f9fa' }}>
      <HeaderWithBack title="내 게시글" backTF= {true} /> {/* 상단 고정 헤더 */}
      <div style={{ height: '60px' }}></div>

      {/* 게시글 작성 폼 */}
      <form onSubmit={handleSubmitPost} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px', padding: '20px', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
        <input
          type="text" placeholder="게시글 제목을 입력하세요" value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)}
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: 16 }}
        />
        <textarea
          placeholder="게시글 내용을 입력하세요" value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} rows={7}
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', resize: 'vertical', fontSize: 15, lineHeight: 1.5 }}
        ></textarea>
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
                  border: '2px dashed #ccc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: '#fafafa',
                  fontSize: 32,
                  color: '#aaa',
                  transition: 'border-color 0.3s',
                  }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#007bff';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#ccc';
                    }}
                      onClick={() => {
                        document.getElementById('fileInput')?.click();
                    }}
                  >
                  +
                </div>

            {/* 미리보기 그리드 */}
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

        <button type="submit" style={{ padding: '12px 25px', borderRadius: '8px', border: 'none', background: '#007bff', color: 'white', fontSize: 16, fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s ease-in-out' }}
        >
          게시글 작성
        </button>
      </form>

      {/* 내 게시글 목록 (PostList 컴포넌트를 사용하여 렌더링) */}
      <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '20px', color: '#333' }}>나의 게시글 목록</h2>
        {/* PostList 컴포넌트에 게시글과 프로필 정보를 prop으로 전달 */}
        <PostList posts={posts} profile={profile} />
      </div>
    </div>
  );
}