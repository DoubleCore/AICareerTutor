"""逐模块冒烟测试脚本。用法:
    .venv/Scripts/python.exe smoke_test.py [health|explore|interview|profile|all]
强制 UTF-8 输出,避免 Windows GBK 终端编码问题。
"""
import sys
import io
import json

# 强制 stdout 用 UTF-8,规避 Windows 默认 GBK
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, ".")
from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

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
    call("patch", f"/interview/training/task/{task_id}", json={"status": "已完成"})
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
    sys.exit(1 if FAIL else 0)
