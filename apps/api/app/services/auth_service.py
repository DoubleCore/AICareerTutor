"""账号业务逻辑(Group B)—— 注册 / 登录校验 / 取用户。路由层调用,不在此处理 HTTP。

落 SQLite User 表(see db/models.py)。密码哈希走 core/security(bcrypt)。
登录失败不区分「无此用户」与「密码错」(防账号枚举)——authenticate 统一返回 None。
"""

from datetime import datetime, timezone

from sqlmodel import Session, select

from app.core import security
from app.db.database import engine
from app.db.models import User


class EmailAlreadyRegisteredError(Exception):
    """注册邮箱已存在 —— 路由映射为 409。"""


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def register(email: str, password: str, nickname: str = "") -> User:
    """注册:校验邮箱唯一 → 哈希密码 → 落库,返回 User。邮箱重复抛 EmailAlreadyRegisteredError。"""
    norm = _normalize_email(email)
    with Session(engine) as session:
        exists = session.exec(select(User).where(User.email == norm)).first()
        if exists is not None:
            raise EmailAlreadyRegisteredError(norm)
        user = User(
            email=norm,
            password_hash=security.hash_password(password),
            nickname=nickname.strip() or norm.split("@")[0],  # 昵称空则用邮箱前缀兜底
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user


def authenticate(email: str, password: str) -> User | None:
    """登录校验:邮箱+密码正确返回 User,否则 None(不区分无用户/密码错,防枚举)。"""
    norm = _normalize_email(email)
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == norm)).first()
    if user is None:
        return None
    if not security.verify_password(password, user.password_hash):
        return None
    return user


def get_user(user_id: str) -> User | None:
    """按 id 取用户;不存在返回 None。"""
    with Session(engine) as session:
        return session.get(User, user_id)


def touch_updated_at(user_id: str) -> None:
    """更新 updated_at(预留:改昵称/密码时调用,本轮未用到)。"""
    with Session(engine) as session:
        user = session.get(User, user_id)
        if user is not None:
            user.updated_at = datetime.now(timezone.utc)
            session.add(user)
            session.commit()
