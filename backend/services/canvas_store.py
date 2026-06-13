"""画布状态存储服务

使用内存 dict 存储画布状态，按 session_id 隔离。
"""

from datetime import datetime


class CanvasStore:
    """内存画布状态存储"""

    def __init__(self):
        self._store: dict[str, dict] = {}

    def get(self, session_id: str) -> dict | None:
        """获取画布状态"""
        return self._store.get(session_id)

    def save(self, session_id: str, state: dict) -> dict:
        """保存画布状态"""
        self._store[session_id] = {
            "canvas_json": state.get("canvas_json", {}),
            "updated_at": datetime.now().isoformat(),
        }
        return self._store[session_id]

    def delete(self, session_id: str) -> bool:
        """删除画布状态"""
        if session_id in self._store:
            del self._store[session_id]
            return True
        return False

    def list_sessions(self) -> list[str]:
        """列出所有 session_id"""
        return list(self._store.keys())


# 全局单例
canvas_store = CanvasStore()
