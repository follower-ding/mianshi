# PostgreSQL 小白使用指南（Offer通 项目）

> 面向零基础：什么是 PG、怎么装、怎么连、怎么在本项目里用。  
> **可以不启动 Docker**，下面两种方式任选其一。

---

## 一、PostgreSQL 是什么？

可以把 PostgreSQL（常简称 **PG**）理解成：

- 一个**装在电脑或服务器上的数据库软件**
- 数据存在磁盘里，**重启程序不会丢**
- 本项目用它存：用户、题库、面经、面试 Session、报告、埋点、LLM 缓存等

**和项目里 `db.json` 的关系：**

| 模式 | 怎么启用 | 适合谁 |
|------|----------|--------|
| **JSON 文件** | 不配置 `DATABASE_URL` | 只测面试/题库，不需要登录 |
| **PostgreSQL** | 配置 `DATABASE_URL` | 登录、运营后台、数据持久化、Phase 3 全功能 |

---

## 二、可以不启动 Docker 吗？

**可以。** Docker 只是「装 PG 的一种便捷方式」，不是必须。

| 方式 | 优点 | 缺点 |
|------|------|------|
| **A. Docker** | 一条命令、不污染系统、和文档一致 | 需要先开 Docker Desktop |
| **B. 本机安装 PG** | 不用 Docker，开机可自动启动 | 要自己装安装包、记密码 |

两种方式连本项目的方式**完全一样**：都是在 `.env` 里写 `DATABASE_URL`。

---

## 三、方式 A：用 Docker 启动（推荐新手）

### 1. 安装并打开 Docker Desktop

- 下载：https://www.docker.com/products/docker-desktop/
- 安装后**务必打开 Docker Desktop**，等左下角显示 Running

### 2. 启动数据库

在项目根目录执行：

```powershell
docker compose -f d:\cursor_project\mianshi\docker-compose.yml up -d
```

看到 `mianshi-postgres` 容器 Running 即成功。

### 3. 查看是否在跑

```powershell
docker ps
```

应能看到 `5432->5432` 的 `mianshi-postgres`。

### 4. 停止（不删数据）

```powershell
docker compose -f d:\cursor_project\mianshi\docker-compose.yml stop
```

### 5. 彻底删除容器和数据（慎用）

```powershell
docker compose -f d:\cursor_project\mianshi\docker-compose.yml down -v
```

---

## 四、方式 B：不用 Docker，Windows 本机安装

### 1. 下载安装包

**方式 1：命令行一键安装（推荐）**

```powershell
winget install -e --id PostgreSQL.PostgreSQL.16 --accept-package-agreements --accept-source-agreements
```

安装向导中请记住 **postgres 超级用户密码**（常见为 `postgres`）。

**方式 2：官网下载**

- 官方：https://www.postgresql.org/download/windows/
- 或使用 EDB 安装器：https://www.enterprisedb.com/downloads/postgres-postgresql-downloads  
  选 **PostgreSQL 16**，Windows x86-64。

### 2. 安装时注意

- **端口**：保持 `5432`（和项目默认一致）
- **超级用户密码**：自己设一个，例如 `mianshi`（请记住）
- 组件可勾选 **Command Line Tools**（含 `psql` 命令行）

### 3. 创建本项目用的库和用户

**一键脚本（推荐）：**

```powershell
& d:\cursor_project\mianshi\scripts\setup-postgres-local.ps1
# 若 postgres 超级用户密码不是 postgres，加参数：
# & d:\cursor_project\mianshi\scripts\setup-postgres-local.ps1 -PostgresPassword 你的密码
```

脚本会自动：创建 `mianshi` 用户/数据库、写入 `mianshi-api/.env` 的 `DATABASE_URL`。

**手动方式：** 打开 **SQL Shell (psql)** 或 PowerShell（若已加入 PATH）：

```powershell
psql -U postgres
```

在 `postgres=#` 里执行：

```sql
CREATE USER mianshi WITH PASSWORD 'mianshi';
CREATE DATABASE mianshi OWNER mianshi;
GRANT ALL PRIVILEGES ON DATABASE mianshi TO mianshi;
\q
```

### 4. 连接串

本机安装且按上面创建用户后，连接串与 Docker 相同：

```env
DATABASE_URL=postgresql://mianshi:mianshi@localhost:5432/mianshi
```

若你用了别的密码，把 URL 里的第二个 `mianshi` 改成你的密码。

---

## 五、在本项目里启用 PostgreSQL

### 1. 配置环境变量

复制并编辑 API 环境文件：

```powershell
cd d:\cursor_project\mianshi\mianshi-api
copy .env.example .env
```

在 `.env` 中确保有（并取消注释/填写）：

```env
DATABASE_URL=postgresql://mianshi:mianshi@localhost:5432/mianshi
JWT_SECRET=随便写一串长一点的密钥
ADMIN_EMAIL=admin@mianshi.local
ADMIN_PASSWORD=admin123456
```

### 2. 启动 API

```powershell
cd d:\cursor_project\mianshi\mianshi-api
npm run dev
```

**成功标志**（控制台应出现）：

```text
[DB] PostgreSQL ready
Database: PostgreSQL
```

若出现 `using JSON file storage`，说明 **没连上 PG**，检查：

1. PG 是否在跑（Docker 或 Windows 服务）
2. `.env` 里 `DATABASE_URL` 是否正确
3. 密码、端口 5432 是否被占用

### 3. 启动前端

```powershell
cd d:\cursor_project\mianshi\mianshi-frontend
npm run dev
```

浏览器打开 http://localhost:5174/login ，用管理员账号登录：

- 邮箱：`admin@mianshi.local`
- 密码：`admin123456`（与 `.env` 中 `ADMIN_PASSWORD` 一致）

运营后台：http://localhost:5174/admin

---

## 六、怎么确认数据库真的在用？

### 1. 接口自检

```powershell
Invoke-RestMethod http://localhost:8788/api/info
```

应返回 `"database":"postgresql"`。

```powershell
Invoke-RestMethod http://localhost:8788/api/auth/status
```

应返回 `"enabled":true`。

### 2. 用 psql 看表（可选）

Docker 方式：

```powershell
docker exec -it mianshi-postgres psql -U mianshi -d mianshi
```

本机安装：

```powershell
psql -U mianshi -d mianshi -h localhost
```

常用命令：

```sql
\dt                    -- 列出所有表
SELECT COUNT(*) FROM questions;
SELECT email, role FROM users;
\q                     -- 退出
```

---

## 七、Cursor 里有 PostgreSQL 的 MCP 吗？

**有。** 你的 Cursor 里已配置 MCP 服务器：**`user-postgres`**（显示名 postgres）。

### MCP 能做什么？

在 Cursor 对话里，Agent 可以通过 MCP **直接查库**（执行 SQL、看表结构等），方便调试，**不能替代**项目自己的 `DATABASE_URL` 配置。

### 当前状态

若 MCP 显示 **Errored**，需要你在 Cursor 里修复：

1. 打开 **Cursor Settings → MCP**
2. 找到 **postgres / user-postgres**
3. 检查连接配置（通常需要 PG 已启动 + 正确的连接串）
4. 点击重新连接 / 查看错误日志

MCP 连接串一般与项目 `.env` 一致，例如：

```text
postgresql://mianshi:mianshi@localhost:5432/mianshi
```

**注意：**

- MCP 和本项目 API **共用同一个 PostgreSQL 实例**即可
- MCP 挂了不影响项目运行，只影响 Cursor 里「让 AI 帮你查库」
- 你同时还有 **user-mysql** MCP；本项目代码默认是 PG，换 MySQL 要改代码（见 QUALITY_REPORT / 架构说明）

---

## 八、本项目会自动建表吗？

**会。** 首次启动且 `DATABASE_URL` 有效时，API 会：

1. 执行 `mianshi-api/src/db/schema.sql` 建表
2. 从 `seed.json` / `db.json` 导入初始题库和面经（若表为空）
3. 创建默认管理员账号

无需手动跑迁移脚本（除非你改动了 schema 想重建库）。

---

## 九、常见问题 FAQ

### Q1：Docker 报错 `dockerDesktopLinuxEngine` 找不到？

**Docker Desktop 没启动。** 先打开 Docker Desktop，等 Running 后再 `docker compose up -d`。

### Q2：端口 5432 被占用？

```powershell
netstat -ano | findstr :5432
```

关掉占用进程，或改 Docker/本机 PG 端口，并同步修改 `DATABASE_URL` 里的端口。

### Q3：不想用 PG，只想快速试面试？

**可以不装 PG、不启 Docker。** 不配置 `DATABASE_URL`，项目自动用 `mianshi-api/data/db.json`。

### Q4：PG 和 MySQL 选哪个？

本项目 Phase 3 **已按 PostgreSQL 实现**。MySQL 也能用，但要改驱动和 SQL，见团队架构选型；日常开发 PG + Docker 或本机 PG 即可。

### Q5：数据存在哪？

| 方式 | 数据位置 |
|------|----------|
| Docker | Docker 卷 `mianshi_pg_data` |
| 本机 PG | Windows 安装目录下 data 目录 |
| JSON 模式 | `mianshi-api/data/db.json` |

---

## 十、一张图看懂流程

```text
┌─────────────────┐     DATABASE_URL      ┌──────────────────┐
│  mianshi-api    │ ────────────────────► │   PostgreSQL     │
│  (Hono 后端)    │                       │  localhost:5432  │
└────────┬────────┘                       └────────▲─────────┘
         │                                         │
         │ 无 DATABASE_URL                         │ Docker 或
         ▼                                         │ 本机安装
┌─────────────────┐                               │
│   db.json       │         ┌─────────────────────┘
│  (降级模式)     │         │
└─────────────────┘         │
                              │
                    ┌─────────┴─────────┐
                    │  Cursor MCP       │
                    │  user-postgres    │  （可选，给 AI 查库用）
                    └───────────────────┘
```

---

## 十一、相关文件

| 文件 | 说明 |
|------|------|
| `docker-compose.yml` | Docker 方式启动 PG |
| `mianshi-api/.env.example` | 环境变量模板 |
| `mianshi-api/src/db/schema.sql` | 表结构 |
| `mianshi-api/src/db/init.ts` | 启动时迁移与 seed |
| `docs/QUALITY_REPORT.md` | 质量与 Phase 3 架构说明 |

---

**最短路径（有 Docker）：**

```powershell
docker compose -f d:\cursor_project\mianshi\docker-compose.yml up -d
# .env 写好 DATABASE_URL
cd mianshi-api && npm run dev
# 看到 [DB] PostgreSQL ready 即可
```

**最短路径（无 Docker）：**

本机安装 PG → 建库建用户 → `.env` 写 `DATABASE_URL` → `npm run dev`。

---

## 十二、简历数据从 JSON 迁移到 PG

若曾在 **未配置 `DATABASE_URL`** 时使用简历模块，数据可能在 `mianshi-api/data/db.json` 的 `userResumes` 字段中。

### 步骤

1. **备份** `mianshi-api/data/db.json`
2. 配置好 `DATABASE_URL` 并确认 API 启动日志为 `[DB] PostgreSQL ready`
3. 运行迁移：

```powershell
cd mianshi-api
npm run migrate:json-resumes
```

4. 验证 CRUD：

```powershell
npm run verify:pg-resumes
```

5. 浏览器登录后访问 `/resume/mine`，确认历史简历可见

### 相关命令

| 命令 | 说明 |
|------|------|
| `npm run migrate:json-resumes` | 将 db.json 中简历/分享链接写入 PG |
| `npm run verify:pg-resumes` | PG 简历表冒烟（计数 + CRUD） |
| `GET /api/resumes/health` | 是否 demo 模式、是否 PG 同步 |

用户帮助见 [RESUME-USER-GUIDE.md](./RESUME-USER-GUIDE.md)。
