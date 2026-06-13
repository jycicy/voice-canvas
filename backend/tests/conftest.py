"""测试公共配置"""

import pytest
from httpx import AsyncClient, ASGITransport

from main import app


@pytest.fixture
def client():
    """创建测试客户端"""
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")
