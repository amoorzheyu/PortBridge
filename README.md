# PortBridge

PortBridge 是一个轻量、跨平台、本地私有化的 SSH 本地端口转发桌面客户端。它把 SSH 本地端口转发工作流做成可视化配置，所有服务器、认证和映射配置都保存在用户自己的电脑上，不依赖云端账号，也不会把配置上传到第三方服务，让开发、测试、运维人员可以更安全地管理多台服务器和多条端口映射。

项目本身也保持清晰的 Electron + React + TypeScript 架构，适合作为 SSH 工具、桌面客户端、SQLite 本地数据管理、Electron 自动打包发布等场景的二次开发基础。

## 为什么使用 PortBridge

- **开箱即用的端口转发管理**：用分组、服务器、映射规则组织复杂环境，适合数据库、内网接口、管理后台等本地访问场景。
- **更低的排障成本**：启动前检查本地端口占用，底部日志实时记录连接、断开、重连和错误信息。
- **更适合长期使用**：连接异常后自动重连，支持单条映射、整台服务器批量启动和停止。
- **本地私有化，更可控**：服务器地址、认证信息和端口映射配置保存在本机 SQLite 数据库中，不依赖云端账号，不上传到第三方服务，适合对内部服务访问和凭据安全更敏感的团队。
- **适合二次开发**：主进程、预加载层、渲染层、共享类型和 IPC 边界拆分明确，方便扩展能力。

## 主要功能

- 分组管理：按项目、客户、环境或团队整理服务器。
- 服务器管理：支持 SSH Host、端口、用户名、密码认证和私钥认证。
- 私钥输入：支持粘贴私钥内容、选择私钥文件和私钥口令。
- 端口映射：为同一台服务器维护多条本地端口转发规则。
- 运行控制：支持单条映射启动、停止、重连，也支持服务器维度的批量操作。
- 自动重连：SSH 通道异常断开后可自动尝试恢复。
- 端口检查：启动前检查本地监听端口是否可用。
- 实时日志：在应用内查看连接状态、错误原因和重连记录。
- 配置迁移：支持配置导入导出，并在导入时处理同名冲突。
- 数据维护：支持清理空分组和删除全部本地数据。

## 下载与安装

请前往 [GitHub Releases](https://github.com/amoorzheyu/PortBridge/releases) 下载对应系统的安装包。

| 系统 | 推荐下载 |
| --- | --- |
| Windows | `.exe` |
| macOS | `.dmg` 或 `-mac.zip` |
| Linux | `.AppImage` 或 `.deb` |

macOS 首次打开时，如果系统提示应用无法打开，可以在系统设置的安全性选项中允许打开，或在终端中移除隔离属性：

```bash
xattr -dr com.apple.quarantine /Applications/PortBridge.app
```

## 快速上手

1. 新增一个分组，例如 `Production`、`Staging` 或某个客户名称。
2. 在分组下新增服务器，填写 Host、SSH 端口、用户名和认证方式。
3. 选择密码认证，或使用私钥内容、私钥文件、私钥口令完成认证配置。
4. 选中服务器后新增端口映射规则，例如把远程 `127.0.0.1:3306` 映射到本地 `127.0.0.1:13306`。
5. 点击映射规则的启动按钮，或在服务器上执行启动全部。
6. 在底部日志面板查看端口占用、SSH 连接、断开和重连信息。

## 适合的使用场景

- 访问远程服务器内网数据库、Redis、Elasticsearch、管理后台等服务。
- 多项目、多环境的 SSH 端口映射统一管理。
- 替代零散的 shell 脚本和临时 SSH 命令。
- 给团队成员提供更低门槛的内网服务访问方式。
- 基于 Electron 快速二次开发自己的运维工具、隧道工具或本地配置管理工具。

## 界面结构

主界面采用三栏布局：

- 左侧：分组列表
- 中间：服务器列表和服务器操作
- 右侧：端口映射规则
- 底部：可折叠运行日志

这种结构让用户可以从环境到服务器再到映射规则逐级定位，适合频繁切换项目和服务的日常工作流。

## 数据与安全

数据库文件保存在 Electron `userData` 目录下：

```txt
<userData>/data/portbridge.db
```

需要注意：

- 配置保存在本机 SQLite 数据库，不上传云端或第三方服务。
- 敏感认证内容不会写入运行日志。
- 已保存密码不会回填到界面，编辑服务器时如需变更认证信息，需要重新输入。
- PortBridge 当前聚焦 SSH 本地端口转发，不提供 SSH 终端、SFTP 或远程文件管理。

## 二次开发

### 技术栈

- Electron
- electron-vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui 风格组件
- Radix UI
- lucide-react
- Zustand
- React Hook Form
- Zod
- SQLite / better-sqlite3
- ssh2

### 目录结构

```txt
src
├── main              # Electron 主进程、数据库、IPC、SSH 隧道管理
│   ├── db            # SQLite 初始化、迁移、Repository
│   ├── ipc           # Renderer 可调用的 IPC Handler
│   ├── services      # 隧道、日志、配置导入导出等业务服务
│   └── utils         # 端口检查、ID 等工具
├── preload           # 安全暴露给 Renderer 的 Electron API
├── renderer          # React 前端界面
│   ├── api           # Renderer 调用 preload API 的封装
│   ├── components    # 页面组件、表单组件、通用 UI 组件
│   ├── store         # Zustand 状态管理
│   └── styles        # 全局样式
└── shared            # 主进程和渲染进程共享的类型与 Zod Schema
```

### 核心链路

1. Renderer 通过 `src/renderer/api/electronApi.ts` 调用业务 API。
2. Preload 在 `src/preload/index.ts` 中通过 `contextBridge` 暴露受控能力。
3. Main IPC Handler 在 `src/main/ipc` 中接收请求并校验输入。
4. Repository 和 Service 层处理 SQLite 数据、SSH 隧道、日志和配置迁移。
5. 共享类型和 Schema 放在 `src/shared`，减少主进程和渲染进程之间的数据契约漂移。

### 常见扩展方向

- 增加跳板机或多级 SSH 支持。
- 增加远程端口转发、动态代理或 SOCKS 代理。
- 增加系统托盘、开机自启、全局快捷操作。
- 增加配置加密、主密码或系统钥匙串集成。
- 增加团队配置模板、批量导入和环境复制。
- 增加更多日志筛选、连接诊断和导出能力。
- 调整 UI 主题，扩展浅色模式或品牌化界面。

## 本地开发

安装依赖：

```bash
npm install
```

开发启动：

```bash
npm run dev
```

构建产物：

```bash
npm run build
```

本地打包：

```bash
npm run dist
```

常用检查命令：

```bash
npm run lint
npm run typecheck
```

项目包含 `better-sqlite3` 原生依赖。如果要打对应平台的安装包，建议在对应系统环境执行打包，避免原生模块不匹配。

## 自动发布

推送 `v*` 格式的 Git tag 会触发 GitHub Actions 自动打包并发布到 GitHub Release：

```bash
git tag v0.2.0
git push origin v0.2.0
```

当前发布流程会在 Windows、macOS、Linux 环境分别打包，并上传以下产物：

- Windows：`nsis` 安装包、`portable` 便携版
- macOS：`dmg` 安装包、`zip` 压缩包
- Linux：`AppImage`、`deb`

## 参与贡献

欢迎围绕使用体验、稳定性、平台兼容性和二次开发能力提交 Issue 或 Pull Request。

比较适合优先贡献的方向：

- 补充更多平台下的安装和使用反馈。
- 改进异常场景下的错误提示和日志信息。
- 增加更完整的端口转发能力。
- 完善自动化测试和发布流程。
- 优化 README、截图、使用案例和开发文档。

## 项目边界

PortBridge 当前专注于 SSH 本地端口转发。它不是完整 SSH 客户端，也不是 SFTP、堡垒机、远程桌面或云端配置中心。这个边界有意保持项目轻量，也让二次开发者可以更容易地基于现有架构扩展自己的版本。
