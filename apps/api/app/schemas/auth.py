from pydantic import Field

from app.schemas.common import CamelModel


class RegisterRequest(CamelModel):
    """注册请求。email 唯一,password 最短 6 位,nickname 可空(空则后端用 email 前缀兜底)。"""

    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=6, max_length=128)
    nickname: str = Field(default="", max_length=40)


class LoginRequest(CamelModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class AuthUser(CamelModel):
    """对外暴露的用户信息(绝不含 password_hash)。"""

    id: str
    email: str
    nickname: str


class AuthResponse(CamelModel):
    """注册/登录成功响应:JWT + 用户信息。"""

    token: str
    user: AuthUser
