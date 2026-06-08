## 1. 架构设计

```mermaid
graph TD
    A["React 前端 (Vite)"] --> B["Express API 服务"]
    B --> C["PostgreSQL 数据库"]
    D["Docker Compose"] --> A
    D --> B
    D --> C
    E["Nginx (反向代理)"] --> A
    E --> B
```

## 2. 技术描述

| 层级 | 技术选型 | 版本 | 说明 |
|------|----------|------|------|
| 前端 | React + TypeScript | 18.x | 核心前端框架 |
| 前端构建 | Vite | 5.x | 构建工具 |
| 样式 | Tailwind CSS | 3.x | 原子化 CSS |
| 状态管理 | Zustand | 4.x | 轻量状态管理 |
| 路由 | React Router | 6.x | 单页路由 |
| 图表 | Recharts | 2.x | 湿度折线图 |
| 图标 | Lucide React | 0.x | 图标库 |
| 后端 | Express + TypeScript | 4.x | API 服务 |
| 数据库 | PostgreSQL | 15.x | 关系型数据库 |
| ORM | Prisma | 5.x | 数据库访问层 |
| 部署 | Docker Compose | 2.x | 单机容器编排 |

## 3. 目录结构

```
.
├── docker-compose.yml          # Docker Compose 配置
├── Dockerfile.frontend         # 前端镜像构建
├── Dockerfile.backend          # 后端镜像构建
├── .env.example                # 环境变量示例
├── README.md                   # 项目说明文档
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── components/         # 通用组件
│   │   ├── pages/              # 页面组件
│   │   ├── store/              # Zustand 状态
│   │   ├── utils/              # 工具函数
│   │   ├── types/              # TypeScript 类型
│   │   ├── App.tsx             # 路由配置
│   │   └── main.tsx            # 入口文件
│   └── package.json
├── backend/                    # Express 后端
│   ├── src/
│   │   ├── routes/             # API 路由
│   │   ├── services/           # 业务逻辑
│   │   ├── middleware/         # 中间件
│   │   ├── prisma/             # Prisma Schema
│   │   └── server.ts           # 服务入口
│   └── package.json
└── scripts/                    # 初始化脚本
    └── init-data.sql           # 演示数据
```

## 4. 路由定义

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 除湿机列表 | 首页，展示所有除湿机设备 |
| `/dehumidifier/:id` | 除湿机详情 | 湿度折线图、除霜历史 |
| `/defrost-todo` | 待除霜待办 | 待除霜设备列表与确认 |
| `/collections` | 藏品批次管理 | 批次列表、出库登记 |
| `/data-entry` | 数据录入 | 湿度、抽检、除霜完成录入 |

## 5. API 定义

### 5.1 除湿机相关

```typescript
// GET /api/dehumidifiers
// 获取除湿机列表
interface Dehumidifier {
  id: number;
  name: string;
  code: string;
  defrostIntervalHours: number;
  lastDefrostAt: Date;
  status: 'normal' | 'pending_defrost';
  coolingZone: string;
  createdAt: Date;
}

// GET /api/dehumidifiers/:id
// 获取单台除湿机详情（含最近湿度数据）

// POST /api/dehumidifiers/:id/confirm-defrost
// 确认除霜完成
interface ConfirmDefrostRequest {
  operatorName: string;
  remark?: string;
}
```

### 5.2 湿度记录相关

```typescript
// GET /api/dehumidifiers/:id/humidity?hours=72
// 获取湿度历史数据
interface HumidityRecord {
  id: number;
  dehumidifierId: number;
  humidity: number;
  recordedAt: Date;
}

// POST /api/humidity
// 录入湿度数据
interface CreateHumidityRequest {
  dehumidifierId: number;
  humidity: number;
  recordedAt?: Date;
}
```

### 5.3 藏品批次相关

```typescript
// GET /api/collections
// 获取藏品批次列表
interface CollectionBatch {
  id: number;
  batchNo: string;
  name: string;
  dehumidifierId: number;  // 所属制冷区间
  paperWarpMm?: number;     // 纸张翘曲毫米数
  inspectionDate?: Date;
  inspectorName?: string;
  status: 'in_stock' | 'out_of_stock';
  isRiskOutbound: boolean;  // 是否风险出库
  riskReason?: string;
}

// POST /api/collections/:id/outbound
// 出库登记
interface OutboundRequest {
  operatorName: string;
  reason?: string;
}

// POST /api/collections/:id/inspect
// 抽检登记
interface InspectRequest {
  paperWarpMm: number;
  inspectionDate: Date;
  inspectorName: string;
}
```

### 5.4 待除霜逻辑

```typescript
// GET /api/defrost-todo
// 获取待除霜列表
interface DefrostTodo {
  dehumidifier: Dehumidifier;
  hoursOverdue: number;           // 超时时长
  consecutiveHighHumidity: number; // 连续高湿度次数
  affectedBatches: number;        // 受影响藏品批次数量
}

// 核心计算逻辑
function checkPendingDefrost(
  dehumidifier: Dehumidifier,
  recentHumidity: HumidityRecord[]
): boolean {
  const hoursSinceLastDefrost = 
    (Date.now() - dehumidifier.lastDefrostAt.getTime()) / 3600000;
  
  const isOverdue = hoursSinceLastDefrost > 
    dehumidifier.defrostIntervalHours + 6;
  
  const last3Records = recentHumidity.slice(-3);
  const allHighHumidity = last3Records.length >= 3 && 
    last3Records.every(r => r.humidity > 58);
  
  return isOverdue && allHighHumidity;
}
```

## 6. 数据模型

### 6.1 ER 图

```mermaid
erDiagram
    DEHUMIDIFIER ||--o{ HUMIDITY_RECORD : "records"
    DEHUMIDIFIER ||--o{ DEFROST_HISTORY : "has"
    DEHUMIDIFIER ||--o{ COLLECTION_BATCH : "cools"
    COLLECTION_BATCH ||--o{ OUTBOUND_LOG : "has"
    COLLECTION_BATCH ||--o{ INSPECTION_RECORD : "has"

    DEHUMIDIFIER {
        int id PK
        string name
        string code
        int defrost_interval_hours
        datetime last_defrost_at
        string status
        string cooling_zone
    }

    HUMIDITY_RECORD {
        int id PK
        int dehumidifier_id FK
        decimal humidity
        datetime recorded_at
    }

    DEFROST_HISTORY {
        int id PK
        int dehumidifier_id FK
        datetime completed_at
        string operator_name
        text remark
    }

    COLLECTION_BATCH {
        int id PK
        string batch_no
        string name
        int dehumidifier_id FK
        string status
        boolean is_risk_outbound
        text risk_reason
    }

    INSPECTION_RECORD {
        int id PK
        int collection_batch_id FK
        decimal paper_warp_mm
        date inspection_date
        string inspector_name
    }

    OUTBOUND_LOG {
        int id PK
        int collection_batch_id FK
        datetime outbound_at
        string operator_name
        boolean is_force_outbound
        text force_reason
    }
```

### 6.2 DDL 语句

```sql
-- 除湿机表
CREATE TABLE dehumidifier (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    defrost_interval_hours INTEGER NOT NULL,
    last_defrost_at TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'normal',
    cooling_zone VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 湿度记录表
CREATE TABLE humidity_record (
    id SERIAL PRIMARY KEY,
    dehumidifier_id INTEGER NOT NULL REFERENCES dehumidifier(id),
    humidity DECIMAL(5,2) NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_humidity_dehumidifier_time 
    ON humidity_record(dehumidifier_id, recorded_at DESC);

-- 除霜历史表
CREATE TABLE defrost_history (
    id SERIAL PRIMARY KEY,
    dehumidifier_id INTEGER NOT NULL REFERENCES dehumidifier(id),
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    operator_name VARCHAR(50) NOT NULL,
    remark TEXT
);

-- 藏品批次表
CREATE TABLE collection_batch (
    id SERIAL PRIMARY KEY,
    batch_no VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    dehumidifier_id INTEGER NOT NULL REFERENCES dehumidifier(id),
    status VARCHAR(20) NOT NULL DEFAULT 'in_stock',
    is_risk_outbound BOOLEAN NOT NULL DEFAULT FALSE,
    risk_reason TEXT
);

-- 抽检记录表
CREATE TABLE inspection_record (
    id SERIAL PRIMARY KEY,
    collection_batch_id INTEGER NOT NULL REFERENCES collection_batch(id),
    paper_warp_mm DECIMAL(5,2) NOT NULL,
    inspection_date DATE NOT NULL,
    inspector_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 出库日志表
CREATE TABLE outbound_log (
    id SERIAL PRIMARY KEY,
    collection_batch_id INTEGER NOT NULL REFERENCES collection_batch(id),
    outbound_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    operator_name VARCHAR(50) NOT NULL,
    is_force_outbound BOOLEAN NOT NULL DEFAULT FALSE,
    force_reason TEXT
);

CREATE INDEX idx_outbound_time ON outbound_log(outbound_at DESC);
```

### 6.3 演示数据

```sql
-- 除湿机数据
INSERT INTO dehumidifier (name, code, defrost_interval_hours, last_defrost_at, status, cooling_zone) VALUES
('一号除湿机', 'DH-001', 72, NOW() - INTERVAL '80 hours', 'pending_defrost', 'A区1-5列'),
('二号除湿机', 'DH-002', 72, NOW() - INTERVAL '36 hours', 'normal', 'A区6-10列'),
('三号除湿机', 'DH-003', 48, NOW() - INTERVAL '55 hours', 'normal', 'B区1-5列');

-- 湿度数据（72小时，每小时一条）
-- DH-001: 最后3条 > 58%
INSERT INTO humidity_record (dehumidifier_id, humidity, recorded_at)
SELECT 
    1,
    CASE 
        WHEN i < 70 THEN 55 + RANDOM()*3
        ELSE 59 + RANDOM()*2
    END,
    NOW() - INTERVAL '1 hour' * (72 - i)
FROM generate_series(1, 72) AS i;

-- 藏品批次
INSERT INTO collection_batch (batch_no, name, dehumidifier_id) VALUES
('BAT-2024-001', '清代古籍善本-经部', 1),
('BAT-2024-002', '民国档案-政府公文', 1),
('BAT-2024-003', '老照片集-1950s', 2),
('BAT-2024-004', '地方志丛书-江南卷', 2),
('BAT-2024-005', '名人手札-近代作家', 3),
('BAT-2024-006', '报纸合订本-申报', 3);

-- 抽检记录
INSERT INTO inspection_record (collection_batch_id, paper_warp_mm, inspection_date, inspector_name) VALUES
(1, 1.2, '2024-01-15', '张三'),
(2, 0.8, '2024-01-16', '李四'),
(3, 2.1, '2024-01-17', '王五'),
(4, 0.5, '2024-01-18', '张三'),
(5, 1.5, '2024-01-19', '李四'),
(6, 1.0, '2024-01-20', '王五');
```

## 7. Docker Compose 配置

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: archive_db
      POSTGRES_USER: archive_user
      POSTGRES_PASSWORD: archive_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-data.sql:/docker-entrypoint-initdb.d/init-data.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U archive_user"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.backend
    environment:
      DATABASE_URL: postgresql://archive_user:archive_password@postgres:5432/archive_db
      PORT: 3001
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "3001:3001"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.frontend
    environment:
      VITE_API_BASE_URL: http://localhost:3001/api
    depends_on:
      - backend
    ports:
      - "8080:80"

volumes:
  postgres_data:
```
