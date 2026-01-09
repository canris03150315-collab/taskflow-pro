import React, { useState, useEffect } from 'react';
import { User, Announcement } from '../types';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string; priority: 'NORMAL' | 'IMPORTANT'; images?: string[] }) => void;
  initialData?: Announcement;
}

export const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'IMPORTANT'>('NORMAL');
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setContent(initialData.content);
      setPriority(initialData.priority);
      
      // 處理 images：可能是陣列或 JSON 字串
      let parsedImages: string[] = [];
      if (initialData.images) {
        if (Array.isArray(initialData.images)) {
          parsedImages = initialData.images;
        } else if (typeof initialData.images === 'string') {
          try {
            parsedImages = JSON.parse(initialData.images);
          } catch (e) {
            parsedImages = [];
          }
        }
      }
      setImages(parsedImages);
    } else {
      setTitle('');
      setContent('');
      setPriority('NORMAL');
      setImages([]);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // 限制最多 5 張圖片
    if (images.length + files.length > 5) {
      alert('最多只能上傳 5 張圖片');
      return;
    }
    
    setIsUploading(true);
    
    const newImages: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // 檢查檔案大小（限制 2MB）
      if (file.size > 2 * 1024 * 1024) {
        alert(`圖片 ${file.name} 超過 2MB，請壓縮後再上傳`);
        continue;
      }
      
      // 檢查是否為圖片
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} 不是圖片檔案`);
        continue;
      }
      
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        newImages.push(base64);
      } catch (error) {
        console.error('圖片讀取失敗:', error);
        alert(`圖片 ${file.name} 讀取失敗`);
      }
    }
    
    setImages([...images, ...newImages]);
    setIsUploading(false);
    
    // 清除 input
    e.target.value = '';
  };
  
  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, content, priority, images });
    onClose();
    setTitle('');
    setContent('');
    setPriority('NORMAL');
    setImages([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 tracking-wide flex items-center gap-2">
            <span>📢</span> {initialData ? '編輯公告' : '發布新公告'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">公告標題</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
              placeholder="例如：系統維護通知"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">重要性</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  checked={priority === 'NORMAL'} 
                  onChange={() => setPriority('NORMAL')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-bold">一般公告</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  checked={priority === 'IMPORTANT'} 
                  onChange={() => setPriority('IMPORTANT')}
                  className="text-red-600 focus:ring-red-500"
                />
                <span className="text-red-600 font-bold flex items-center gap-1">
                   <span>🔥</span> 重大通知
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">公告內容</label>
            <textarea 
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 resize-none"
              placeholder="請輸入詳細公告事項..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-500 mb-2">📷 附加圖片（選填，最多 5 張）</label>
            
            {/* 圖片預覽 */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {images.map((img, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={img} 
                      alt={`預覽 ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* 上傳按鈕 */}
            {images.length < 5 && (
              <div>
                <input
                  type="file"
                  id="announcement-image-upload"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                <label
                  htmlFor="announcement-image-upload"
                  className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition ${
                    isUploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span className="text-sm text-slate-600 font-bold">上傳中...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                      </svg>
                      <span className="text-sm text-slate-600 font-bold">點擊上傳圖片</span>
                      <span className="text-xs text-slate-400">（最多 {5 - images.length} 張，每張限 2MB）</span>
                    </>
                  )}
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-lg font-bold transition">取消</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition">
              確認發布
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};