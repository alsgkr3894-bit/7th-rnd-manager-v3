import "./globals.css";

export const metadata = {
  title: "7번가피자 R&D 관리 플랫폼",
  description: "메뉴 판매량, 제때 상품 관리, 원가 계산, 식자재, 영양성분, 메뉴개발노트, 보고서를 한 곳에서.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
