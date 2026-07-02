# PortBridge

PortBridge 是一个专注于 SSH 本地端口映射的跨平台桌面客户端，通过 SSH 加密通道把远程服务映射到本机端口，配置保存在本机，便于开发、调试和日常运维。

## 功能列表

- 按项目或环境整理服务器，连接配置更清晰。
- 支持密码和私钥认证，私钥可以粘贴、拖拽或从文件选择。
- 为同一台服务器配置多条端口映射规则。
- 单独启动、停止或重连某条映射，也可以一键管理整台服务器的全部映射。
- 启动前自动检查本地端口占用，减少连接失败排查成本。
- 连接异常时自动尝试恢复，适合长时间保持转发通道。
- 实时查看连接状态和运行日志，快速定位认证、端口和网络问题。
- 配置保存在本机，不依赖云端账号。

## 下载与安装

请在 GitHub Release 页面下载对应系统的安装包：

- Windows：下载 `.exe`
- macOS：下载 `.dmg` 或 `-mac.zip`
- Linux：下载 `.AppImage` 或 `.deb`

macOS 首次打开时如果系统提示应用无法打开，可以在系统设置的安全性选项中允许打开，或在终端中移除隔离属性：

```bash
xattr -dr com.apple.quarantine /Applications/PortBridge.app
```

## 使用说明

1. 新增分组。
2. 在分组下新增服务器，选择密码或私钥认证。
3. 私钥可以直接粘贴、拖拽文件或点击选择文件。
4. 选中服务器后新增本地端口映射规则。
5. 点击映射规则的启动按钮，或在服务器上执行启动全部。
6. 在底部日志面板查看端口占用、SSH 连接和重连信息。

## 界面说明

主界面采用三栏布局：左侧分组，中间服务器，右侧映射规则。底部是可折叠日志面板。

## 数据存储位置

数据库文件保存在 Electron `userData` 目录下：

```txt
<userData>/data/portbridge.db
```

## 注意事项

- 配置保存在本机，敏感认证内容不会写入运行日志。
- 已保存密码不会返回界面，编辑服务器时需要重新输入认证密钥信息。
- PortBridge 专注本地端口转发，不提供 SSH 终端、SFTP 或远程文件管理。

## 开发者说明

### 技术栈

- Electron
- electron-vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui 风格组件
- lucide-react
- SQLite / better-sqlite3

PortBridge 管理的是 SSH `-L localHost:localPort:remoteHost:remotePort` 形式的本地端口转发。连接异常断开后会自动重连，当前重连间隔为 3000ms。运行日志最多保留最近 500 条。

当前配置存储在本地 SQLite 数据库中，路径为 Electron `userData` 目录下的 `data/portbridge.db`。密码和私钥内容不会返回 Renderer，也不会写入运行日志。

当前能力边界：本地端口转发，不包含跳板机、多级 SSH、远程端口转发、动态代理、SSH 终端、SFTP 或远程文件管理。

### 安装依赖

```bash
npm install
```

### 开发启动

```bash
npm run dev
```

### 打包

```bash
npm run build
npm run dist
```

`electron-builder` 已配置以下打包目标：

- Windows：`nsis` 安装包、`portable` 便携版
- macOS：`dmg` 安装包、`zip` 压缩包
- Linux：`AppImage`、`deb`

项目包含 `better-sqlite3` 原生依赖，建议在对应系统环境打对应平台的包，避免原生模块不匹配。

### 自动发布

推送 `v*` 格式的 Git tag 会触发 GitHub Actions 自动打包并上传到 GitHub Release：

```bash
git tag v0.1.0
git push origin v0.1.0
```

自动发布会分别在 Windows、macOS、Linux 环境打包，并上传 `.exe`、`.dmg`、`-mac.zip`、`.AppImage`、`.deb` 产物。

### 常用脚本

```bash
npm run build
npm run dist
npm run lint
npm run typecheck
npm run rebuild:native
```

## 后续计划

- 系统托盘和开机自启。
- 浅色主题。
- 配置导入导出。
