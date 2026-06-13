/**
 * 建议指令列表组件
 *
 * 低置信度时展示候选指令，支持点击选择。
 */

import type { DrawCommand } from '../lib/canvasExecutor';

interface Alternative {
  label: string;
  command: DrawCommand;
}

interface SuggestionListProps {
  alternatives: Alternative[];
  onSelect: (command: DrawCommand) => void;
  visible: boolean;
}

export function SuggestionList({ alternatives, onSelect, visible }: SuggestionListProps) {
  if (!visible || alternatives.length === 0) return null;

  return (
    <div className="suggestion-list">
      <p className="suggestion-title">您是否想说：</p>
      <div className="suggestion-items">
        {alternatives.map((alt, i) => (
          <button
            key={i}
            className="suggestion-btn"
            onClick={() => onSelect(alt.command)}
          >
            {alt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
