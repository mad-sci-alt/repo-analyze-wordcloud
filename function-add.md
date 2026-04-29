# 功能增强记录

## F0: 本地分析（路径 / 文件上传）

**功能描述：** 支持三种本地代码来源方式：输入绝对路径、拖拽上传 zip 包、或点击"Pick a Folder"自动打包上传（Chrome/Edge 浏览器）。

**实现位置：**
- `backend/app/models.py` — `AnalyzeByUploadRequest` 模型；`AnalyzeResponse` 新增 `upload_type` 字段
- `backend/app/routers/analyze.py` — 新增 `POST /api/analyze/upload` 端点（form-data，接收 zip/tar.gz）；`run_analysis_upload()` 后台任务，解压后调用 `_collect_stats()` 统一分析
- `frontend/src/api/client.ts` — 新增 `analyzeUpload()` 函数（FormData 上传）
- `frontend/src/hooks/useAnalyze.ts` — `submit()` 新增 `file?: File` 参数，mode 为 `"upload"` 时调用 `analyzeUpload()`
- `frontend/src/components/RepoInputForm.tsx` — 新增 "📦 Upload Zip" Tab，含：
  - **文件夹选择器**：`window.showDirectoryPicker()` API（Chrome/Edge），选中后 JS 端用纯手写 zip 打包器（`buildZip()`，无第三方依赖）将整个目录打成 zip 上传
  - **拖拽上传区**：支持 `.zip` / `.tar.gz` / `.tgz`，带视觉拖拽反馈

**API 变更：**
- `POST /api/analyze/upload` — multipart/form-data，`file`（必填）、`top_n`、`custom_stopwords`
- `POST /api/analyze/local` — `local_path` 必填

**注意：** 文件夹选择器仅 Chrome/Edge 支持，Safari/Firefox 用户只能使用拖拽上传 zip 的方式。

---

## F1: Top-N 词数选择器

**功能描述：** 用户可自定义词云和统计结果展示的词条数量，支持 10 / 20 / 25 / 50 / 100 五档。

**实现位置：**
- `backend/app/models.py` — `AnalyzeRequest.top_n` 字段，默认 20，范围 5~200
- `backend/app/routers/analyze.py` — 透传 `top_n` 参数至 `generate_wordcloud()`
- `frontend/src/components/RepoInputForm.tsx` — 按钮组选择器
- `frontend/src/types/index.ts` — `TopNOption` 类型

**API 变更：** `POST /api/analyze` 请求体新增 `top_n` 字段

---

## F2: CSV 导出

**功能描述：** 导出当前分析结果中所有过滤后的词频数据（含 rank），供用户在 Excel 等工具中进一步分析。

**实现位置：**
- `backend/app/routers/analyze.py` — `GET /api/result/{job_id}/export` 端点，返回 `text/csv`
- `frontend/src/api/client.ts` — `downloadCSV()` 函数，触发浏览器文件下载
- `frontend/src/App.tsx` — "Download CSV" 按钮

**API 变更：** 新增 `GET /api/result/{job_id}/export`

---

## F3: 目录热点报告

**功能描述：** 按顶层目录聚合 token 数量，揭示代码结构热点，直观展示哪些目录代码量最大、每个目录的高频词是什么。

**实现位置：**
- `backend/app/routers/analyze.py` — `run_analysis()` 循环中维护 `dict[str, Counter]` 聚合目录级统计
- `backend/app/models.py` — `DirectoryStat` 模型
- `frontend/src/components/DirectoryBreakdown.tsx` — recharts 水平柱状图，带 tooltip 显示 top words
- `frontend/src/App.tsx` — 条件渲染该组件

**API 变更：** `GET /api/result/{job_id}` 响应新增 `directory_stats` 数组

---

## F4: 文件级 Token 统计

**功能描述：** 统计仓库中 token 密度最高的 20 个文件，附带文件扩展名颜色标签，帮助识别异常文件或配置密集区。

**实现位置：**
- `backend/app/routers/analyze.py` — `run_analysis()` 循环中维护 `dict[str, int]` 文件级 token 计数
- `backend/app/models.py` — `FileStat` 模型
- `frontend/src/components/FileStatsTable.tsx` — 表格展示，含扩展名彩色徽章
- `frontend/src/App.tsx` — 条件渲染该组件

**API 变更：** `GET /api/result/{job_id}` 响应新增 `file_stats` 数组

---

## F5: 编程语言分词统计

**功能描述：** 按编程语言分别统计词频，每个语言展示其特有的高频词汇，支持 Tab 切换不同语言视图。

**实现位置：**
- `backend/app/config.py` — 新增 `EXT_TO_LANG` 反向映射（扩展名 → 语言名）
- `backend/app/routers/analyze.py` — `run_analysis()` 循环中维护 `dict[str, Counter]` 按语言聚合
- `backend/app/models.py` — `ResultResponse.language_stats` 字段
- `frontend/src/components/LanguageBreakdown.tsx` — Tab 语言切换 + recharts 柱状图
- `frontend/src/App.tsx` — 条件渲染该组件

**API 变更：** `GET /api/result/{job_id}` 响应新增 `language_stats: dict[str, list[FrequencyStat]]`

---

## F6: 自定义停用词

**功能描述：** 用户可在 Advanced Options 中输入自定义停用词（逗号或换行分隔），补充过滤掉项目专属或公司级无意义词汇。

**实现位置：**
- `backend/app/services/stopwords.py` — `filter_stopwords()` 新增 `extra: set[str]` 可选参数
- `backend/app/models.py` — `AnalyzeRequest.custom_stopwords` 字段
- `backend/app/routers/analyze.py` — 将 `custom_stopwords` 透传给 `filter_stopwords()`
- `frontend/src/components/RepoInputForm.tsx` — Advanced Options 折叠区 textarea 输入框
- `frontend/src/api/client.ts` — `analyzeRepo()` 新增参数

**API 变更：** `POST /api/analyze` 请求体新增 `custom_stopwords: list[str]` 字段

---

## F7: Commit 历史分析

**功能描述：** 开启后对仓库进行完整 clone（而非 shallow clone），遍历最近 N 次提交，记录每日代码行数变化和语言组成演变，以 Line Chart 展示。

**实现位置：**
- `backend/app/services/git_service.py` — `clone_repository()` 新增 `depth` 参数，`extract_code_files()` 返回相对路径
- `backend/app/models.py` — `AnalyzeRequest.include_history`、`max_commits`、`ProgressInfo.stage` 扩展
- `backend/app/routers/analyze.py` — `include_history=true` 时跳过 `depth=1`，用 `repo.iter_commits()` 遍历；按日期聚合 commits
- `frontend/src/types/index.ts` — `CommitSnapshot` 接口
- `frontend/src/components/CommitHistoryChart.tsx` — recharts `LineChart`，语言分色 + 总行数虚线
- `frontend/src/components/RepoInputForm.tsx` — Advanced Options 新增 checkbox + max_commits 数量输入
- `frontend/src/App.tsx` — 条件渲染该组件

**API 变更：**
- `POST /api/analyze` 请求体新增 `include_history: bool`、`max_commits: int`
- `GET /api/result/{job_id}` 响应新增 `commit_history` 数组
- `ProgressInfo.stage` 新增 `"analyzing_history"` 阶段

**注意：** `include_history=true` 时 clone 会拉取完整仓库历史，分析时间显著增加；建议 `max_commits` 控制在 50~200。

---

## 技术细节

### 停用词过滤策略

采用三层过滤：
1. **英文停用词** — 约 140 个 NLTK 标准停用词（hardcoded，避免 Docker 网络依赖）
2. **代码停用词** — 约 120 个语言关键字 + 通用标识符（`get`, `set`, `component`, `props` 等）
3. **自定义停用词** — 用户输入，透传到 `filter_stopwords(extra=...)`

### 分词策略

正则三阶段处理：
1. 去除行注释（`//`、`#`）、块注释（`/* */`）、HTML 注释
2. 去除字符串字面量（单引号、双引号、三引号、模板字符串）
3. 提取标识符 `[a-zA-Z_][a-zA-Z0-9_]{1,}`，最小长度 2

### 支持的文件类型

`.js` `.jsx` `.ts` `.tsx` `.vue` `.svelte` `.py` `.rb` `.php` `.pl` `.r` `.c` `.cpp` `.cc` `.h` `.hpp` `.java` `.kt` `.cs` `.go` `.rs` `.swift` `.sh` `.bash` `.zsh` `.ps1` `.yaml` `.yml` `.toml` `.json` `.xml` `.html` `.css` `.scss` `.less` `.md` `.rst`

### 不支持的目录

自动跳过：`node_modules` `.git` `__pycache__` `.venv` `venv` `vendor` `dist` `build` `target` `.next` `.nuxt` `coverage` `.pytest_cache`
