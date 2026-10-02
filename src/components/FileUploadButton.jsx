import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2 } from "lucide-react";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const ALLOWED_EXT = ".pdf,.jpg,.jpeg,.png";
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export function FileUploadButton({ onUploaded, onBusyChange = () => {}, label = "Choose File", variant = "outline", size = "sm", className = "" }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only PDF, JPG, or PNG files are allowed.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("File must be 10 MB or smaller.");
      e.target.value = "";
      return;
    }
    setBusy(true); onBusyChange(true); onUploaded(null);
    setProgress(20);
    setFileName(file.name);
    try {
      setProgress(60);
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      setProgress(100);
      onUploaded({ file_uri, file_name: file.name, mime_type: file.type, size: file.size });
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
      setFileName("");
    } finally {
      setBusy(false); onBusyChange(false);
      setTimeout(() => setProgress(0), 1200);
      e.target.value = "";
    }
  };

  return (
    <div className={className}>
      <input ref={inputRef} type="file" accept={ALLOWED_EXT} onChange={handle} className="hidden" />
      <div className="flex items-center gap-2">
        <Button type="button" variant={variant} size={size} onClick={() => inputRef.current?.click()} disabled={busy}>
          <Upload className="h-4 w-4" />
          {busy ? "Uploading..." : label}
        </Button>
        {fileName && !busy && (
          <span className="flex items-center gap-1 text-xs text-slate-600 truncate max-w-[220px]">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            {fileName}
          </span>
        )}
      </div>
      {busy && progress > 0 && (
        <div className="mt-1.5 h-1.5 w-full max-w-xs rounded-full bg-slate-100">
          <div className="h-1.5 rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default FileUploadButton;