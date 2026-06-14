/**
 * 落地页 — Voice Canvas 首页
 */

import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* 背景装饰 */}
      <div className="landing__bg">
        <div className="landing__circle landing__circle--1" />
        <div className="landing__circle landing__circle--2" />
        <div className="landing__circle landing__circle--3" />
      </div>

      {/* 主内容 */}
      <main className="landing__content">
        <div className="landing__badge">AI Powered</div>
        <h1 className="landing__title">Voice Canvas</h1>
        <p className="landing__subtitle">
          用语音指挥 AI 绘图，让创意即刻呈现
        </p>
        <p className="landing__desc">
          说出你的想法，AI 自动生成绘图代码并渲染到画布上。
          支持复杂图形、组合指令、实时编辑。
        </p>

        <button
          className="landing__try-btn"
          onClick={() => navigate('/canvas')}
        >
          Try it
        </button>

        <div className="landing__features">
          <div className="landing__feature">
            <div className="landing__feature-icon">🎤</div>
            <span>语音控制</span>
          </div>
          <div className="landing__feature">
            <div className="landing__feature-icon">🎨</div>
            <span>AI 绘图</span>
          </div>
          <div className="landing__feature">
            <div className="landing__feature-icon">🖼️</div>
            <span>导出图片</span>
          </div>
        </div>
      </main>

      <footer className="landing__footer">
        七牛云 XEngineer 暑期实训营
      </footer>
    </div>
  );
}
