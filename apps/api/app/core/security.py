"""账号/鉴权底层(Group B)—— 密码哈希 + JWT 编解码,无业务逻辑。

设计要点:
- 密码哈希直接用 bcrypt 库(不经 passlib —— passlib 1.7.4 与 bcrypt 4+/5+ 不兼容,会在 hash 时崩)。
- JWT 用 python-jose;secret/algorithm/过期从 settings 读。
- jwt_secret 缺失时拒绝签发(抛错),绝不使用硬编码默认密钥(见 spec 安全要求)。
- bcrypt 限制密码 ≤72 字节,超出按 bcrypt 惯例截断(对中文密码也安全:截断在 encode 后的字节上)。
"""

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# bcrypt 单次可处理的最大字节数(算法固有限制)。
_BCRYPT_MAX_BYTES = 72


def _require_secret() -> str:
    secret = settings.jwt_secret
    if not secret:
        # 不回退硬编码默认:缺密钥时直接拒绝,避免用可预测密钥签发可伪造的 token。
        raise RuntimeError("未配置 JWT_SECRET,拒绝签发/校验 token;请在 apps/api/.env 配置 JWT_SECRET。")
    return secret


def hash_password(raw: str) -> str:
    """bcrypt 哈希密码,返回可存库的字符串(含盐与 cost)。"""
    pw = raw.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(raw: str, hashed: str) -> bool:
    """校验明文密码与哈希是否匹配。哈希格式非法/不匹配均返回 False(不抛)。"""
    try:
        pw = raw.encode("utf-8")[:_BCRYPT_MAX_BYTES]
        return bcrypt.checkpw(pw, hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: str) -> str:
    """签发 JWT,sub=user_id,带过期(jwt_expire_minutes)。缺 secret 抛 RuntimeError。"""
    from datetime import datetime, timedelta, timezone

    secret = _require_secret()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    """解码 JWT 返回 user_id(sub);无效/过期/缺 secret 返回 None(不抛,交路由转 401)。"""
    secret = settings.jwt_secret
    if not secret:
        return None
    try:
        payload = jwt.decode(token, secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
    sub = payload.get("sub")
    return sub if isinstance(sub, str) and sub else None
