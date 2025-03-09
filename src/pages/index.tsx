import React from "react";
import dynamic from 'next/dynamic';

// サーバーサイドレンダリングを無効化したTODOアプリコンポーネント
const TodoAppWithNoSSR = dynamic(
  () => import('../components/TodoAppComponent'),
  { ssr: false }
);

const IndexPage: React.FC = () => {
  return <TodoAppWithNoSSR />;
};

export default IndexPage; 