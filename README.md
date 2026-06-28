# PortBridge

PortBridge 是一个专注于 SSH 本地端口映射的跨平台桌面客户端。它不是 SSH 终端工具，只管理 `-L localHost:localPort:remoteHost:remotePort` 形式的本地端口转发。

## 功能列表

- 分组管理
- 服务器配置管理
- 密码 / 私钥认证，私钥支持粘贴、拖拽和选择文件
- 多条本地端口映射规则
- 单条启动、停止、重连
- 服务器级一键启动 / 停止
- 本地端口占用检测
- 异常断开自动重连
- 运行状态实时同步
- 最近 500 条运行日志
- SQLite 明文保存配置

## 安装依赖

```bash
npm install
```

## 开发启动

```bash
npm run dev
```

## 打包

```bash
npm run build
npm run dist
```

`electron-builder` 已配置 macOS `dmg` 和 Windows `nsis` 目标。

## 数据存储位置

数据库文件保存在 Electron `userData` 目录下：

```txt
<userData>/data/portbridge.db
```

## 使用说明

1. 新增分组。
2. 在分组下新增服务器，选择密码或私钥认证；私钥可以直接粘贴、拖拽文件或点击选择文件。
3. 选中服务器后新增映射规则。
4. 点击映射规则的启动按钮，或在服务器上执行启动全部。
5. 底部日志面板查看端口占用、SSH 连接和重连信息。

## UI 说明

主界面采用三栏布局：左侧分组，中间服务器，右侧映射规则。底部是可折叠日志面板，默认暗色模式，使用 Tailwind CSS、shadcn/ui 风格组件和 lucide-react 图标。

## 已知限制

- 第一版不提供 SSH 终端、SFTP、远程文件管理。
- 第一版不支持跳板机、多级 SSH、远程端口转发和动态代理。
- 配置暂时明文存储，密码和私钥内容不会写入日志。
- 已保存密码不会返回 Renderer，编辑服务器时需要重新输入认证密钥信息。

## 后续计划

- macOS Keychain / Windows Credential Manager 加密凭据。
- 系统托盘和开机自启。
- 浅色主题。
- 配置导入导出。
