

# PortBridge

PortBridge is a lightweight, cross-platform, locally private desktop client for SSH local port forwarding. It transforms the SSH local port forwarding workflow into a visual configuration interface. All server, authentication, and mapping configurations are stored on the user's own machine, without relying on cloud accounts or uploading data to third-party services. This allows developers, testers, and operations personnel to securely manage multiple servers and port mappings.

The project itself maintains a clean Electron + React + TypeScript architecture, making it an ideal foundation for secondary development in scenarios such as SSH tools, desktop clients, SQLite local data management, and Electron automated packaging and publishing.

## Product Screenshots
<img width="2560" height="1640" alt="image" src="https://github.com/user-attachments/assets/fdae0f70-1ac6-4a28-861b-36d7b106739b" />


## Why Use PortBridge

- **Out-of-the-box port forwarding management**: Organize complex environments with groups, servers, and mapping rules, ideal for local access scenarios like databases, internal APIs, and admin panels.
- **Lower troubleshooting costs**: Checks for local port conflicts before starting, and the bottom log panel records connection, disconnection, reconnection, and error information in real time.
- **Better suited for long-term use**: Automatically reconnects after abnormal disconnections, and supports starting and stopping individual mappings or batch operations for entire servers.
- **Locally private and highly controllable**: Server addresses, authentication credentials, and port mapping configurations are stored in a local SQLite database. It does not rely on cloud accounts or upload data to third-party services, making it suitable for teams with higher sensitivity to internal service access and credential security.
- **Ideal for secondary development**: The main process, preload layer, renderer, shared types, and IPC boundaries are clearly separated, facilitating easy extension.

## Key Features

- Group Management: Organize servers by project, client, environment, or team.
- Server Management: Supports SSH Host, port, username, password authentication, and private key authentication.
- Private Key Input: Supports pasting private key content, selecting private key files, and entering passphrases.
- Port Mapping: Maintain multiple local port forwarding rules for the same server.
- Runtime Control: Supports starting, stopping, and reconnecting individual mappings, as well as batch operations at the server level.
- Automatic Reconnection: Automatically attempts to restore the connection if the SSH channel drops abnormally.
- Port Checking: Verifies local listening port availability before starting.
- Real-time Logs: View connection status, error reasons, and reconnection records within the app.
- Configuration Migration: Supports configuration import/export, handling naming conflicts during import.
- Data Maintenance: Supports clearing empty groups and deleting all local data.

## Download and Installation

Please visit [GitHub Releases](https://github.com/amoorzheyu/PortBridge/releases) to download the installer for your operating system.

| OS | Recommended Download |
| --- | --- |
| Windows | `.exe` |
| macOS | `.dmg` or `-mac.zip` |
| Linux | `.AppImage` or `.deb` |

On macOS, if the system warns that the app cannot be opened upon first launch, you can allow it in the System Settings Security & Privacy section, or remove the quarantine attribute via terminal:

```bash
xattr -dr com.apple.quarantine /Applications/PortBridge.app
```

## Quick Start

1. Create a new group, such as `Production`, `Staging`, or a client name.
2. Add a server under the group, filling in the Host, SSH port, username, and authentication method.
3. Choose password authentication, or configure using private key content, a private key file, and a passphrase.
4. Select the server and add a port mapping rule, e.g., mapping remote `127.0.0.1:3306` to local `127.0.0.1:13306`.
5. Click the start button for the mapping rule, or execute "Start All" on the server.
6. View port conflicts, SSH connections, disconnections, and reconnection logs in the bottom panel.

## Ideal Use Cases

- Accessing internal network databases, Redis, Elasticsearch, admin panels, and other services on remote servers.
- Unified management of SSH port mappings across multiple projects and environments.
- Replacing scattered shell scripts and ad-hoc SSH commands.
- Providing team members with a lower-barrier way to access internal network services.
- Rapidly building custom DevOps tools, tunneling tools, or local configuration management tools based on Electron.

## Interface Layout

The main interface uses a three-column layout:

- Left: Group list
- Center: Server list and server actions
- Right: Port mapping rules
- Bottom: Collapsible runtime log

This structure allows users to navigate step-by-step from environment to server to mapping rules, fitting well with daily workflows that require frequent switching between projects and services.

## Data and Security

The database file is stored in the Electron `userData` directory:

```txt
<userData>/data/portbridge.db
```

Please note:

- Configurations are stored in a local SQLite database and are not uploaded to the cloud or third-party services.
- Sensitive authentication details are never written to runtime logs.
- Saved passwords are not auto-filled in the UI. When editing a server, any authentication changes require re-entry.
- PortBridge currently focuses on SSH local port forwarding and does not provide an SSH terminal, SFTP, or remote file management.

## Secondary Development

### Tech Stack

- Electron
- electron-vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui style components
- Radix UI
- lucide-react
- Zustand
- React Hook Form
- Zod
- SQLite / better-sqlite3
- ssh2

### Directory Structure

```txt
src
├── main              # Electron main process, database, IPC, SSH tunnel management
│   ├── db            # SQLite initialization, migrations, Repository
│   ├── ipc           # IPC Handlers callable by the Renderer
│   ├── services      # Business services for tunnels, logs, config import/export, etc.
│   └── utils         # Utilities for port checking, ID generation, etc.
├── preload           # Electron APIs securely exposed to the Renderer
├── renderer          # React frontend interface
│   ├── api           # Wrappers for Renderer calls to preload APIs
│   ├── components    # Page components, form components, common UI components
│   ├── store         # Zustand state management
│   └── styles        # Global styles
└── shared            # Types and Zod Schemas shared between main and renderer processes
```

### Core Flow

1. The Renderer calls business APIs via `src/renderer/api/electronApi.ts`.
2. The Preload script exposes controlled capabilities via `contextBridge` in `src/preload/index.ts`.
3. Main IPC Handlers in `src/main/ipc` receive requests and validate inputs.
4. The Repository and Service layers handle SQLite data, SSH tunnels, logs, and configuration migration.
5. Shared types and schemas are located in `src/shared`, minimizing data contract drift between the main and renderer processes.

### Common Extension Directions

- Add support for jump hosts or multi-hop SSH.
- Add remote port forwarding, dynamic proxy, or SOCKS proxy support.
- Add system tray integration, auto-start on boot, and global shortcuts.
- Add configuration encryption, master password, or system keychain integration.
- Add team configuration templates, bulk import, and environment duplication.
- Add more log filtering, connection diagnostics, and export capabilities.
- Customize UI themes, expand to light mode, or create branded interfaces.

## Local Development

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Build production assets:

```bash
npm run build
```

Local packaging:

```bash
npm run dist
```

Common linting/check commands:

```bash
npm run lint
npm run typecheck
```

The project includes the `better-sqlite3` native dependency. When building installers for a specific platform, it is recommended to run the packaging process on the corresponding OS to avoid native module mismatches.

## Automated Publishing

Pushing a Git tag in `v*` format will trigger GitHub Actions to automatically package and publish to GitHub Releases:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The current publishing workflow packages separately for Windows, macOS, and Linux environments, and uploads the following artifacts:

- Windows: `nsis` installer, `portable` version
- macOS: `dmg` installer, `zip` archive
- Linux: `AppImage`, `deb`

## Contributing

Contributions via Issues or Pull Requests are welcome, particularly focusing on user experience, stability, platform compatibility, and secondary development capabilities.

Recommended priority areas for contribution:

- Provide installation and usage feedback for more platforms.
- Improve error messages and logging for edge cases.
- Expand port forwarding capabilities.
- Enhance automated testing and publishing workflows.
- Refine the README, screenshots, use cases, and development documentation.

## Project Scope

PortBridge currently focuses exclusively on SSH local port forwarding. It is not a full-featured SSH client, nor is it an SFTP client, bastion host, remote desktop, or cloud configuration center. This boundary is intentionally maintained to keep the project lightweight and to allow secondary developers to more easily extend the existing architecture for their own use cases.
