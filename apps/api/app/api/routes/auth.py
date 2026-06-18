"""账号/鉴权路由(Group B)。register / login / me。

错误约定:
- 邮箱已注册 → 409(conflict)。
- 登录失败 → 401,统一文案不区分「无用户/密码错」(防枚举)。
- 无效/过期 token → 401。
路由不含业务逻辑(转 auth_service);密码哈希/JWT 在 core/security。
"""

from fastapi import APIRouter, Depends, Header

from app.core import security
from app.core.errors import AppError
from app.db.models import DEV_USER_ID
from app.schemas.auth import AuthResponse, AuthUser, LoginRequest, RegisterRequest
from app.services import auth_service

router = APIRouter()


def _to_auth_user(user) -> AuthUser:
    return AuthUser(id=user.id, email=user.email, nickname=user.nickname)


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest) -> AuthResponse:
    try:
        user = auth_service.register(payload.email, payload.password, payload.nickname)
    except auth_service.EmailAlreadyRegisteredError:
        raise AppError(status_code=409, code="email_exists", message="该邮箱已注册,请直接登录。")
    return AuthResponse(token=security.create_access_token(user.id), user=_to_auth_user(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest) -> AuthResponse:
    user = auth_service.authenticate(payload.email, payload.password)
    if user is None:
        # 不区分「无此用户」与「密码错」,防账号枚举。
        raise AppError(status_code=401, code="invalid_credentials", message="邮箱或密码不正确。")
    return AuthResponse(token=security.create_access_token(user.id), user=_to_auth_user(user))


def _extract_bearer(authorization: str | None) -> str | None:
    """从 Authorization 头取 Bearer token;格式不对返回 None。"""
    if not authorization:
        return None
    parts = authorization.split(None, 1)
    if len(parts) == 2 and parts[0].lower() == "bearer" and parts[1].strip():
        return parts[1].strip()
    return None


def get_current_user_id(authorization: str | None = Header(default=None)) -> str:
    """必需鉴权依赖:解 Bearer token 得 user_id;无效/过期/缺失抛 401。/auth/me 等用它。"""
    token = _extract_bearer(authorization)
    user_id = security.decode_access_token(token) if token else None
    if not user_id:
        raise AppError(status_code=401, code="unauthorized", message="登录已失效,请重新登录。")
    return user_id


def get_optional_user_id(authorization: str | None = Header(default=None)) -> str:
    """可选鉴权依赖:带有效 token 用真实 user_id,否则回退 DEV_USER_ID。

    供 explore/interview 路由渐进接入(B7)——未登录的旧调用仍可用,不一刀切打断现有 mock 链路。
    """
    token = _extract_bearer(authorization)
    user_id = security.decode_access_token(token) if token else None
    return user_id or DEV_USER_ID


@router.get("/me", response_model=AuthUser)
def me(user_id: str = Depends(get_current_user_id)) -> AuthUser:
    user = auth_service.get_user(user_id)
    if user is None:
        # token 合法但用户已不存在(被删等)。
        raise AppError(status_code=401, code="unauthorized", message="登录已失效,请重新登录。")
    return _to_auth_user(user)
