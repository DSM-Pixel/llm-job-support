// 브랜드 로고 마크 — 카메라 뷰파인더(모서리 꺾쇠 4개 + 가운데 점). 디자인 시안과 동일.
// 색은 currentColor 라 부모(.brand-mark/.lg-brand-mark)의 color(보라)를 그대로 따른다.
export default function BrandMark({ className = 'brand-mark' }) {
  return (
    <span className={className} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 8.5V7a3 3 0 0 1 3-3h1.5" />
        <path d="M15.5 4H17a3 3 0 0 1 3 3v1.5" />
        <path d="M20 15.5V17a3 3 0 0 1-3 3h-1.5" />
        <path d="M8.5 20H7a3 3 0 0 1-3-3v-1.5" />
        <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
      </svg>
    </span>
  )
}
