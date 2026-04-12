# Vinaphone M2M Dashboard – NestJS API Gateway

Backend API gateway cho hệ thống quản lý SIM M2M Vinaphone.  
Gateway này đứng giữa **React dashboard** và **API nội bộ của Vinaphone**, có nhiệm vụ xác thực, chuẩn hoá dữ liệu, lưu trạng thái quản lý nội bộ và cung cấp các endpoint cho frontend.

---

## Mục lục

1. [Kiến trúc tổng quan](#kiến-trúc-tổng-quan)
2. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
3. [Cài đặt](#cài-đặt)
4. [Biến môi trường](#biến-môi-trường)
5. [Cấu trúc project](#cấu-trúc-project)
6. [Modules & Endpoints](#modules--endpoints)
7. [Database Schema](#database-schema)
8. [Luồng trạng thái SIM](#luồng-trạng-thái-sim)
9. [Authentication](#authentication)
10. [Chạy ứng dụng](#chạy-ứng-dụng)
11. [Docker](#docker)
12. [Lưu ý kỹ thuật](#lưu-ý-kỹ-thuật)

---

## Kiến trúc tổng quan

```
React Dashboard  ►  NestJS API Gateway  ►  Vinaphone Internal API
                        |
                        v
                   PostgreSQL DB
              (trạng thái nội bộ, alert config,
               nhóm, lịch sử xác nhận)
```

- **React Dashboard** gọi toàn bộ qua NestJS – không gọi thẳng Vinaphone API.
- NestJS **proxy + cache** dữ liệu SIM từ Vinaphone, đồng thời lưu riêng trạng thái quản lý nội bộ (`Mới / Đã hoạt động / Đã xác nhận`), cấu hình cảnh báo, nhóm sản phẩm.
- Vinaphone API được gọi theo lịch (cron) hoặc on-demand để đồng bộ `usedMB`, `systemStatus`, `firstUsedAt`.

---

## Yêu cầu hệ thống

| Công cụ    | Phiên bản tối thiểu | Ghi chú                          |
| ---------- | ------------------- | -------------------------------- |
| Node.js    | 20.x LTS            | https://nodejs.org               |
| npm        | 10.x                | đi kèm Node.js                   |
| NestJS CLI | 10.x                | `npm i -g @nestjs/cli`           |
| PostgreSQL | 15.x                | Hoặc dùng Docker                 |
| Redis      | 7.x                 | Cache & queue (khuyến nghị)      |

---

## Cài đặt

```bash
# 1. Khởi tạo NestJS project
nest new vinaphone-m2m-api
cd vinaphone-m2m-api

# 2. Cài đặt các dependencies chính
npm install \
  @nestjs/config \
  @nestjs/typeorm typeorm pg \
  @nestjs/swagger swagger-ui-express \
  @nestjs/jwt @nestjs/passport passport passport-jwt \
  @nestjs/schedule \
  @nestjs/axios axios \
  @nestjs/cache-manager cache-manager \
  @nestjs/throttler \
  class-validator class-transformer \
  dayjs

# 3. Cài đặt dev dependencies
npm install -D \
  @types/passport-jwt \
  @types/node
```

---

## Biến môi trường

Tạo file `.env` ở root project:

```dotenv
# App
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
FRONTEND_URL=http://localhost:5173

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vinaphone_m2m
DB_USER=postgres
DB_PASS=postgres
DB_SYNC=true

# JWT
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRES_IN=8h

# Vinaphone Upstream API
VINAPHONE_API_BASE_URL=https://api.vinaphone.vn/m2m/v1
VINAPHONE_API_KEY=your_api_key_here
VINAPHONE_API_TIMEOUT_MS=10000

# Sync Schedule (công thức cron - mặc định 10 phút/lần)
SYNC_CRON=*/10 * * * *

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

> ⚠️ **Không commit file `.env`**. Dùng `.env.example` để chia sẻ cấu hình mẫu.

---

## Cấu trúc project

```
src/
├── app.module.ts
├── main.ts
│
├── config/                   # ConfigModule, validation schema
│   └── configuration.ts
│
├── auth/                     # JWT authentication
│   ├── auth.module.ts
│   ├── auth.controller.ts    # POST /auth/login
│   ├── auth.service.ts
│   ├── jwt.strategy.ts
│   └── dto/login.dto.ts
│
├── sims/                     # SIM M2M management
│   ├── sims.module.ts
│   ├── sims.controller.ts
│   ├── sims.service.ts
│   ├── entities/sim.entity.ts
│   └── dto/
│       ├── query-sim.dto.ts
│       └── update-sim-status.dto.ts
│
├── master-sims/              # SIM chủ
│   ├── master-sims.module.ts
│   ├── master-sims.controller.ts
│   ├── master-sims.service.ts
│   └── entities/master-sim.entity.ts
│
├── usage-history/            # Lịch sử sử dụng dung lượng
│   ├── usage-history.module.ts
│   ├── usage-history.controller.ts
│   ├── usage-history.service.ts
│   └── entities/usage-history.entity.ts
│
├── groups/                   # Nhóm SIM / sản phẩm
│   ├── groups.module.ts
│   ├── groups.controller.ts
│   ├── groups.service.ts
│   └── entities/group.entity.ts
│
├── alerts/                   # Cấu hình & theo dõi cảnh báo
│   ├── alerts.module.ts
│   ├── alerts.controller.ts
│   ├── alerts.service.ts
│   └── entities/alert-config.entity.ts
│
└── sync/                     # Cron job đồng bộ từ Vinaphone API
    ├── sync.module.ts
    └── sync.service.ts
```

---

## Modules & Endpoints

Tất cả endpoint đều yêu cầu **Bearer JWT token** trong header (trừ `POST /auth/login`).

```
Authorization: Bearer <token>
```

---

### `POST /auth/login`

Đăng nhập, nhận JWT token.

**Request body:**
```json
{ "username": "admin", "password": "your_password" }
```

**Response:**
```json
{ "access_token": "eyJhbGci...", "expires_in": "8h" }
```

---

### `GET /sims`

Lấy danh sách SIM M2M (merge Vinaphone API + trạng thái nội bộ).

**Query parameters:**

| Tham số         | Kiểu   | Mô tả                                                      |
| --------------- | ------ | ---------------------------------------------------------------- |
| `page`          | number | Trang (mặc định: 1)                                                |
| `pageSize`      | number | Số bản ghi/trang (mặc định: 50, tối đa: 200)                       |
| `productCode`   | string | Lọc theo mã sản phẩm                                           |
| `masterSimCode` | string | Lọc theo SIM chủ                                               |
| `systemStatus`  | string | `ACTIVE` / `INACTIVE` / `PENDING` / `SUSPENDED`                  |
| `status`        | string | Trạng thái nội bộ: `Mới` / `Đã hoạt động` / `Đã xác nhận`       |
| `search`        | string | Tìm theo SĐT, IMSI, hoặc mã hợp đồng                          |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "phoneNumber": "0901000001",
      "imsi": "452040901000001",
      "contractCode": "HDK-2025-0001",
      "productCode": "vina1200",
      "masterSimCode": "m2m3",
      "systemStatus": "ACTIVE",
      "status": "Đã xác nhận",
      "usedMB": 512,
      "firstUsedAt": "2025-03-01 08:00",
      "confirmedAt": "2025-03-02 10:00",
      "createdAt": "2025-02-20",
      "note": ""
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 50
}
```

---

### `PATCH /sims/:id/status`

Cập nhật trạng thái quản lý nội bộ của SIM.

**Request body:** `{ "action": "confirm" }` hoặc `{ "action": "reset" }`

| `action`  | Trạng thái kết quả | Điều kiện                                         |
| --------- | -------------------- | ----------------------------------------------- |
| `confirm` | `Đã xác nhận`         | SIM phải đang ở trạng thái `Đã hoạt động`          |
| `reset`   | `Mới`               | Xoá `firstUsedAt`, `confirmedAt`, `usedMB = 0`  |

---

### `PATCH /sims/:id/first-used-at`

Sửa thủ công thời gian kích hoạt.

**Request body:** `{ "firstUsedAt": "2025-03-01 08:00" }`

---

### `GET /sims/:phoneNumber/usage-history`

Lịch sử dung lượng theo tháng của một SIM.

**Query:** `fromMonth=YYYY-MM` & `toMonth=YYYY-MM`

**Response:**
```json
{
  "phoneNumber": "0901000001",
  "imsi": "452040901000001",
  "history": [
    { "month": "2025-01", "usedMB": 0 },
    { "month": "2025-02", "usedMB": 200 },
    { "month": "2025-03", "usedMB": 512 }
  ]
}
```

---

### `GET /master-sims`

Danh sách SIM chủ kèm dung lượng tổng / đã dùng / còn lại.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "m2m3",
      "phoneNumber": "0901900003",
      "packageName": "Gói M2M Business 50GB",
      "packageCapacityMB": 51200,
      "usedMB": 3660,
      "remainingMB": 47540,
      "description": "SIM chủ cho nhóm doanh nghiệp"
    }
  ]
}
```

> `remainingMB` = `packageCapacityMB - usedMB` (tính server-side)

---

### `GET /master-sims/:code/members`

Danh sách SIM thành viên thuộc SIM chủ. Cùng schema với `GET /sims`, lọc theo `masterSimCode = :code`.

---

### `GET /groups`

Danh sách nhóm SIM.

**Response:**
```json
{
  "data": [
    { "id": "g1", "name": "Khách hàng doanh nghiệp", "simCount": 4, "createdAt": "2025-01-01" }
  ]
}
```

---

### `GET /alerts`

Danh sách cấu hình cảnh báo.

**Response:**
```json
{
  "data": [
    { "id": "a1", "label": "Cảnh báo 1GB", "thresholdMB": 1024, "groupId": "g1", "simId": null, "productCode": null, "active": true }
  ]
}
```

---

### `GET /alerts/triggered`

Danh sách SIM đang **vượt ngưỡng** cảnh báo. Query: `?productCode=vina1200`

**Response:**
```json
{
  "data": [
    {
      "sim": { "phoneNumber": "0901000002", "usedMB": 1100, "productCode": "vina1200" },
      "alert": { "id": "a1", "label": "Cảnh báo 1GB", "thresholdMB": 1024 },
      "checked": false
    }
  ],
  "total": 3
}
```

---

### `PATCH /alerts/triggered/:simId/:alertId/check`

Đánh dấu cảnh báo đã được kiểm tra.

**Request body:** `{ "checked": true }`

---

## Database Schema

### Bảng `sims`

```sql
CREATE TABLE sims (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number    VARCHAR(15) NOT NULL UNIQUE,
  imsi            VARCHAR(15) UNIQUE,
  contract_code   VARCHAR(50),
  product_code    VARCHAR(50) NOT NULL,
  master_sim_code VARCHAR(20),
  system_status   VARCHAR(20),        -- Vinaphone: ACTIVE/INACTIVE/PENDING/SUSPENDED
  status          VARCHAR(30) NOT NULL DEFAULT 'Mới',
  used_mb         INTEGER     NOT NULL DEFAULT 0,
  first_used_at   TIMESTAMPTZ,
  confirmed_at    TIMESTAMPTZ,
  created_at      DATE        NOT NULL,
  note            TEXT,
  synced_at       TIMESTAMPTZ
);
```

### Bảng `usage_history`

```sql
CREATE TABLE usage_history (
  id       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  sim_id   UUID    NOT NULL REFERENCES sims(id) ON DELETE CASCADE,
  month    CHAR(7) NOT NULL,   -- YYYY-MM
  used_mb  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (sim_id, month)
);
```

### Bảng `master_sims`

```sql
CREATE TABLE master_sims (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code                VARCHAR(20)  NOT NULL UNIQUE,
  phone_number        VARCHAR(15)  NOT NULL UNIQUE,
  package_name        VARCHAR(100) NOT NULL,
  package_capacity_mb INTEGER      NOT NULL,
  used_mb             INTEGER      NOT NULL DEFAULT 0,
  description         TEXT,
  synced_at           TIMESTAMPTZ
);
```

### Bảng `groups` & `sim_groups`

```sql
CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  created_at  DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE sim_groups (
  sim_id   UUID NOT NULL REFERENCES sims(id)   ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (sim_id, group_id)
);
```

### Bảng `alert_configs`

```sql
CREATE TABLE alert_configs (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  label         VARCHAR(200) NOT NULL,
  threshold_mb  INTEGER      NOT NULL,
  sim_id        UUID REFERENCES sims(id)   ON DELETE CASCADE,
  group_id      UUID REFERENCES groups(id) ON DELETE CASCADE,
  product_code  VARCHAR(50),
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
  -- Chỉ được set 1 trong 3: sim_id / group_id / product_code
);
```

### Bảng `alert_checks`

```sql
CREATE TABLE alert_checks (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  sim_id     UUID    NOT NULL REFERENCES sims(id)          ON DELETE CASCADE,
  alert_id   UUID    NOT NULL REFERENCES alert_configs(id) ON DELETE CASCADE,
  checked    BOOLEAN NOT NULL DEFAULT false,
  checked_at TIMESTAMPTZ,
  checked_by VARCHAR(100),
  UNIQUE (sim_id, alert_id)
);
```

---

## Luồng trạng thái SIM

```
 +------------------+
 |       Mới        |  <-- SIM mới thêm vào hệ thống (usedMB = 0)
 +--------+---------+
          |  usedMB > 0 lần đầu (phát hiện qua sync cron)
          v
 +------------------+
 |  Đã hoạt động   |  <-- firstUsedAt được ghi nhận tự động
 +--------+---------+
          |  Admin xác nhận  PATCH /sims/:id/status { action: "confirm" }
          v
 +------------------+
 |  Đã xác nhận    |
 +--------+---------+
          |  Admin reset     PATCH /sims/:id/status { action: "reset" }
          v
 +------------------+
 |       Mới        |  <-- usedMB = 0, firstUsedAt/confirmedAt bị xoá
 +------------------+
          |  Nếu SIM phát sinh dung lượng sau reset --> tự động --> Đã hoạt động
```

**Logic trong `sync.service.ts`:**

```typescript
if (sim.status === 'Mới' && vinaphoneData.usedMB > 0) {
  sim.status = 'Đã hoạt động';
  sim.firstUsedAt = new Date();
  await this.simsRepository.save(sim);
}
```

---

## Authentication

- **JWT (HS256)** với `@nestjs/jwt` + `passport-jwt`
- Token hết hạn sau `JWT_EXPIRES_IN` (mặc định `8h`)
- `JwtAuthGuard` áp dụng global, trừ `POST /auth/login`

```typescript
// main.ts
const app = await NestFactory.create(AppModule);
app.useGlobalGuards(app.get(JwtAuthGuard));
app.enableCors({ origin: process.env.FRONTEND_URL });
app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1');
```

---

## Chạy ứng dụng

```bash
# Development (hot reload)
npm run start:dev

# Production
npm run build && npm run start:prod
```

Swagger UI (chỉ khi `NODE_ENV=development`): `http://localhost:3000/api/docs`

```typescript
// main.ts
if (process.env.NODE_ENV !== 'production') {
  const config = new DocumentBuilder()
    .setTitle('Vinaphone M2M API')
    .setDescription('API gateway cho hệ thống quản lý SIM M2M')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
}
```

---

## Docker

**`docker-compose.yml`:**

```yaml
version: '3.9'

services:
  api:
    build: .
    ports:
      - '3000:3000'
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: vinaphone_m2m
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

volumes:
  pgdata:
```

```bash
# Build và chạy toàn bộ stack
docker compose up --build

# Chỉ chạy DB + Redis (dev API chạy local)
docker compose up postgres redis
```

---

## Lưu ý kỹ thuật

| # | Lưu ý |
|---|-------|
| 1 | **Timezone:** Lưu DB theo UTC, trả về API format `YYYY-MM-DD HH:mm` theo `UTC+7`. Set `TZ=Asia/Ho_Chi_Minh` trong môi trường production. |
| 2 | **Encoding:** PostgreSQL dùng `ENCODING = 'UTF8'`. Response phải có `Content-Type: application/json; charset=utf-8`. |
| 3 | **Pagination:** Luôn phân trang. Không trả toàn bộ dữ liệu khi số lượng > 200 bản ghi. |
| 4 | **IMSI unique:** Index `UNIQUE` trên cột `imsi` trong bảng `sims`. |
| 5 | **usedMB đơn vị:** Thống nhất **MB** (`INTEGER`). 1 GB = 1024 MB. |
| 6 | **Sync cron:** `SyncService` dùng `@Cron(process.env.SYNC_CRON)`, gọi Vinaphone API, cập nhật `used_mb`/`system_status`, tự động chuyển trạng thái SIM khi `usedMB` thay đổi từ 0. |
| 7 | **CORS:** Cấu hình `FRONTEND_URL` trong `.env` để cho phép origin React dashboard. |
| 8 | **Rate limiting:** Dùng `@nestjs/throttler` bảo vệ các endpoint và tránh spam Vinaphone upstream API. |
| 9 | **master_sims.used_mb:** Tính lại mỗi lần sync = `SUM(sims.used_mb WHERE master_sim_code = code)`. |
