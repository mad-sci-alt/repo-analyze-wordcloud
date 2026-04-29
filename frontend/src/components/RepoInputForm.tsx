import { useState, useRef, useCallback } from "react";
import type { TopNOption } from "../types";

type SourceMode = "remote" | "local" | "upload";

interface Props {
  onSubmit: (
    mode: SourceMode,
    url: string,
    branch: string,
    local_path: string,
    top_n: number,
    custom_stopwords: string[],
    include_history: boolean,
    max_commits: number,
    file?: File,
  ) => void;
  loading: boolean;
}

const TOP_N_OPTIONS: TopNOption[] = [10, 20, 25, 50, 100];

export function RepoInputForm({ onSubmit, loading }: Props) {
  const [mode, setMode] = useState<SourceMode>("remote");
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [localPath, setLocalPath] = useState("");
  const [topN, setTopN] = useState<TopNOption>(20);
  const [customStopwords, setCustomStopwords] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [maxCommits, setMaxCommits] = useState(50);

  // Upload state
  const [dragOver, setDragOver] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Folder picker (File System Access API — Chrome/Edge only)
  const pickFolder = useCallback(async () => {
    try {
      // @ts-ignore — File System Access API
      const dirHandle = await window.showDirectoryPicker();
      // Pack the directory into a zip client-side
      const zip = await packDirectoryToZip(dirHandle);
      setUploadFile(zip);
    } catch {
      // User cancelled or browser unsupported
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const words = customStopwords.split(/[,\n]+/).map((w) => w.trim()).filter(Boolean);
    if (mode === "remote") {
      if (!url.trim()) return;
      onSubmit("remote", url.trim(), branch.trim() || "main", "", topN, words, includeHistory, maxCommits);
    } else if (mode === "local") {
      if (!localPath.trim()) return;
      onSubmit("local", "", "", localPath.trim(), topN, words, false, 0);
    } else {
      if (!uploadFile) return;
      onSubmit("upload", "", "", "", topN, words, false, 0, uploadFile);
    }
  };

  const isValid = (
    mode === "remote" ? url.trim() !== "" :
    mode === "local" ? localPath.trim() !== "" :
    uploadFile !== null
  );

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg">
      {/* Source Mode Toggle */}
      <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
        {(["remote", "local", "upload"] as SourceMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition cursor-pointer ${
              mode === m
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {m === "remote" ? "🌐 GitHub" : m === "local" ? "📁 Local Path" : "📦 Upload Zip"}
          </button>
        ))}
      </div>

      {/* ── Remote: GitHub URL ── */}
      {mode === "remote" && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="repo-url">
              Repository URL
            </label>
            <input
              id="repo-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="branch">
              Branch
            </label>
            <input
              id="branch"
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </>
      )}

      {/* ── Local: directory path ── */}
      {mode === "local" && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="local-path">
            Local Directory Path
          </label>
          <input
            id="local-path"
            type="text"
            value={localPath}
            onChange={(e) => setLocalPath(e.target.value)}
            placeholder="/Users/zsh/projects/myrepo"
            required
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-sm"
          />
          <p className="mt-1 text-xs text-gray-400">
            Docker 后端通过 volume 挂载直接读取本机 /Users 目录。
          </p>
        </div>
      )}

      {/* ── Upload: drop zone ── */}
      {mode === "upload" && (
        <div className="mb-4">
          {/* Folder picker (Chrome/Edge) */}
          <button
            type="button"
            onClick={pickFolder}
            disabled={loading}
            className="w-full mb-3 py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 text-sm hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer disabled:opacity-50"
          >
            📂 Pick a Folder (Chrome/Edge — auto-zips and uploads)
          </button>

          <div className="text-center text-xs text-gray-400 mb-3">— or —</div>

          {/* Drag & drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) setUploadFile(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-lg cursor-pointer transition ${
              dragOver
                ? "border-blue-500 bg-blue-50"
                : uploadFile
                ? "border-green-400 bg-green-50"
                : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.tar,.tar.gz,.tgz"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setUploadFile(f);
              }}
              className="hidden"
            />
            {uploadFile ? (
              <>
                <span className="text-2xl mb-2">✅</span>
                <p className="text-sm font-medium text-gray-800">{uploadFile.name}</p>
                <p className="text-xs text-gray-500 mt-1">{(uploadFile.size / 1024 / 1024).toFixed(1)} MB — click to change</p>
              </>
            ) : (
              <>
                <span className="text-3xl mb-2">📦</span>
                <p className="text-sm font-medium text-gray-600">Drag & drop a .zip or .tar.gz here</p>
                <p className="text-xs text-gray-400 mt-1">or click to browse</p>
              </>
            )}
          </div>

          {/* Hidden file input for manual selection */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,.tar,.tar.gz,.tgz"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setUploadFile(f);
            }}
            className="hidden"
          />
        </div>
      )}

      {/* Words in Cloud */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Words in Cloud
        </label>
        <div className="flex gap-1">
          {TOP_N_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setTopN(n)}
              disabled={loading}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                topN === n
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              } disabled:opacity-50`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1 cursor-pointer"
      >
        {showAdvanced ? "▾" : "▸"} Advanced Options
      </button>

      {showAdvanced && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="custom-stopwords">
            Custom Stopwords
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Enter words to exclude, separated by commas or newlines.
          </p>
          <textarea
            id="custom-stopwords"
            value={customStopwords}
            onChange={(e) => setCustomStopwords(e.target.value)}
            disabled={loading}
            rows={3}
            placeholder="myCompany, internalAPI"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 resize-none"
          />

          {mode === "remote" && (
            <div className="mt-4 flex items-center gap-2">
              <input
                id="include-history"
                type="checkbox"
                checked={includeHistory}
                onChange={(e) => setIncludeHistory(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
              />
              <label htmlFor="include-history" className="text-sm font-medium text-gray-700 cursor-pointer">
                Include Commit History
              </label>
              {includeHistory && (
                <div className="ml-4 flex items-center gap-1">
                  <label className="text-xs text-gray-500" htmlFor="max-commits">Max commits</label>
                  <input
                    id="max-commits"
                    type="number"
                    min={10}
                    max={500}
                    value={maxCommits}
                    onChange={(e) => setMaxCommits(Math.min(500, Math.max(10, Number(e.target.value))))}
                    disabled={loading}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !isValid}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg transition duration-200 cursor-pointer disabled:cursor-not-allowed"
      >
        {loading ? "Analyzing..." :
          mode === "remote" ? "Analyze Repository" :
          mode === "local" ? "Analyze Local Directory" :
          "Analyze Uploaded Archive"}
      </button>
    </form>
  );
}

// ── Client-side zip packer using File System Access API ──────────────────────

// @ts-ignore
async function packDirectoryToZip(dirHandle: FileSystemDirectoryHandle): Promise<File> {
  const files: { name: string; body: Uint8Array }[] = [];

  // @ts-ignore
  async function walk(dir: FileSystemDirectoryHandle, prefix = "") {
    // @ts-ignore
    for await (const [name, handle] of dir.entries()) {
      const path = prefix + name;
      if (handle.kind === "file") {
        const file = await handle.getFile();
        const body = new Uint8Array(await file.arrayBuffer());
        files.push({ name: path, body });
      } else if (handle.kind === "directory") {
        // @ts-ignore
        await walk(handle, path + "/");
      }
    }
  }

  await walk(dirHandle);

  const buf = await buildZip(files);
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return new File([arrayBuffer], "folder.zip", { type: "application/zip" });
}

async function buildZip(files: { name: string; body: Uint8Array }[]): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const { name, body } of files) {
    const nameBytes = new TextEncoder().encode(name);
    const crc = await crc32(body);
    const localHeader = buildLocalFileHeader(name, body, crc);
    parts.push(localHeader);
    parts.push(body);
    const cdEntry = buildCentralDirEntry(name, body, crc, offset, nameBytes.length);
    centralDir.push(cdEntry);
    offset += localHeader.byteLength + body.byteLength;
  }

  const cdStart = offset;
  for (const cd of centralDir) parts.push(cd);
  const eocd = buildEOCD(cdStart, centralDir.reduce((a, b) => a + b.byteLength, 0), files.length);
  parts.push(eocd);

  const total = parts.reduce((a, b) => a + b.byteLength, 0);
  const result = new Uint8Array(total);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.byteLength;
  }
  return result;
}

function buildLocalFileHeader(name: string, body: Uint8Array, crc: number): Uint8Array {
  const nameBytes = new TextEncoder().encode(name);
  const h = new ArrayBuffer(30);
  const v = new DataView(h);
  v.setUint32(0, 0x04034b50, true);   // local file header sig
  v.setUint16(4, 20, true);            // version needed
  v.setUint16(6, 0, true);             // general purpose bit flag
  v.setUint16(8, 0, true);             // compression method (stored)
  v.setUint16(10, 0, true);            // mod time
  v.setUint16(12, 0, true);            // mod date
  v.setUint32(14, crc, true);          // crc-32
  v.setUint32(18, body.byteLength, true);  // compressed size
  v.setUint32(22, body.byteLength, true);   // uncompressed size
  v.setUint16(26, nameBytes.byteLength, true); // file name length
  v.setUint16(28, 0, true);            // extra field length
  const header = new Uint8Array(h);
  const result = new Uint8Array(header.byteLength + nameBytes.byteLength);
  result.set(header, 0);
  result.set(nameBytes, header.byteLength);
  return result;
}

function buildCentralDirEntry(
  name: string, body: Uint8Array, crc: number,
  localHeaderOffset: number, nameLen: number,
): Uint8Array {
  const nameBytes = new TextEncoder().encode(name);
  const h = new ArrayBuffer(46);
  const v = new DataView(h);
  v.setUint32(0, 0x02014b50, true);   // central dir header sig
  v.setUint16(4, 20, true);            // version made by
  v.setUint16(6, 20, true);            // version needed
  v.setUint16(8, 0, true);             // general purpose bit flag
  v.setUint16(10, 0, true);            // compression method
  v.setUint16(12, 0, true);            // mod time
  v.setUint16(14, 0, true);            // mod date
  v.setUint32(16, crc, true);          // crc-32
  v.setUint32(20, body.byteLength, true);  // compressed size
  v.setUint32(24, body.byteLength, true);  // uncompressed size
  v.setUint16(28, nameLen, true);     // file name length
  v.setUint16(30, 0, true);           // extra field length
  v.setUint16(32, 0, true);           // file comment length
  v.setUint16(34, 0, true);           // disk number start
  v.setUint16(36, 0, true);           // internal attributes
  v.setUint32(38, 0, true);           // external attributes
  v.setUint32(42, localHeaderOffset, true); // relative offset
  const header = new Uint8Array(h);
  const result = new Uint8Array(header.byteLength + nameBytes.byteLength);
  result.set(header, 0);
  result.set(nameBytes, header.byteLength);
  return result;
}

function buildEOCD(cdStart: number, cdSize: number, numFiles: number): Uint8Array {
  const h = new ArrayBuffer(22);
  const v = new DataView(h);
  v.setUint32(0, 0x06054b50, true);   // end of central dir sig
  v.setUint16(4, 0, true);             // disk number
  v.setUint16(6, 0, true);             // cd disk number
  v.setUint16(8, numFiles, true);     // entries on this disk
  v.setUint16(10, numFiles, true);    // total entries
  v.setUint32(12, cdSize, true);      // central dir size
  v.setUint32(16, cdStart, true);     // central dir offset
  v.setUint16(20, 0, true);            // comment length
  return new Uint8Array(h);
}

// CRC-32 using TypedArray
async function crc32(data: Uint8Array): Promise<number> {
  const table = makeCrcTable();
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeCrcTable(): number[] {
  const table = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}
