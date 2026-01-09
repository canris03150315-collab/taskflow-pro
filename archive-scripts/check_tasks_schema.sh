#!/bin/bash
# 檢查 tasks 表的 schema
docker exec taskflow-pro sqlite3 /app/data/taskflow.db "SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks';"
