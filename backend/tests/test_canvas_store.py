"""画布状态存储测试"""

import pytest

from services.canvas_store import CanvasStore


class TestCanvasStore:
    """内存画布状态存储测试"""

    def setup_method(self):
        self.store = CanvasStore()

    def test_save_and_get(self):
        """保存后可获取"""
        state = {"objects": [{"type": "circle"}]}
        self.store.save("session-1", {"canvas_json": state})
        result = self.store.get("session-1")
        assert result["canvas_json"] == state

    def test_get_nonexistent(self):
        """获取不存在的 session 返回 None"""
        assert self.store.get("no-such-session") is None

    def test_save_overwrites(self):
        """重复保存覆盖旧数据"""
        self.store.save("s1", {"canvas_json": {"v": 1}})
        self.store.save("s1", {"canvas_json": {"v": 2}})
        result = self.store.get("s1")
        assert result["canvas_json"]["v"] == 2

    def test_delete(self):
        """删除存在的 session"""
        self.store.save("s1", {"canvas_json": {}})
        assert self.store.delete("s1") is True
        assert self.store.get("s1") is None

    def test_delete_nonexistent(self):
        """删除不存在的 session 返回 False"""
        assert self.store.delete("nope") is False

    def test_list_sessions(self):
        """列出所有 session"""
        self.store.save("a", {"canvas_json": {}})
        self.store.save("b", {"canvas_json": {}})
        sessions = self.store.list_sessions()
        assert "a" in sessions
        assert "b" in sessions

    def test_updated_at_set(self):
        """保存时自动设置 updated_at"""
        self.store.save("s1", {"canvas_json": {}})
        result = self.store.get("s1")
        assert "updated_at" in result
