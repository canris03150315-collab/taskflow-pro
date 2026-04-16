#!/bin/bash
# ============================================================
# 總部重置後重新註冊 3 家子公司
# 用法：
#   1. 先到 central.wuk-on.com 建立新的 BOSS 帳號
#   2. 執行: bash central-re-register.sh <新的BOSS用戶名> <新的BOSS密碼>
# ============================================================

USERNAME=${1:-canris}
PASSWORD=${2:-kico123123}

echo "========================================="
echo "重新註冊子公司到總部"
echo "========================================="

# 登入總部取得 token
echo ""
echo "[1/4] 登入 central.wuk-on.com..."
TOKEN=$(curl -s -X POST https://central.wuk-on.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" --insecure | \
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log(j.token||'FAIL')}catch(e){console.log('FAIL')}})")

if [ "$TOKEN" = "FAIL" ] || [ -z "$TOKEN" ]; then
  echo "登入失敗！請確認帳密正確，且已經完成初始化設定"
  exit 1
fi
echo "登入成功"

# 註冊 3 家子公司
echo ""
echo "[2/4] 註冊 Alpha (886 公司)..."
curl -s -X POST https://central.wuk-on.com/api/hub/subsidiaries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Alpha","base_url":"https://alpha.wuk-on.com","service_token":"alpha-svc-token-2026-wukon"}' --insecure

echo ""
echo "[3/4] 註冊 Bravo (86 公司)..."
curl -s -X POST https://central.wuk-on.com/api/hub/subsidiaries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Bravo","base_url":"https://bravo.wuk-on.com","service_token":"bravo-svc-token-2026-wukon"}' --insecure

echo ""
echo "[4/4] 註冊 Charlie (63 公司)..."
curl -s -X POST https://central.wuk-on.com/api/hub/subsidiaries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Charlie","base_url":"https://charlie.wuk-on.com","service_token":"charlie-svc-token-2026-wukon"}' --insecure

# 驗證
echo ""
echo ""
echo "========================================="
echo "驗證結果"
echo "========================================="
curl -s https://central.wuk-on.com/api/hub/subsidiaries \
  -H "Authorization: Bearer $TOKEN" --insecure | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  try{
    const j=JSON.parse(d);
    const list=j.subsidiaries||j;
    if(Array.isArray(list)){
      console.log('已註冊 '+list.length+' 家子公司:');
      list.forEach(s=>console.log('  - '+s.name+' -> '+s.base_url));
    } else {
      console.log(JSON.stringify(j));
    }
  }catch(e){console.log('parse error: '+d.substring(0,200))}
})"

echo ""
echo "重新註冊完成！總部已重新連接所有子公司"
