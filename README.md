# <img width="64" height="64" alt="Image" src="https://github.com/user-attachments/assets/21e03b94-3f37-4815-9375-3ba463f16acd" /> 피티스푼 (PTspoon)
> **평택대학교 학생들을 위한 맛집 추천 및 로컬 커뮤니티 서비스**

**피티스푼**은 학교 주변의 숨은 맛집을 찾고, 학우들과 실시간으로 소통할 수 있는 웹 플랫폼입니다.  
사용자 취향 기반의 식당 추천부터 지도 탐색, 실시간 채팅, 그리고 AI 챗봇 '피투'까지 다양한 기능을 제공합니다.

<br/>

### **배포 주소:** [https://restaurant-find-one.vercel.app](https://restaurant-find-one.vercel.app)

<br/>

## 🛠️ Tech Stack
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)

<br/>

## 🗄️ Database Design (ERD)

| Supabase 데이터베이스 설계 |
| :---: |
| [![피티스푼 Supabase 데이터베이스 ERD](docs/images/ptspoon-supabase-erd.png)](docs/images/ptspoon-supabase-erd.png) |
| 식당·메뉴·리뷰, 사용자 프로필, 게시글·댓글, 채팅방·메시지의 테이블 구조와 외래 키 관계입니다.<br/>이미지를 클릭하면 원본 크기로 확인할 수 있습니다. |

<br/>

## 👥 Developers (개발팀)

<table width="100%">
  <thead>
    <tr>
      <th width="33%" align="center">👑 PM & Full Stack</th>
      <th width="34%" align="center">🎨 Main Developer</th>
      <th width="33%" align="center">🧪 QA & Branding & Developer</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">
        <a href="https://github.com/Lineon24">
          <img src="https://github.com/Lineon24.png" width="100px;" alt="이준희"/>
        </a>
      </td>
      <td align="center">
        <a href="https://github.com/seo342">
          <img src="https://github.com/seo342.png" width="100px;" alt="서승진"/>
        </a>
      </td>
      <td align="center">
        <a href="https://github.com/Urban31722">
          <img src="https://github.com/Urban31722.png" width="100px;" alt="김윤정"/>
        </a>
      </td>
    </tr>
    <tr>
      <td align="center">
        <b>이준희</b><br/>
        <span style="font-size: 12px;">팀장 / 시스템 아키텍처</span><br/><br/>
        <span style="font-size: 13px; text-align: left;">
          🏗️ <b>System Architecture</b><br/>
          Next.js 전역 레이아웃 및 구조 설계<br/>
          DB 설계 (ERD) & 인증 (OAuth)<br/>
          상단바, 네비게이션바 컴포넌트 제작<br/>
          <br/>
          🤖 <b>AI & FULL Stack</b><br/>
          OpenAI 기반 맛집 추천 챗봇<br/>
          Upstash Redis 기반 AI 요청 횟수 제한 및 TTL 차단 로직 구현<br/>
          실시간 채팅 기능<br/>
          모든 게시글 관련 페이지<br/>
          로그인/회원가입 페이지<br/>
          웹 크롤링 및 식당 데이터 추가<br/>
          <br/>
          🛡️ <b>Management</b><br/>
          알파 테스트 및 버그 수정<br/>
          모바일 최적화<br/>
        </span>
      </td>
      <td align="center">
        <b>서승진</b><br/>
        <span style="font-size: 12px;">메인 개발자</span><br/><br/>
        <span style="font-size: 13px; text-align: left;">
          🧩 <b>Core Logic</b><br/>
          복합 필터링 알고리즘 (AND/OR)<br/>
          Cross-Page 상태 관리<br/>
          <br/>
          🗺️ <b>Map Service</b><br/>
          Geolocation & 마커 클러스터링<br/>
          지도 인터랙션 & 바텀시트<br/>
          <br/>
          🎨 <b>Design System</b><br/>
          UI 컴포넌트 라이브러리 구축<br/>
          리뷰 작성 프로세스 UX
        </span>
      </td>
      <td align="center">
        <b>김윤정</b><br/>
        <span style="font-size: 12px;">프론트엔드 / QA 담당</span><br/><br/>
        <span style="font-size: 13px; text-align: left;">
          💬 <b>Chat System UI</b><br/>
          채팅방 목록/생성 페이지 구현<br/>
          카카오톡 스타일 메시지 UI<br/>
          <br/>
          ✨ <b>Branding</b><br/>
          자체 캐릭터(피투) 및 로고 디자인<br/>
          <br/>
          🐞 <b>QA & Testing</b><br/>
          베타 테스터 모집 및 운영<br/>
          사용자 피드백 수집 및 개선<br/>
        </span>
      </td>
    </tr>
    <tr>
      <td align="center">
        <a href="https://github.com/Lineon24">
          <img src="https://img.shields.io/badge/GitHub-Profile-black?logo=github"/>
        </a>
      </td>
      <td align="center">
        <a href="https://github.com/seo342">
          <img src="https://img.shields.io/badge/GitHub-Profile-black?logo=github"/>
        </a>
      </td>
      <td align="center">
        <a href="https://github.com/Urban31722">
          <img src="https://img.shields.io/badge/GitHub-Profile-black?logo=github"/>
        </a>
      </td>
    </tr>
  </tbody>
</table>

</br>

## 🏆 Awards
* **TEAM UP! 대회 최우수상 수상**
* **정보통신학과 공모전 우수상 수상**
<br/>

## 🚀 Key Features

### 1️⃣ 로그인/회원가입 기능
| 로그인/회원가입 페이지(카카오톡 로그인 가능) | 
| :---: | 
| ![로그인/로그아웃 페이지](https://github.com/user-attachments/assets/d1e1780d-2820-4d97-aa1a-1d8e05815524) | 
| 사용자가 원하는 방식으로 로그인/회원가입이 가능합니다. | 

<br/>

### 2️⃣ 메인 & 식당 카테고리 필터와 리뷰 기능
| 메인 페이지 (카테고리 선택) | 
| :---: | 
| ![메인페이지](https://github.com/user-attachments/assets/55833254-8bf7-47c3-b6fb-751510ec1e73) | 
| 사용자의 취향(한식, 중식 등)과<br/>특징(매콤한 맛 등)에 따라 메뉴를 추천합니다.<br/>OR 필터는 맛의 특징이 1개라도 포함이 되어있으면, <br/>AND 필터는 맛의 특징이 모두 포함이 된 식당들만 표시됩니다. | 

|  식당 페이지 (리뷰 기능) | 
| :---: | 
| ![식당 페이지](https://github.com/user-attachments/assets/04e3fcdd-6e66-4552-a1a0-de1576ce15af) | 
| 전체 식당 목록에서 원하는 식당을 클릭하여 정보 확인과 리뷰작성이 가능합니다. | 

<br/>

### 3️⃣ 지도 기능
| 지도 페이지(실시간 위치, 필터링 기능) | 
| :---: | 
| ![지도 페이지](https://github.com/Lineon24/restaurant_finder/blob/main/image/%EC%A7%80%EB%8F%84%EA%B8%B0%EB%8A%A5.gif) | 
| 실시간 나의 위치로 주변 식당 정보와 필터링 기능을 사용할 수 있습니다.<br/>왼쪽 아래의 버튼으로 평택대와 내 위치로 이동 가능합니다. | 


<br/>

### 4️⃣ 소통 (게시글)
| 전체 게시글(실시간) | 
| :---: |
| ![게시글 페이지](https://github.com/Lineon24/restaurant_finder/blob/main/image/%EA%B2%8C%EC%8B%9C%ED%8C%90%20%EA%B8%B0%EB%8A%A5.gif) | 
| 게시글 페이지에서 게시글을 작성하거나 실시간으로 업로드되는 글을 볼 수 있습니다. | 

| 게시글 상세 | 
| :---: |
| ![게시글 상세 페이지](https://github.com/user-attachments/assets/0dc8d826-b2f0-47b6-ac67-4b61ceaf86f6) | 
| 게시글을 더블 클릭 시 댓글과 이미지 마다 댓글을 달 수 있습니다. | 

<br/>

### 5️⃣ 소통 (채팅)
| 채팅방 목록 및 생성 | 
| :---: |
| ![채팅방 생성 페이지](https://github.com/user-attachments/assets/a5838817-0947-4fb6-9da6-82b859214afe) | 
| 채팅방 페이지에서는 채팅방을 생성하거나 들어갈 수 있습니다. | 

| 채팅방 페이지 | 
| :---: |
| ![채팅방 페이지](https://github.com/user-attachments/assets/105a6f96-ef9f-48b3-b80a-8f978324b43e) | 
| 채팅방으로 실시간으로 대화하며 정보를 공유할 수 있습니다. | 

<br/>

### 6️⃣ 소통 (공유)
| 태그 기능 | 
| :---: |
| ![태그 기능](https://github.com/Lineon24/restaurant_finder/blob/main/%ED%83%9C%EA%B7%B8%20%EA%B8%B0%EB%8A%A5.gif) | 
| 게시글에 태그를 넣어 다른 사람들에게 필요한 정보를 주거나 얻을 수 있습니다. | 

| 게시글 공유 | 
| :---: |
| ![게시글 공유](https://github.com/Lineon24/restaurant_finder/blob/main/%EA%B2%8C%EC%8B%9C%EA%B8%80%20%EA%B3%B5%EC%9C%A0%20%EA%B8%B0%EB%8A%A5.gif)| 
| 채팅방으로 게시글을 공유하여 정보를 보내거나 받을 수 있습니다. | 

| 식당 공유 | 
| :---: |
| ![식당 공유](https://github.com/Lineon24/restaurant_finder/blob/main/%EC%8B%9D%EB%8B%B9%20%EA%B3%B5%EC%9C%A0%20%EA%B8%B0%EB%8A%A5.gif) | 
| 괜찮은 식당의 정보를 채팅방에 전송을 할 수 있습니다. | 

| 사장님의 공유 | 
| :---: |
| ![사장님의 공유](https://github.com/Lineon24/restaurant_finder/blob/main/image/%EC%82%AC%EC%9E%A5%EB%8B%98%20%ED%83%9C%EA%B7%B8%20%EA%B8%B0%EB%8A%A5.gif) | 
| 가게의 사장님이 자신의 식당 태그를 누르고 작성을 하면 자동으로 식당 공지사항으로 올라갑니다. | 
<br/>

### 7️⃣ 소통 (AI 피투)
| AI 피투 채팅방 |
| :---: | 
| ![AI페이지](https://github.com/Lineon24/restaurant_finder/blob/main/image/AI%20%EC%B1%97%EB%B4%87%20%EA%B8%B0%EB%8A%A5.gif) | 
| 무엇을 먹을지 고민될 땐<br/>AI 챗봇 '피투'에게 물어보세요! | 

<br/>

### 8️⃣ 내 정보
| 내 정보 |
| :---: | 
| ![마페이지](https://github.com/user-attachments/assets/cee53767-4ac7-4889-9aa3-7a3b87dc389f) | 
| 마이 페이지에서 내가 작성한 모든 글들을 확인 가능합니다. | 

<br/>

### 9️⃣ 데이터 수집 및 태그 자동화

식당 데이터 수집과 태그 작업을 자동화하는 과정을 소개합니다. 아래 GIF는 실제 실행 과정을 보여주는 시연 영상입니다.

| 데이터 수집 자동화 |
| :---: |
| ![식당 데이터 수집 자동화 시연](docs/images/data-collection-automation.gif) |
| 식당 데이터를 자동으로 수집하는 과정을 보여줍니다. |

| 태그 자동화 |
| :---: |
| ![태그 자동화 시연](docs/images/tag-automation.gif) |
| 태그 작업을 자동으로 처리하는 과정을 보여줍니다. |
