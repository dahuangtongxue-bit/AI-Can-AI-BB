import './globals.css';

export const metadata = {
  title: 'AI 奇葩说 · 竞技场',
  description: '六个大模型 3v3 辩论，跑票定胜负的 AI 辩论秀',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
