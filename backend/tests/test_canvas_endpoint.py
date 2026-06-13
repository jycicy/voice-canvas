"""画布状态 API 端点测试"""

import pytest


class TestCanvasStateEndpoint:
    """画布状态 CRUD 测试"""

    @pytest.mark.asyncio
    async def test_save_and_get(self, client):
        """保存后可获取"""
        state = {"objects": [{"type": "circle", "radius": 50}]}
        # 保存
        put_resp = await client.put(
            "/api/canvas/state/test-session",
            json={"canvas_json": state},
        )
        assert put_resp.status_code == 200
        assert put_resp.json()["session_id"] == "test-session"

        # 获取
        get_resp = await client.get("/api/canvas/state/test-session")
        assert get_resp.status_code == 200
        assert get_resp.json()["canvas_json"] == state

    @pytest.mark.asyncio
    async def test_get_nonexistent(self, client):
        """获取不存在的 session 返回 404"""
        resp = await client.get("/api/canvas/state/nope")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete(self, client):
        """删除存在的 session"""
        await client.put(
            "/api/canvas/state/to-delete",
            json={"canvas_json": {}},
        )
        resp = await client.delete("/api/canvas/state/to-delete")
        assert resp.status_code == 200

        # 确认已删除
        get_resp = await client.get("/api/canvas/state/to-delete")
        assert get_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent(self, client):
        """删除不存在的 session 返回 404"""
        resp = await client.delete("/api/canvas/state/nope")
        assert resp.status_code == 404
