# 備份還原 SOP（taskflow_data volume）

本文件提供「從 .tar.gz 備份檔還原 TaskFlow Pro production 資料」的逐步指令。
備份格式：整個 `data/` 目錄（含 `taskflow.db`、`uploads/`、`.db-key`、`certificates/` 等），
gzip 壓縮 tar，產生於 `backend/dist/routes/backup.js` 的 `createBackupArchive()`。

**本地測試結果**：backup → 抽乾 → 還原 → 19 個檔案 byte-identical（commit 233c60f）。

---

## Server registry

| host    | IP                | 用途       |
| ------- | ----------------- | ---------- |
| alpha   | 139.59.126.243    | subsidiary |
| bravo   | 139.59.119.156    | subsidiary |
| charlie | 178.128.27.97     | subsidiary |
| central | 178.128.90.19     | central    |

Docker volume: `taskflow_data` → mounted at `/app/backend/data` in container.

---

## 場景 A：從 production 內部備份還原（最常見）

前提：之前透過「下載備份」按鈕、或 `/api/backup/create` 已產生過 `.tar.gz`，
它們存在 server 的 docker volume 內 `/app/backend/data/backups/`。

### Step 1：把 server 上的最新備份取到 `/root/`

```bash
HOST=alpha           # 改為目標 host
IP=139.59.126.243    # 對應 IP

ssh root@$IP "docker run --rm -v taskflow_data:/data alpine sh -c 'ls -lt /data/backups/*.tar.gz | head -5'"
```

挑要還原的檔名（例：`taskflow-backup-2026-06-04T12-34-56-789Z.tar.gz`），複製到 host `/root/`：

```bash
BACKUP=taskflow-backup-2026-06-04T12-34-56-789Z.tar.gz

ssh root@$IP "docker run --rm -v taskflow_data:/data -v /root:/out alpine cp /data/backups/$BACKUP /out/"
```

### Step 2：停 container（釋放 SQLite file handle）

```bash
ssh root@$IP "docker stop taskflow"
```

### Step 3：清空 volume 並還原

⚠️ **執行前再次確認 host + backup 檔名**

```bash
ssh root@$IP "docker run --rm -v taskflow_data:/data -v /root:/in alpine sh -c '
  cd /data && rm -rf .* * 2>/dev/null;
  tar xzf /in/$BACKUP -C /data &&
  ls -la /data
'"
```

### Step 4：重啟 container

```bash
ssh root@$IP "docker start taskflow"
sleep 12
curl -s -o /dev/null -w 'HTTP %{http_code}\n' "https://$HOST.wuk-on.com/" --insecure --max-time 5
```

預期：`HTTP 200` 或 `401`（401 = 認證頁正常顯示）。

---

## 場景 B：從本地 .tar.gz（如 pre-deploy snapshot）還原

如你手上有 server `/root/pre-deploy-YYYYMMDD-HHMM.tar.gz`（即 [部署前快照](#pre-deploy-snapshot)）。

⚠️ 注意：場景 A 的備份內容是 `data/` 的「子項」（taskflow.db、uploads 等位於 tar 根目錄）。
pre-deploy snapshot 是 `tar czf ... -C / data` 產生的 → tar 根目錄是 `data/`。
**解壓方式不同**：

```bash
BACKUP=pre-deploy-20260604-1530.tar.gz

ssh root@$IP "docker stop taskflow"

# pre-deploy snapshot 是 -C / data 產的，內部結構是 data/...
ssh root@$IP "docker run --rm -v taskflow_data:/data -v /root:/in alpine sh -c '
  cd / && rm -rf /data/.* /data/* 2>/dev/null;
  tar xzf /in/$BACKUP -C /
'"

ssh root@$IP "docker start taskflow"
```

---

## Pre-deploy snapshot（部署前必做）

部署前先拍快照（離線備份，不依賴新 code、不依賴 docker volume backup endpoint）：

```bash
IP=139.59.126.243   # alpha
ssh root@$IP "docker run --rm -v taskflow_data:/data -v /root:/backup alpine \
  tar czf /backup/pre-deploy-$(date +%Y%m%d-%H%M).tar.gz -C / data"

# 確認檔案產生
ssh root@$IP "ls -lh /root/pre-deploy-*.tar.gz | tail -3"
```

留意：此檔案在 host `/root/`，**不在 docker volume 內**，container 重建不影響它。
保留至少到部署後 7 天觀察期結束再刪。

---

## 驗證步驟

還原完成後務必登入驗證：

1. `https://<host>.wuk-on.com/` 出現登入頁（HTTP 200/401）
2. BOSS 帳號登入成功
3. 隨機點 3 個員工資料、檢查打卡記錄、上傳檔案是否完整
4. 系統設定 → 系統管理 → 點「下載備份」→ 拿到新的 `.tar.gz`（證明 backup 流程仍可用）

---

## 萬一還原也壞了

`bash deploy/deploy.sh rollback <host>` 可把 image 退回上一版（不會還原資料）。
若資料層也壞，且 pre-deploy snapshot 還在：用 [場景 B](#場景-b從本地-targz如-pre-deploy-snapshot還原) 還原 snapshot，
然後跑 rollback 退 image。
