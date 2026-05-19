/**
 * DocumentsPage — 문서 관리
 * 기능: 문서 업로드, 카테고리별 목록, 다운로드, 삭제
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload, FileText, FileSpreadsheet, FileImage, File,
  Download, Trash2, Search, Plus, X, FolderOpen,
  RefreshCw, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface DocFile {
  id: number;
  title: string;
  category: string;
  description: string;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_by: number;
  uploader_name: string;
  created_at: number;
}

const CATEGORIES = ["전체", "인사", "계약서", "정책", "교육", "재무", "일반"];

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function getFileIcon(fileType: string) {
  if (fileType.includes("image")) return <FileImage size={18} className="text-blue-500" />;
  if (fileType.includes("spreadsheet") || fileType.includes("excel") || fileType.includes("csv"))
    return <FileSpreadsheet size={18} className="text-green-600" />;
  if (fileType.includes("pdf")) return <FileText size={18} className="text-red-500" />;
  if (fileType.includes("word") || fileType.includes("document")) return <FileText size={18} className="text-blue-600" />;
  return <File size={18} className="text-gray-500" />;
}

// ─── 업로드 모달 ───────────────────────────────────────────────────────────────

function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("일반");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (f.size > 20 * 1024 * 1024) { toast.error("파일 크기는 20MB 이하여야 합니다"); return; }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("제목을 입력해주세요"); return; }
    if (!file) { toast.error("파일을 선택해주세요"); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const file_data = reader.result as string;
        const res = await fetch("/api/documents", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            category,
            description,
            file_name: file!.name,
            file_size: file!.size,
            file_type: file!.type || "application/octet-stream",
            file_data,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("문서가 업로드되었습니다");
        onSuccess();
        onClose();
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("업로드 실패");
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">문서 업로드</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* 파일 드롭존 */}
          <div
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${dragOver ? "border-teal-400 bg-teal-50" : "border-border hover:border-teal-300"}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                {getFileIcon(file.type)}
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
                <button className="ml-2 p-1 rounded-lg hover:bg-muted" onClick={e => { e.stopPropagation(); setFile(null); }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div>
                <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">파일을 드래그하거나 클릭하여 선택</p>
                <p className="text-xs text-muted-foreground mt-1">최대 20MB · PDF, Word, Excel, 이미지 등</p>
              </div>
            )}
          </div>
          {/* 제목 */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">제목 <span className="text-red-500">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="문서 제목 입력"
              className="w-full h-9 px-3 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-400" />
          </div>
          {/* 카테고리 */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">카테고리</label>
            <div className="relative">
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-400 appearance-none">
                {CATEGORIES.filter(c => c !== "전체").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          {/* 설명 */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">설명 (선택)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="문서에 대한 간단한 설명"
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-400 resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={onClose} disabled={uploading}>취소</Button>
          <Button size="sm" className="rounded-xl text-white gap-1.5" style={{ background: "var(--teal)" }}
            onClick={handleSubmit} disabled={uploading || !title.trim() || !file}>
            {uploading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
            업로드
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("전체");
  const [showUpload, setShowUpload] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const cat = activeCategory !== "전체" ? `?category=${encodeURIComponent(activeCategory)}` : "";
      const res = await fetch(`/api/documents${cat}`, { credentials: "include" });
      const data = await res.json();
      setDocs(data.documents || []);
    } catch { toast.error("문서 목록 로드 실패"); }
    finally { setLoading(false); }
  }, [activeCategory]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleDownload = async (doc: DocFile) => {
    setDownloading(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}/download`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = doc.file_name; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("다운로드 실패"); }
    finally { setDownloading(null); }
  };

  const handleDelete = async (doc: DocFile) => {
    if (!confirm(`"${doc.title}" 문서를 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
      toast.success("삭제되었습니다");
      loadDocs();
    } catch { toast.error("삭제 실패"); }
  };

  const filtered = docs.filter(d =>
    d.title.toLowerCase().includes(query.toLowerCase()) ||
    d.file_name.toLowerCase().includes(query.toLowerCase()) ||
    d.uploader_name?.toLowerCase().includes(query.toLowerCase())
  );

  const isAdmin = (user as { role?: string } | null)?.role === "admin";

  return (
    <div className="flex-1 flex flex-col overflow-hidden page-enter">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">문서 관리</h1>
            <p className="text-xs text-muted-foreground mt-0.5">사내 문서를 업로드하고 관리합니다</p>
          </div>
          <Button size="sm" className="rounded-xl text-white gap-1.5" style={{ background: "var(--teal)" }}
            onClick={() => setShowUpload(true)}>
            <Plus size={14} /> 문서 업로드
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* 검색 + 카테고리 필터 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="제목, 파일명, 업로더 검색..."
                className="w-full h-9 pl-9 pr-3 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-400" />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map(cat => (
                <button key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors ${activeCategory === cat ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  style={activeCategory === cat ? { background: "var(--teal)" } : {}}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 문서 목록 */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen size={40} className="text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                {query ? "검색 결과가 없습니다" : "등록된 문서가 없습니다"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {query ? "다른 검색어를 입력해보세요" : "문서 업로드 버튼을 눌러 첫 문서를 등록하세요"}
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30 grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
                <span className="col-span-5">문서명</span>
                <span className="col-span-2">카테고리</span>
                <span className="col-span-2">크기</span>
                <span className="col-span-2">업로드일</span>
                <span className="col-span-1 text-right">작업</span>
              </div>
              <div className="divide-y divide-border">
                {filtered.map(doc => (
                  <div key={doc.id} className="px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/20 transition-colors">
                    <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                      {getFileIcon(doc.file_type)}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
                        {doc.description && <p className="text-xs text-muted-foreground/70 truncate">{doc.description}</p>}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground">{doc.category}</span>
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground">{formatBytes(doc.file_size)}</div>
                    <div className="col-span-2 text-xs text-muted-foreground">
                      <div>{formatDate(doc.created_at)}</div>
                      <div className="text-muted-foreground/60">{doc.uploader_name}</div>
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleDownload(doc)}
                        disabled={downloading === doc.id}
                        className="p-1.5 rounded-lg hover:bg-teal-50 text-muted-foreground hover:text-teal-600 transition-colors"
                        title="다운로드">
                        {downloading === doc.id
                          ? <RefreshCw size={13} className="animate-spin" />
                          : <Download size={13} />}
                      </button>
                      {(isAdmin || doc.uploaded_by === (user as { id?: number } | null)?.id) && (
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                          title="삭제">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
                총 {filtered.length}개 문서
                {query && ` (검색: "${query}")`}
              </div>
            </div>
          )}
        </div>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={loadDocs} />}
    </div>
  );
}
