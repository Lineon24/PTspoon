'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AuthListener() {
  useEffect(() => {
    const getUserAndProfile = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();


      if (userError && userError.message !== 'Auth session missing!') {
        console.error('유저 정보 가져오기 실패:', userError.message);
      return;
      }

      if (!user) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('프로필 조회 실패:', profileError.message);
        return;
      }

      if (!profile) {
        const metadata = user.user_metadata || {};
        const nickname =
          metadata.name ||
          metadata.nickname ||
          user.email?.split('@')[0] ||
          '익명';

        const { error } = await supabase.from('profiles').insert({
          id: user.id,
          nickname,
        });

        if (error) {
          console.error('프로필 등록 실패:', error.message);
        }
      }
    };

    getUserAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') {
          getUserAndProfile();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
