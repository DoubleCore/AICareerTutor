"""逐模块冒烟测试脚本。用法:
    .venv/Scripts/python.exe smoke_test.py [health|explore|interview|profile|all]
强制 UTF-8 输出,避免 Windows GBK 终端编码问题。
"""
import sys
import io
import json
import os

# 强制 stdout 用 UTF-8,规避 Windows 默认 GBK
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, ".")

# P1-08:隔离 —— 在导入 app 之前把 DB 指向临时库,绝不污染开发库 career_tutor.db。
# setdefault:允许外部已显式指定 DATABASE_URL 时尊重之。
_SMOKE_DB = "_smoke_test.db"
os.environ.setdefault("DATABASE_URL", f"sqlite:///./{_SMOKE_DB}")

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.db.database import init_db  # noqa: E402

# TestClient(client.get/post) 默认不进入 lifespan,故显式建表(否则面试链路查无表报错)。
init_db()

client = TestClient(app)

PASS = 0
FAIL = 0


def call(method, path, expect=200, **kw):
    global PASS, FAIL
    r = getattr(client, method)(path, **kw)
    mark = "[OK]" if r.status_code == expect else "[FAIL]"
    if r.status_code == expect:
        PASS += 1
    else:
        FAIL += 1
    ctype = r.headers.get("content-type", "")
    body = r.json() if ctype.startswith("application/json") else r.text
    print(f"{mark} {method.upper():5} {path:34} -> {r.status_code} (期望 {expect})")
    print("     " + json.dumps(body, ensure_ascii=False)[:400])
    return r


def test_health():
    print("\n===== 模块: HEALTH =====")
    call("get", "/health")


def test_explore():
    print("\n===== 模块: EXPLORE =====")
    profile = {}
    call("post", "/explore/basic-profile", json=profile)
    call("post", "/explore/experience", json=profile)
    call("post", "/explore/followup", json=profile)
    call("post", "/explore/confirm", json=profile)
    call("post", "/explore/generate-result", json=profile)
    call("get", "/explore/current-path")
    # save-path 需要 direction_id,先取一个候选方向
    r = client.post("/explore/generate-result", json=profile)
    try:
        dir_id = r.json()["directions"][0]["id"]
    except Exception:
        dir_id = "mock-direction"
    call("post", "/explore/save-path", json={"direction_id": dir_id})


def test_interview():
    print("\n===== 模块: INTERVIEW =====")
    upload = {"file_name": "demo.txt", "content": "面试记录示例文本"}
    r = call("post", "/interview/upload", json=upload)
    try:
        sid = r.json()["session_id"]
    except Exception:
        sid = "mock-session"
    call("post", "/interview/analyze", params={"session_id": sid})
    call("get", f"/interview/overview/{sid}")
    call("get", f"/interview/analysis/{sid}")
    r = call("get", f"/interview/training/{sid}")
    try:
        task_id = r.json()[0]["id"]
    except Exception:
        task_id = "mock-task"
    call("patch", f"/interview/training/{sid}/task/{task_id}", json={"status": "已完成"})
    call("post", "/interview/reset")


def test_profile():
    print("\n===== 模块: PROFILE =====")
    call("get", "/profile/home")


MODULES = {
    "health": test_health,
    "explore": test_explore,
    "interview": test_interview,
    "profile": test_profile,
}

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    if target == "all":
        for fn in MODULES.values():
            fn()
    elif target in MODULES:
        MODULES[target]()
    else:
        print(f"未知模块: {target}。可选: {list(MODULES) + ['all']}")
        sys.exit(2)
    print(f"\n===== 汇总: PASS={PASS}  FAIL={FAIL} =====")
    # P1-08:清理临时库(连同 -journal/-wal/-shm),不留痕。
    # 先 dispose 释放连接池,否则 Windows 下文件被占用,os.remove 会失败留垃圾。
    from app.db.database import engine  # noqa: E402
    engine.dispose()
    for suffix in ("", "-journal", "-wal", "-shm"):
        path = _SMOKE_DB + suffix
        if os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass
    sys.exit(1 if FAIL else 0)
