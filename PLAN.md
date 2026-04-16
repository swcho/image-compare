# GitHub Image Compare - Chrome Extension Plan

## 개요

사내 GitHub Enterprise 이슈 페이지에서 첨부 이미지들을 캐로샐로 브라우징하고,
두 이미지를 선택해 나란히 비교하며 유사도 지표를 제공하는 Chrome 확장 프로그램.

---

## 기술 스택

| 영역 | 선택 |
|------|------|
| UI 프레임워크 | React 18 + TypeScript |
| 빌드 도구 | Vite + vite-plugin-web-ext |
| 스타일링 | Tailwind CSS (shadow DOM isolation) |
| 상태 관리 | Zustand (경량, content script 친화적) |
| 이미지 처리 | Canvas API (픽셀 연산) |
| 확장 Manifest | MV3 (Manifest V3) |

---

## 아키텍처

```
chrome-extension/
├── manifest.json
├── src/
│   ├── content/               # Content Script
│   │   ├── index.tsx          # 진입점 - React 앱을 Shadow DOM에 마운트
│   │   ├── ImageDetector.ts   # 페이지 내 이미지 탐지 & MutationObserver
│   │   └── App.tsx            # 루트 컴포넌트 (Overlay 포함)
│   ├── components/
│   │   ├── Carousel/          # 이미지 캐로샐 오버레이
│   │   │   ├── Carousel.tsx
│   │   │   ├── CarouselItem.tsx
│   │   │   └── CarouselNav.tsx
│   │   ├── Comparator/        # 이미지 비교 뷰
│   │   │   ├── Comparator.tsx
│   │   │   ├── ImagePane.tsx
│   │   │   └── MetricsPanel.tsx
│   │   └── ui/                # 공통 UI 컴포넌트
│   ├── hooks/
│   │   ├── useImages.ts       # 이슈 내 이미지 목록 관리
│   │   ├── useKeyboard.ts     # 키보드 네비게이션
│   │   └── useImageMetrics.ts # 유사도 지표 계산
│   ├── store/
│   │   └── imageStore.ts      # Zustand 전역 상태
│   ├── utils/
│   │   ├── imageMetrics.ts    # 유사도 알고리즘 구현
│   │   └── githubDetector.ts  # GitHub Enterprise URL/DOM 패턴 감지
│   └── background/
│       └── service-worker.ts  # 최소화된 백그라운드 워커
├── public/
│   └── icons/
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 핵심 기능 상세

### 1. 이미지 탐지 (ImageDetector)

- GitHub Enterprise 이슈/PR 페이지 감지: URL 패턴 `/issues/\d+`, `/pull/\d+`
- 탐지 대상 셀렉터:
  - `.comment-body img`
  - `.markdown-body img`
  - `[data-testid="image-attachment"]`
- `MutationObserver`로 동적 로드된 이미지(Ajax 코멘트) 실시간 감지
- `src` 기준 중복 제거, 순서 유지

### 2. 이미지 클릭 이벤트 가로채기

- Content Script에서 감지된 이미지에 클릭 핸들러 부착
- 클릭 시 해당 이미지를 초기 선택 상태로 캐로샐 오버레이 오픈
- GitHub 기본 클릭 동작(새 탭 열기) 차단

### 3. 캐로샐 오버레이 (Carousel)

```
┌─────────────────────────────────────────────────────────┐
│  [×]                   이미지 뷰어          [비교 모드] │
├─────────────────────────────────────────────────────────┤
│  ← [thumb] [thumb] [thumb★] [thumb] [thumb] →           │
│              (현재 선택: 별★ 표시)                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    [메인 이미지]                         │
│                                                         │
│              3 / 7    filename.png                      │
└─────────────────────────────────────────────────────────┘
```

- 상단 썸네일 스트립 + 좌우 화살표 버튼
- `←` `→` 키보드 네비게이션
- `Esc` 키로 닫기
- 썸네일 클릭으로 바로 이동
- 비교 모드: 썸네일에 체크박스 표시, 2개 선택 시 비교 뷰로 전환

### 4. 이미지 비교 뷰 (Comparator)

```
┌─────────────────────────────────────────────────────────┐
│  [←캐로샐로]              이미지 비교                    │
├──────────────────────┬──────────────────────────────────┤
│                      │                                  │
│     이미지 A          │         이미지 B                 │
│                      │                                  │
│   filename_a.png     │      filename_b.png              │
├──────────────────────┴──────────────────────────────────┤
│  유사도 지표                                             │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │  SSIM    │   MSE    │  pHash   │ 히스토그램│          │
│  │  0.923   │  1,204   │  92.1%   │  0.874   │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
│  [ 차이 오버레이 보기 ]  [ 히트맵 보기 ]                  │
└─────────────────────────────────────────────────────────┘
```

- 좌우 분할 뷰 (CSS Grid)
- 두 이미지 크기 정규화 (Canvas API로 리샘플링)
- 차이 오버레이: 픽셀 차이를 히트맵으로 시각화

### 5. 이미지 유사도 지표 (imageMetrics.ts)

| 지표 | 설명 | 범위 | 구현 방법 |
|------|------|------|-----------|
| **SSIM** | 구조적 유사도 (인간 시각 모델) | 0~1 (1=동일) | Canvas 픽셀 연산 |
| **MSE** | 평균 제곱 오차 | 0~∞ (0=동일) | Canvas 픽셀 연산 |
| **PSNR** | 신호 대 잡음비 | dB (높을수록 유사) | MSE 기반 계산 |
| **pHash** | 지각적 해시 유사도 | 0~100% | DCT 기반 64-bit 해시 |
| **히스토그램 상관** | 색상 분포 유사도 | -1~1 (1=유사) | RGB 히스토그램 비교 |

> **구현 전략**: 모든 연산은 `OffscreenCanvas` + Web Worker로 메인 스레드 블로킹 없이 처리

---

## 주요 기술 이슈 & 해결 전략

### CORS (이미지 픽셀 접근)

GitHub Enterprise 이미지는 `<img>` 태그로 표시되지만 Canvas로 픽셀을 읽으면
cross-origin 제한에 걸릴 수 있음.

**해결**: Content Script는 확장의 권한으로 실행되므로 `fetch()`로 이미지를 직접 가져와
`createObjectURL()`로 로컬 Blob URL 생성 → Canvas에 그리기

```typescript
// manifest.json 에 host_permissions 추가
"host_permissions": ["https://your-github-enterprise.com/*"]
```

### Shadow DOM 격리

GitHub 페이지 CSS와 충돌 방지:
- `document.body`에 `<div id="gh-image-compare-root">` 삽입
- 해당 엘리먼트에 `attachShadow({ mode: 'open' })`
- React 앱을 Shadow DOM 내부에 마운트
- Tailwind CSS를 Shadow DOM 내부에 `<style>` 태그로 주입

### GitHub Enterprise 도메인 설정

사내 GitHub Enterprise 도메인은 회사마다 다르므로:
- 확장 팝업에서 도메인 설정 UI 제공
- `chrome.storage.sync`에 저장
- Content Script 활성화 여부를 런타임에 판단

---

## 구현 단계 (마일스톤)

### Phase 1 - 기반 구조 (1~2일)
- [ ] Vite + React + TypeScript + Tailwind 프로젝트 세팅
- [ ] MV3 manifest.json 작성
- [ ] Content Script Shadow DOM 마운트 골격
- [ ] GitHub Enterprise 이미지 탐지 (MutationObserver)

### Phase 2 - 캐로샐 (2~3일)
- [ ] Zustand 스토어 설계 (이미지 목록, 현재 인덱스, 선택 상태)
- [ ] 캐로샐 오버레이 UI 구현
- [ ] 키보드 네비게이션 (←/→/Esc)
- [ ] 이미지 클릭 이벤트 가로채기

### Phase 3 - 이미지 비교 (2~3일)
- [ ] 비교 모드 UI (썸네일 다중 선택)
- [ ] 좌우 분할 비교 뷰
- [ ] OffscreenCanvas Web Worker 설정
- [ ] 차이 오버레이 / 히트맵

### Phase 4 - 유사도 지표 (2~3일)
- [ ] MSE / PSNR 구현
- [ ] SSIM 구현
- [ ] pHash (DCT 기반) 구현
- [ ] 히스토그램 상관 구현
- [ ] MetricsPanel UI

### Phase 5 - 마무리 (1~2일)
- [ ] 도메인 설정 팝업
- [ ] 아이콘 / 패키징
- [ ] 엣지 케이스 처리 (SVG, GIF, 매우 큰 이미지)
- [ ] README / 설치 가이드

---

## 파일 구조 (최종)

```
image-compare/
├── PLAN.md
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── public/
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
└── src/
    ├── manifest.json          # Vite가 public으로 복사
    ├── content/
    │   ├── index.tsx
    │   ├── App.tsx
    │   └── ImageDetector.ts
    ├── popup/
    │   ├── index.html
    │   ├── index.tsx
    │   └── Popup.tsx
    ├── background/
    │   └── service-worker.ts
    ├── components/
    │   ├── Carousel/
    │   ├── Comparator/
    │   └── ui/
    ├── hooks/
    ├── store/
    │   └── imageStore.ts
    ├── utils/
    │   ├── imageMetrics.ts
    │   ├── imageWorker.ts     # Web Worker
    │   └── githubDetector.ts
    └── types/
        └── index.ts
```

---

## 추후 확장 가능 기능

- **슬라이더 비교 뷰**: 마우스 드래그로 두 이미지 경계선 이동
- **다운로드**: 비교 결과를 PNG로 저장
- **히스토리**: 세션 내 비교 이력 사이드패널
- **AI 유사도**: 확장 팝업에서 API 키 설정 후 임베딩 기반 시맨틱 유사도 제공
