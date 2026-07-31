#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PreToolUse hook：攔下對「受保護檔」的 Edit / Write。
Claude Code 會在 Edit/Write 執行「之前」呼叫本腳本，並把工具資訊用 JSON 從 stdin 傳進來。
命中受保護清單 → 輸出 permissionDecision: "deny"（Claude Code 會擋下這次工具呼叫）。
其它情況 → 不表態（exit 0，走正常流程）。
"""
import sys
import json

# 受保護清單：這些檔一律不准被 Edit / Write 動到（用「檔名包含」比對，不分路徑）
PROTECTED = [
    "wrangler.toml",       # Cloudflare Worker 部署設定
    "deploy.yml",          # GitHub Pages 部署 workflow
    ".env",                # 機密設定（目前專案未使用，預留防呆）
]

def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        # 讀不到輸入就不表態，避免誤擋
        sys.exit(0)

    tool_input = data.get("tool_input", {}) or {}
    # Edit / Write 的目標檔在 file_path；保險起見也看 path
    target = tool_input.get("file_path", "") or tool_input.get("path", "")

    for name in PROTECTED:
        if name.lower() in str(target).lower():
            print(json.dumps({
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"受保護檔，禁止修改：{target}（由 PreToolUse hook 攔下）"
                }
            }, ensure_ascii=False))
            sys.exit(0)

    # 不是受保護檔 → 不表態，正常流程
    sys.exit(0)

if __name__ == "__main__":
    main()
