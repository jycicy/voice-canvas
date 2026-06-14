/**
 * 落地页 — Voice Canvas 首页
 *
 * 支持语音导航：说出任意指令直接进入绘图页
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  const startVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = () => {
      // 检测到语音 → 直接跳转绘图页
      recognition.stop();
      navigate('/canvas');
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.error('[LandingPage] 语音错误:', e.error);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [navigate]);

  // 组件卸载时停止监听
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

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

        {/* 语音启动按钮 */}
        <button
          className={`landing__mic-btn ${listening ? 'landing__mic-btn--active' : ''}`}
          onClick={startVoice}
        >
          {listening ? (
            <>
              <div className="landing__mic-waves">
                <span /><span /><span />
              </div>
              正在聆听...
            </>
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              点击开始语音
            </>
          )}
        </button>

        {!supported && (
          <p className="landing__warn">当前浏览器不支持语音识别，请使用 Chrome</p>
        )}

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
