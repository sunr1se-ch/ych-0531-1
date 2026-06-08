# 社区恒温恒湿档案室管理系统

「除湿机除霜周期与藏品质检放行」台账管理系统，基于 React + Express + PostgreSQL 全栈架构，Docker Compose 单机部署。

## 功能特性

- 🏠 **除湿机管理**：登记除霜间隔，实时监控运行状态
- 💧 **湿度监控**：每小时记录库内相对湿度，72 小时趋势折线图
- ❄️ **待除霜智能判断**：超间隔 + 连续高湿度自动标记
- ✅ **待办确认**：待除霜任务醒目展示，一键确认完成
- 📦 **藏品批次管理**：抽检登记、出库放行、风险追溯
- 🚨 **强行出库拦截**：待除霜期间出库三重警告，永久留痕

## 核心业务规则

### 待除霜判定条件

当某台除湿机同时满足以下两个条件时，自动标记为「待除霜」：

1. **时间条件**：距上次除霜时间 > 计划除霜间隔 + 6 小时
2. **湿度条件**：库内湿度连续 3 次记录 > 58%

### 出库管控规则

- **正常状态**：除湿机状态为「正常」时，所属藏品批次可正常出库
- **待除霜锁定**：除湿机状态为「待除霜」时，所属藏品批次禁止出库
- **除霜解除**：确认除霜完成后，自动解除锁定，恢复出库权限

---

## 待除霜期间强行出库处理规则

> ⚠️ **重要提示**：待除霜状态表明该制冷区间湿度过高，强行出库可能导致纸质藏品受潮、翘曲、发霉等不可逆损坏。

### 处理流程

当操作员在除湿机「待除霜」状态下尝试登记出库时，系统将执行以下处理：

#### 1. 前端三重警告

- **第一步**：出库按钮旁显示红色「风险」标签，鼠标悬停显示警告提示
- **第二步**：点击出库后，弹窗显示强警告信息，明确告知风险
- **第三步**：必须填写「强行出库原因」方可继续操作

#### 2. 数据标记

所有强行出库操作将被永久标记，包含以下信息：

| 字段 | 说明 |
|------|------|
| `isForceOutbound` | 出库日志标记为 `true` |
| `forceReason` | 记录操作员填写的强行出库原因 |
| `isRiskOutbound` | 藏品批次标记为 `true` |
| `riskReason` | 藏品批次记录风险原因 |

#### 3. 视觉标识

- 藏品列表中，强行出库的批次显示醒目的 **「风险出库」红色标签**
- 除湿机详情页中，待除霜期间的出库记录高亮显示
- 所有风险出库记录可追溯，永不删除

#### 4. 责任追溯

- 永久记录操作人姓名、操作时间、藏品批次、强行出库原因
- 可作为后续藏品损坏事故的责任认定依据

#### 5. 业务建议

强烈建议遵循以下流程：

1. 先在「待除霜待办」页完成除霜确认
2. 待除湿机状态恢复为「正常」后
3. 再进行藏品出库登记

---

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 后端 | Express 4 + TypeScript |
| 数据库 | PostgreSQL 15 |
| ORM | Prisma 5 |
| 状态管理 | Zustand 5 |
| 路由 | React Router 7 |
| 图表 | Recharts 2 |
| 图标 | Lucide React |
| 部署 | Docker Compose 3.8 |

## 快速开始

### 方式一：Docker Compose 部署（推荐）

```bash
# 1. 克隆项目
git clone <repository-url>
cd ych-0531-1

# 2. 复制环境变量
cp .env.example .env

# 3. 启动服务
docker-compose up -d --build

# 4. 访问应用
# 前端: http://localhost:8080
# 后端 API: http://localhost:8080/api
```

### 方式二：本地开发

#### 前置要求

- Node.js >= 18
- pnpm >= 9
- PostgreSQL >= 15

#### 安装依赖

```bash
pnpm install
```

#### 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，配置数据库连接
```

#### 初始化数据库

```bash
# 生成 Prisma Client
pnpm run prisma:generate

# 运行数据库迁移并插入演示数据
pnpm run db:init
```

#### 启动开发服务

```bash
# 同时启动前端和后端
pnpm run dev

# 前端: http://localhost:5173
# 后端: http://localhost:3001
```

## 项目结构

```
ych-0531-1/
├── api/                    # 后端代码
│   ├── routes/            # API 路由
│   ├── services/          # 业务逻辑
│   └── lib/               # 工具库
├── src/                   # 前端代码
│   ├── pages/             # 页面组件
│   ├── components/        # 通用组件
│   ├── store/             # 状态管理
│   └── utils/             # 工具函数
├── prisma/                # 数据库模型
│   ├── schema.prisma      # 数据模型定义
│   └── seed.ts            # 演示数据
├── scripts/               # 脚本
├── docker-compose.yml     # Docker Compose 配置
├── Dockerfile.backend     # 后端镜像
├── Dockerfile.frontend    # 前端镜像
└── nginx.conf             # Nginx 配置
```

## API 接口

### 除湿机管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dehumidifiers` | 获取除湿机列表 |
| GET | `/api/dehumidifiers/:id` | 获取单台除湿机详情 |
| GET | `/api/dehumidifiers/:id/humidity` | 获取湿度历史数据 |
| POST | `/api/dehumidifiers/:id/confirm-defrost` | 确认除霜完成 |

### 待除霜待办

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/defrost-todo` | 获取待除霜列表 |
| POST | `/api/defrost-todo/batch-confirm` | 批量确认除霜 |

### 藏品批次

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/collections` | 获取藏品批次列表 |
| POST | `/api/collections/:id/inspect` | 登记抽检记录 |
| POST | `/api/collections/:id/outbound` | 登记出库 |
| GET | `/api/collections/check-outbound-allowed/:id` | 检查是否允许出库 |

### 湿度记录

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/humidity` | 录入湿度数据 |

## 演示数据说明

系统预置以下演示数据：

- **除湿机**：3 台（1 台处于「待除霜」状态）
- **湿度记录**：过去 72 小时，每小时 1 条
- **藏品批次**：6 个批次，分布在不同制冷区间
- **抽检记录**：每批次最新抽检结果
- **除霜历史**：历史除霜记录

### 演示场景

1. **除湿机列表**：可看到 1 台红色闪烁的「待除霜」设备
2. **湿度趋势图**：查看 72 小时湿度变化，观察连续高湿度
3. **待除霜待办**：确认除霜，解除锁定
4. **出库登记**：
   - 尝试出库「待除霜」设备下的藏品，体验强行出库流程
   - 确认除霜后，再出库同批次，体验正常流程

## 开发命令

| 命令 | 说明 |
|------|------|
| `pnpm run dev` | 启动前后端开发服务 |
| `pnpm run client:dev` | 仅启动前端 |
| `pnpm run server:dev` | 仅启动后端 |
| `pnpm run build` | 构建前端 |
| `pnpm run build:server` | 构建后端 |
| `pnpm run check` | TypeScript 类型检查 |
| `pnpm run lint` | ESLint 检查 |
| `pnpm run prisma:generate` | 生成 Prisma Client |
| `pnpm run db:init` | 初始化数据库（迁移 + 种子数据） |

## 常见问题

### Q: 如何修改除霜间隔和湿度阈值？

修改 `api/services/defrostService.ts` 中的常量：

```typescript
const OVERDUE_HOURS = 6;           // 超期间隔小时数
const HUMIDITY_THRESHOLD = 58;     // 湿度阈值
const CONSECUTIVE_HIGH_COUNT = 3;  // 连续高湿度次数
```

### Q: 演示数据会被清空吗？

`pnpm run db:init` 会重置数据库并重新插入演示数据。生产环境请使用 `pnpm run prisma:deploy`。

### Q: 如何备份数据？

```bash
# Docker 环境
docker exec -t postgres pg_dump -U archive_user archive_db > backup.sql

# 恢复
docker exec -i postgres psql -U archive_user archive_db < backup.sql
```

## License

MIT
