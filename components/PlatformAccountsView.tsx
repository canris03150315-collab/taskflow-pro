import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Trash2, Download, BarChart3, ChevronDown, ChevronUp, RefreshCw, Eye } from 'lucide-react';
import { api } from '../services/api';

interface PlatformAccountsViewProps {
  currentUser: any;
}

type TabType = 'upload' | 'dashboard' | 'history';

interface PlatformSummary {
  platform_name: string;
  days_with_data: number;
  total_deposit: number;
  total_withdrawal: number;
  total_profit: number;
  total_loan: number;
  total_lottery_salary: number;
  total_lottery_rebate: number;
  total_live_ag: number;
  total_chess_card: number;
  total_external_rebate: number;
  total_live_private_rebate: number;
  total_lottery_div_recv: number;
  total_lottery_div_dist: number;
  total_ext_div_recv: number;
  total_ext_div_dist: number;
  total_private_rebate: number;
  latest_balance: number;
  initial_balance: number;
}

const PlatformAccountsView: React.FC<PlatformAccountsViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [yearMonth, setYearMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [preview, setPreview] = useState<any>(null);
  const [pendingData, setPendingData] = useState<string>('');

  // Dashboard state
  const [dashMonth, setDashMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [summary, setSummary] = useState<PlatformSummary[]>([]);
  const [grandTotal, setGrandTotal] = useState<any>(null);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [platformDetail, setPlatformDetail] = useState<any[]>([]);

  // History state
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [versionMonth, setVersionMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [diffResult, setDiffResult] = useState<any>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [selectedVersionA, setSelectedVersionA] = useState<string>('');
  const [selectedVersionB, setSelectedVersionB] = useState<string>('');

  // Clear messages after 5s
  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(''); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, totalRes] = await Promise.all([
        api.platformAccounts.getSummary(dashMonth),
        api.platformAccounts.getGrandTotal(dashMonth)
      ]);
      setSummary(sumRes.summary || []);
      setGrandTotal(totalRes.total || null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [dashMonth]);

  // Load history
  const loadHistory = useCallback(async () => {
    try {
      const [histRes, verRes] = await Promise.all([
        api.platformAccounts.getUploadHistory(),
        api.platformAccounts.getVersions(versionMonth)
      ]);
      setUploadHistory(histRes.batches || []);
      setVersions(verRes.versions || []);
      setDiffResult(null);
      setSelectedVersionA('');
      setSelectedVersionB('');
    } catch (e: any) {
      setError(e.message);
    }
  }, [versionMonth]);

  useEffect(() => {
    if (activeTab === 'dashboard') loadDashboard();
    if (activeTab === 'history') loadHistory();
  }, [activeTab, loadDashboard, loadHistory]);

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(null);
      setPendingData('');
      setError('');
    }
  };

  // Upload preview
  const handleUploadPreview = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.platformAccounts.uploadPreview(selectedFile, yearMonth);
      setPreview(res.preview);
      setPendingData(res.pendingData);
      setSuccess(`解析成功：偵測到 ${res.preview.platformCount} 個平台，${res.preview.recordCount} 筆紀錄`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Confirm upload
  const handleConfirmUpload = async () => {
    if (!pendingData) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.platformAccounts.uploadConfirm(pendingData, selectedFile?.name || 'unknown.xlsx');
      setSuccess(`匯入成功：${res.platformCount} 個平台，${res.recordCount} 筆紀錄`);
      setPreview(null);
      setPendingData('');
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('excel-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Expand platform detail
  const handleExpandPlatform = async (platformName: string) => {
    if (expandedPlatform === platformName) {
      setExpandedPlatform(null);
      return;
    }
    setExpandedPlatform(platformName);
    try {
      const res = await api.platformAccounts.getRecords({ month: dashMonth, platform: platformName });
      setPlatformDetail(res.records || []);
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Compare versions
  const handleCompare = async () => {
    if (!selectedVersionA || !selectedVersionB) return;
    setDiffLoading(true);
    try {
      const res = await api.platformAccounts.getDiff(selectedVersionA, selectedVersionB);
      setDiffResult(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDiffLoading(false);
    }
  };

  // View specific version in dashboard
  const handleViewVersion = (batchId: string, month: string) => {
    setDashMonth(month);
    setActiveTab('dashboard');
    // Will load with this batch
  };

  // Delete month
  const handleDeleteMonth = async (month: string) => {
    if (!confirm(`確定要刪除 ${month} 的所有帳務資料嗎？此操作不可恢復。`)) return;
    try {
      await api.platformAccounts.deleteMonth(month);
      setSuccess(`已刪除 ${month} 的帳務資料`);
      loadHistory();
      if (dashMonth === month) loadDashboard();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const formatNum = (n: number) => {
    if (!n && n !== 0) return '-';
    return n.toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const numColor = (n: number) => n > 0 ? 'text-green-600' : n < 0 ? 'text-red-600' : 'text-gray-500';

  return (
    <div className="p-4 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-800">平台帳務管理</h1>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b mb-4">
        {[
          { id: 'upload' as TabType, label: 'Excel 上傳', icon: Upload },
          { id: 'dashboard' as TabType, label: '帳務總覽', icon: BarChart3 },
          { id: 'history' as TabType, label: '上傳紀錄', icon: FileSpreadsheet }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          {/* Upload Form */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">上傳平台帳變 Excel</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">選擇月份</label>
                <input
                  type="month"
                  value={yearMonth}
                  onChange={e => setYearMonth(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">選擇檔案</label>
                <input
                  id="excel-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleUploadPreview}
                  disabled={!selectedFile || loading}
                  className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  {loading ? '解析中...' : '預覽解析'}
                </button>
              </div>
            </div>

            <div className="mt-3 text-sm text-gray-500">
              支援格式：.xlsx / .xls（平台帳變表），系統會自動偵測平台區塊。同月份重複上傳會覆蓋舊資料。
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">預覽解析結果</h2>
                <div className="text-sm text-gray-500">
                  檔案：{preview.fileName} | 月份：{preview.yearMonth}
                </div>
              </div>

              {/* Platform summary */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">偵測到 {preview.platformCount} 個平台：</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {preview.platforms.map((p: any) => (
                    <div
                      key={p.name}
                      className={`border rounded-lg p-3 text-sm ${
                        p.status === 'active' ? 'border-green-200 bg-green-50' :
                        p.status === 'suspended' ? 'border-red-200 bg-red-50' :
                        'border-yellow-200 bg-yellow-50'
                      }`}
                    >
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {p.type === 'manager' ? '主管' : p.type === 'merchant' ? '招商' : '分紅'}
                        {p.status !== 'active' && (
                          <span className="ml-1 text-red-500">
                            ({p.status === 'suspended' ? '停運' : '改直營'})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{p.recordCount} 筆紀錄</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample data */}
              {preview.sampleRecords.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">資料預覽（前 3 天）：</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border p-1 text-left">平台</th>
                          <th className="border p-1">日期</th>
                          <th className="border p-1">工資</th>
                          <th className="border p-1">反點</th>
                          <th className="border p-1">真人AG</th>
                          <th className="border p-1">棋牌</th>
                          <th className="border p-1">充值</th>
                          <th className="border p-1">提款</th>
                          <th className="border p-1">營利</th>
                          <th className="border p-1">餘額</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.sampleRecords.map((r: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="border p-1 font-medium">{r.platform_name}</td>
                            <td className="border p-1 text-center">{r.day_of_month}</td>
                            <td className="border p-1 text-right">{formatNum(r.lottery_salary)}</td>
                            <td className="border p-1 text-right">{formatNum(r.lottery_rebate)}</td>
                            <td className="border p-1 text-right">{formatNum(r.live_ag)}</td>
                            <td className="border p-1 text-right">{formatNum(r.chess_card)}</td>
                            <td className="border p-1 text-right">{formatNum(r.deposit)}</td>
                            <td className="border p-1 text-right">{formatNum(r.withdrawal)}</td>
                            <td className={`border p-1 text-right ${numColor(r.profit)}`}>{formatNum(r.profit)}</td>
                            <td className="border p-1 text-right">{formatNum(r.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Confirm button */}
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmUpload}
                  disabled={loading}
                  className="bg-green-600 text-white rounded-lg px-6 py-2 hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  確認匯入（{preview.recordCount} 筆）
                </button>
                <button
                  onClick={() => { setPreview(null); setPendingData(''); }}
                  className="bg-gray-200 text-gray-700 rounded-lg px-6 py-2 hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Month selector */}
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={dashMonth}
              onChange={e => setDashMonth(e.target.value)}
              className="border rounded-lg px-3 py-2"
            />
            <button
              onClick={loadDashboard}
              disabled={loading}
              className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>

          {/* Grand Total Card */}
          {grandTotal && grandTotal.platform_count > 0 && (
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-3">{dashMonth} 月份總覽</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <div className="text-blue-200 text-sm">平台數</div>
                  <div className="text-2xl font-bold">{grandTotal.platform_count}</div>
                </div>
                <div>
                  <div className="text-blue-200 text-sm">總充值</div>
                  <div className="text-2xl font-bold">{formatNum(grandTotal.total_deposit)}</div>
                </div>
                <div>
                  <div className="text-blue-200 text-sm">總提款</div>
                  <div className="text-2xl font-bold">{formatNum(grandTotal.total_withdrawal)}</div>
                </div>
                <div>
                  <div className="text-blue-200 text-sm">總營利</div>
                  <div className="text-2xl font-bold">{formatNum(grandTotal.total_profit)}</div>
                </div>
                <div>
                  <div className="text-blue-200 text-sm">總借款</div>
                  <div className="text-2xl font-bold">{formatNum(grandTotal.total_loan)}</div>
                </div>
              </div>
            </div>
          )}

          {/* No data */}
          {summary.length === 0 && !loading && (
            <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">尚無 {dashMonth} 的帳務資料</p>
              <p className="text-sm mt-1">請至「Excel 上傳」頁面匯入帳變表</p>
            </div>
          )}

          {/* Platform Summary Table */}
          {summary.length > 0 && (
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600">
                      <th className="border-b p-3 text-left">平台</th>
                      <th className="border-b p-3 text-right">天數</th>
                      <th className="border-b p-3 text-right">初始餘額</th>
                      <th className="border-b p-3 text-right">總充值</th>
                      <th className="border-b p-3 text-right">總提款</th>
                      <th className="border-b p-3 text-right">總營利</th>
                      <th className="border-b p-3 text-right">總借款</th>
                      <th className="border-b p-3 text-right">最新餘額</th>
                      <th className="border-b p-3 text-center">詳情</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map(s => (
                      <React.Fragment key={s.platform_name}>
                        <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => handleExpandPlatform(s.platform_name)}>
                          <td className="border-b p-3 font-medium">{s.platform_name}</td>
                          <td className="border-b p-3 text-right">{s.days_with_data}</td>
                          <td className="border-b p-3 text-right">{formatNum(s.initial_balance)}</td>
                          <td className="border-b p-3 text-right text-green-600">{formatNum(s.total_deposit)}</td>
                          <td className="border-b p-3 text-right text-red-600">{formatNum(s.total_withdrawal)}</td>
                          <td className={`border-b p-3 text-right font-medium ${numColor(s.total_profit)}`}>{formatNum(s.total_profit)}</td>
                          <td className="border-b p-3 text-right">{formatNum(s.total_loan)}</td>
                          <td className="border-b p-3 text-right font-medium">{formatNum(s.latest_balance)}</td>
                          <td className="border-b p-3 text-center">
                            {expandedPlatform === s.platform_name ? (
                              <ChevronUp className="w-4 h-4 inline text-blue-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 inline text-gray-400" />
                            )}
                          </td>
                        </tr>
                        {/* Expanded daily detail */}
                        {expandedPlatform === s.platform_name && (
                          <tr>
                            <td colSpan={9} className="bg-gray-50 p-0">
                              <div className="p-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">{s.platform_name} — 每日明細</h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-gray-200">
                                        <th className="border p-1">日期</th>
                                        <th className="border p-1">工資</th>
                                        <th className="border p-1">反點</th>
                                        <th className="border p-1">真人AG</th>
                                        <th className="border p-1">棋牌</th>
                                        <th className="border p-1">外接返點</th>
                                        <th className="border p-1">真人私返</th>
                                        <th className="border p-1">彩票分紅(領)</th>
                                        <th className="border p-1">彩票分紅(發)</th>
                                        <th className="border p-1">外接分紅(領)</th>
                                        <th className="border p-1">外接分紅(發)</th>
                                        <th className="border p-1">私返</th>
                                        <th className="border p-1">充值</th>
                                        <th className="border p-1">提款</th>
                                        <th className="border p-1">借款</th>
                                        <th className="border p-1">營利</th>
                                        <th className="border p-1">餘額</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {platformDetail.map((r: any) => (
                                        <tr key={r.id} className="hover:bg-white">
                                          <td className="border p-1 text-center">{r.day_of_month}</td>
                                          <td className="border p-1 text-right">{formatNum(r.lottery_salary)}</td>
                                          <td className="border p-1 text-right">{formatNum(r.lottery_rebate)}</td>
                                          <td className="border p-1 text-right">{formatNum(r.live_ag)}</td>
                                          <td className="border p-1 text-right">{formatNum(r.chess_card)}</td>
                                          <td className="border p-1 text-right">{formatNum(r.external_rebate)}</td>
                                          <td className="border p-1 text-right">{formatNum(r.live_private_rebate)}</td>
                                          <td className="border p-1 text-right">{formatNum(r.lottery_dividend_received)}</td>
                                          <td className="border p-1 text-right">{formatNum(r.lottery_dividend_distributed)}</td>
                                          <td className="border p-1 text-right">{formatNum(r.external_dividend_received)}</td>
                                          <td className="border p-1 text-right">{formatNum(r.external_dividend_distributed)}</td>
                                          <td className="border p-1 text-right">{formatNum(r.private_rebate)}</td>
                                          <td className="border p-1 text-right text-green-600">{formatNum(r.deposit)}</td>
                                          <td className="border p-1 text-right text-red-600">{formatNum(r.withdrawal)}</td>
                                          <td className="border p-1 text-right">{formatNum(r.loan)}</td>
                                          <td className={`border p-1 text-right font-medium ${numColor(r.profit)}`}>{formatNum(r.profit)}</td>
                                          <td className="border p-1 text-right font-medium">{formatNum(r.balance)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Version History */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">版本紀錄</h2>
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={versionMonth}
                  onChange={e => setVersionMonth(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                />
                <button onClick={loadHistory} className="bg-blue-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-blue-700 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> 刷新
                </button>
              </div>
            </div>

            {versions.length === 0 ? (
              <div className="text-center text-gray-500 py-6">此月份尚無上傳紀錄</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border-b p-3 text-center">版本</th>
                    <th className="border-b p-3 text-left">上傳時間</th>
                    <th className="border-b p-3 text-left">檔案</th>
                    <th className="border-b p-3 text-center">平台</th>
                    <th className="border-b p-3 text-center">紀錄</th>
                    <th className="border-b p-3 text-center">狀態</th>
                    <th className="border-b p-3 text-center">對比A</th>
                    <th className="border-b p-3 text-center">對比B</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v, idx) => (
                    <tr key={v.id} className={`hover:bg-gray-50 ${v.status === 'completed' ? '' : 'opacity-60'}`}>
                      <td className="border-b p-3 text-center font-medium">
                        V{versions.length - idx}
                        {v.status === 'completed' && <span className="ml-1 text-xs text-green-600">(最新)</span>}
                      </td>
                      <td className="border-b p-3">{new Date(v.created_at).toLocaleString('zh-TW')}</td>
                      <td className="border-b p-3 text-sm">{v.file_name}</td>
                      <td className="border-b p-3 text-center">{v.platforms_count}</td>
                      <td className="border-b p-3 text-center">{v.records_count}</td>
                      <td className="border-b p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${v.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {v.status === 'completed' ? '目前版本' : '歷史版本'}
                        </span>
                      </td>
                      <td className="border-b p-3 text-center">
                        <input
                          type="radio"
                          name="diffA"
                          checked={selectedVersionA === v.id}
                          onChange={() => setSelectedVersionA(v.id)}
                        />
                      </td>
                      <td className="border-b p-3 text-center">
                        <input
                          type="radio"
                          name="diffB"
                          checked={selectedVersionB === v.id}
                          onChange={() => setSelectedVersionB(v.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Compare button */}
            {versions.length >= 2 && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleCompare}
                  disabled={!selectedVersionA || !selectedVersionB || selectedVersionA === selectedVersionB || diffLoading}
                  className="bg-orange-600 text-white rounded-lg px-4 py-2 hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 text-sm"
                >
                  {diffLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                  比對差異
                </button>
                {selectedVersionA && selectedVersionB && selectedVersionA === selectedVersionB && (
                  <span className="text-sm text-red-500">請選擇不同的版本進行比對</span>
                )}
              </div>
            )}
          </div>

          {/* Diff Results */}
          {diffResult && (
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-3">版本差異對比</h2>
              <div className="flex gap-4 mb-4 text-sm">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded">版本A: {diffResult.totalA} 筆</span>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded">版本B: {diffResult.totalB} 筆</span>
                <span className={`px-3 py-1 rounded ${diffResult.diffCount > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                  差異: {diffResult.diffCount} 處
                </span>
              </div>

              {diffResult.diffCount === 0 ? (
                <div className="text-center text-green-600 py-6 bg-green-50 rounded-lg">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                  兩個版本完全相同，無差異
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0">
                      <tr className="bg-gray-200">
                        <th className="border p-2 text-left">平台</th>
                        <th className="border p-2 text-center">日期</th>
                        <th className="border p-2 text-center">類型</th>
                        <th className="border p-2 text-left">變更欄位</th>
                        <th className="border p-2 text-right">舊值 (A)</th>
                        <th className="border p-2 text-right">新值 (B)</th>
                        <th className="border p-2 text-right">差額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffResult.diffs.map((d: any, i: number) => (
                        d.changes.map((c: any, j: number) => (
                          <tr key={`${i}-${j}`} className={`${d.type === 'added' ? 'bg-green-50' : d.type === 'removed' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                            {j === 0 && <td className="border p-2 font-medium" rowSpan={d.changes.length}>{d.platform}</td>}
                            {j === 0 && <td className="border p-2 text-center" rowSpan={d.changes.length}>{d.day}</td>}
                            {j === 0 && (
                              <td className="border p-2 text-center" rowSpan={d.changes.length}>
                                <span className={`px-1.5 py-0.5 rounded text-xs ${d.type === 'added' ? 'bg-green-200' : d.type === 'removed' ? 'bg-red-200' : 'bg-yellow-200'}`}>
                                  {d.type === 'added' ? '新增' : d.type === 'removed' ? '刪除' : '修改'}
                                </span>
                              </td>
                            )}
                            <td className="border p-2">{c.field}</td>
                            <td className="border p-2 text-right">{formatNum(c.old)}</td>
                            <td className="border p-2 text-right font-medium">{formatNum(c.new)}</td>
                            <td className={`border p-2 text-right font-medium ${(c.new - c.old) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {(c.new - c.old) > 0 ? '+' : ''}{formatNum(c.new - c.old)}
                            </td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Upload History (all months) */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <h3 className="p-4 font-semibold border-b bg-gray-50">全部上傳紀錄</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border-b p-3 text-left">上傳時間</th>
                  <th className="border-b p-3 text-left">檔案名稱</th>
                  <th className="border-b p-3 text-center">月份</th>
                  <th className="border-b p-3 text-center">平台數</th>
                  <th className="border-b p-3 text-center">紀錄數</th>
                  <th className="border-b p-3 text-center">狀態</th>
                </tr>
              </thead>
              <tbody>
                {uploadHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">尚無上傳紀錄</td>
                  </tr>
                )}
                {uploadHistory.map(batch => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="border-b p-3">{new Date(batch.created_at).toLocaleString('zh-TW')}</td>
                    <td className="border-b p-3">{batch.file_name}</td>
                    <td className="border-b p-3 text-center">{batch.record_month}</td>
                    <td className="border-b p-3 text-center">{batch.platforms_count}</td>
                    <td className="border-b p-3 text-center">{batch.records_count}</td>
                    <td className="border-b p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${batch.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {batch.status === 'completed' ? '目前' : '歷史'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformAccountsView;
