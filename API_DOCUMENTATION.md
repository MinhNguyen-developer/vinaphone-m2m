# Tài liệu API – Hệ thống Quản lý SIM M2M Vinaphone

> **Mục đích:** Tài liệu này mô tả các API endpoint và cấu trúc dữ liệu cần thiết để tích hợp dashboard quản lý SIM M2M với hệ thống Vinaphone.

---

## 1. Thông tin chung

| Thông tin      | Mô tả                                     |
| -------------- | ----------------------------------------- |
| Base URL       | `https://api.vinaphone.vn/m2m/v1` (ví dụ) |
| Authentication | Bearer Token (JWT hoặc API Key)           |
| Content-Type   | `application/json`                        |
| Encoding       | UTF-8                                     |

---

## 2. API Danh sách SIM M2M

### `GET /sims`

Lấy danh sách toàn bộ SIM M2M đang được quản lý.

#### Query Parameters (không bắt buộc)

| Tham số         | Kiểu    | Mô tả                                            |
| --------------- | ------- | ------------------------------------------------ |
| `page`          | integer | Trang hiện tại (mặc định: 1)                     |
| `pageSize`      | integer | Số bản ghi mỗi trang (mặc định: 50, tối đa: 200) |
| `productCode`   | string  | Lọc theo mã sản phẩm (vd: `vina1200`)            |
| `status`        | string  | Lọc theo trạng thái hệ thống (vd: `ACTIVE`)      |
| `masterSimCode` | string  | Lọc SIM theo mã SIM chủ (vd: `m2m3`)             |

#### Response – Cấu trúc dữ liệu mỗi SIM

```json
{
  "data": [
    {
      "phoneNumber": "0901000001",
      "imsi": "452040901000001",
      "contractCode": "HDK-2025-0001",
      "productCode": "vina1200",
      "masterSimCode": "m2m3",
      "systemStatus": "ACTIVE",
      "createdAt": "2025-02-20",
      "firstUsedAt": "2025-03-01 08:00",
      "usedMB": 512
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 50
}
```

#### Mô tả từng field bắt buộc

| Field           | Kiểu              | Bắt buộc | Mô tả                                                                                |
| --------------- | ----------------- | -------- | ------------------------------------------------------------------------------------ |
| `phoneNumber`   | string            | ✅       | Số điện thoại SIM (10 chữ số, bắt đầu bằng 09)                                       |
| `imsi`          | string            | ✅       | Số nhận dạng thuê bao quốc tế – 15 chữ số (452 + 04 + số thuê bao)                   |
| `contractCode`  | string            | ✅       | Mã hợp đồng duy nhất giữa Vinaphone và khách hàng                                    |
| `productCode`   | string            | ✅       | Mã gói sản phẩm đang dùng (vd: `vina1200`, `vina1201`...)                            |
| `masterSimCode` | string            | ✅       | Mã SIM chủ quản lý SIM thành viên này (vd: `m2m3`, `m2m4`, `m2m7`)                   |
| `systemStatus`  | string            | ✅       | Trạng thái từ hệ thống Vinaphone: `ACTIVE`, `INACTIVE`, `PENDING`, `SUSPENDED`       |
| `createdAt`     | string (ISO date) | ✅       | Ngày SIM được thêm vào hệ thống (`YYYY-MM-DD`)                                       |
| `firstUsedAt`   | string (datetime) | ❌       | Thời điểm SIM phát sinh dung lượng lần đầu (`YYYY-MM-DD HH:mm`). Trống nếu chưa dùng |
| `usedMB`        | number            | ✅       | Dung lượng data đã sử dụng trong chu kỳ hiện tại (đơn vị: MB)                        |

#### Giá trị `systemStatus`

| Giá trị     | Ý nghĩa                      |
| ----------- | ---------------------------- |
| `ACTIVE`    | SIM đang hoạt động trên mạng |
| `INACTIVE`  | SIM chưa kích hoạt / đã tắt  |
| `PENDING`   | SIM đang chờ kích hoạt       |
| `SUSPENDED` | SIM đã bị tạm khóa           |

---

## 3. API Lịch sử sử dụng dung lượng

### `GET /sims/{phoneNumber}/usage-history`

Lấy lịch sử sử dụng dung lượng theo tháng của một SIM.

#### Path Parameter

| Tham số       | Bắt buộc | Mô tả                         |
| ------------- | -------- | ----------------------------- |
| `phoneNumber` | ✅       | Số điện thoại SIM cần tra cứu |

#### Query Parameters

| Tham số     | Kiểu   | Mô tả                                           |
| ----------- | ------ | ----------------------------------------------- |
| `fromMonth` | string | Từ tháng: `YYYY-MM` (mặc định: 6 tháng trước)   |
| `toMonth`   | string | Đến tháng: `YYYY-MM` (mặc định: tháng hiện tại) |

#### Response

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

#### Mô tả field

| Field              | Kiểu   | Bắt buộc | Mô tả                               |
| ------------------ | ------ | -------- | ----------------------------------- |
| `phoneNumber`      | string | ✅       | Số điện thoại                       |
| `imsi`             | string | ✅       | IMSI của SIM                        |
| `history`          | array  | ✅       | Mảng dữ liệu theo tháng             |
| `history[].month`  | string | ✅       | Tháng theo định dạng `YYYY-MM`      |
| `history[].usedMB` | number | ✅       | Dung lượng đã dùng trong tháng (MB) |

---

## 4. API SIM chủ (Master SIM)

### `GET /master-sims`

Lấy danh sách SIM chủ và thông tin gói dung lượng.

#### Response

```json
{
  "data": [
    {
      "code": "m2m3",
      "phoneNumber": "0901900003",
      "packageName": "Gói M2M Business 50GB",
      "packageCapacityMB": 51200,
      "usedMB": 3660,
      "description": "SIM chủ cho nhóm doanh nghiệp"
    }
  ]
}
```

#### Mô tả field

| Field               | Kiểu   | Bắt buộc | Mô tả                                                  |
| ------------------- | ------ | -------- | ------------------------------------------------------ |
| `code`              | string | ✅       | Mã SIM chủ duy nhất (vd: `m2m3`, `m2m4`, `m2m7`)       |
| `phoneNumber`       | string | ✅       | Số điện thoại SIM chủ                                  |
| `packageName`       | string | ✅       | Tên gói cước đang đăng ký                              |
| `packageCapacityMB` | number | ✅       | Tổng dung lượng gói (MB). Vd: 51200 = 50GB             |
| `usedMB`            | number | ✅       | Tổng dung lượng đã dùng bởi tất cả SIM thành viên (MB) |
| `description`       | string | ❌       | Mô tả thêm về SIM chủ                                  |

> **Lưu ý:** Dung lượng còn lại = `packageCapacityMB - usedMB`

---

## 5. API Danh sách SIM thành viên của SIM chủ

### `GET /master-sims/{code}/members`

Lấy danh sách các SIM thành viên thuộc một SIM chủ.

#### Path Parameter

| Tham số | Bắt buộc | Mô tả                   |
| ------- | -------- | ----------------------- |
| `code`  | ✅       | Mã SIM chủ (vd: `m2m3`) |

#### Response

Cùng cấu trúc với `GET /sims` nhưng chỉ trả về SIM có `masterSimCode` khớp với `code`.

---

## 6. Tóm tắt field quan trọng cần Vinaphone cung cấp

Bảng dưới đây tổng hợp tất cả field **bắt buộc** cần có trong response API để dashboard hiển thị đầy đủ:

### 6.1 Đối với mỗi SIM M2M

| Field           | Mô tả                                | Dùng ở đâu                         |
| --------------- | ------------------------------------ | ---------------------------------- |
| `phoneNumber`   | Số điện thoại 10 số                  | Toàn bộ hệ thống                   |
| `imsi`          | Số IMSI 15 chữ số                    | Danh sách SIM, tìm kiếm            |
| `contractCode`  | Mã hợp đồng                          | Danh sách SIM, xuất file           |
| `productCode`   | Mã sản phẩm/gói                      | Danh sách SIM, lọc nhóm            |
| `masterSimCode` | Mã SIM chủ quản lý                   | SIM chủ → xem SIM thành viên       |
| `systemStatus`  | Trạng thái hệ thống Vinaphone        | Hiển thị cột "Trạng thái hệ thống" |
| `createdAt`     | Ngày thêm vào hệ thống               | Danh sách SIM, lọc                 |
| `firstUsedAt`   | Thời điểm dùng lần đầu (có thể null) | Cột "Thời gian kích hoạt"          |
| `usedMB`        | Dung lượng đã dùng (MB) trong chu kỳ | Cảnh báo, biểu đồ, tiến độ         |

### 6.2 Đối với mỗi SIM chủ (Master SIM)

| Field               | Mô tả                             | Dùng ở đâu                             |
| ------------------- | --------------------------------- | -------------------------------------- |
| `code`              | Mã SIM chủ (`m2m3`, `m2m4`...)    | Trang SIM chủ, liên kết SIM thành viên |
| `phoneNumber`       | Số điện thoại SIM chủ             | Trang SIM chủ                          |
| `packageName`       | Tên gói cước                      | Trang SIM chủ                          |
| `packageCapacityMB` | Tổng dung lượng gói (MB)          | Thanh tiến độ, tính còn lại            |
| `usedMB`            | Dung lượng đã dùng tổng cộng (MB) | Công thức: còn lại = tổng − đã dùng    |

### 6.3 Đối với lịch sử sử dụng

| Field    | Mô tả                       | Dùng ở đâu                |
| -------- | --------------------------- | ------------------------- |
| `month`  | Tháng (`YYYY-MM`)           | Trục X biểu đồ            |
| `usedMB` | Dung lượng trong tháng (MB) | Biểu đồ cột, bảng lịch sử |

---

## 7. Cấu trúc trạng thái SIM trong hệ thống quản lý

Hệ thống dashboard sử dụng **trạng thái quản lý nội bộ** (khác với `systemStatus` từ API Vinaphone):

| Trạng thái       | Tiếng Anh   | Điều kiện chuyển                                                                                                                     |
| ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Mới**          | `NEW`       | SIM vừa được thêm vào hệ thống, chưa phát sinh dung lượng                                                                            |
| **Đã hoạt động** | `ACTIVE`    | SIM phát sinh dung lượng lần đầu → hệ thống tự động chuyển + ghi nhận `firstUsedAt`                                                  |
| **Đã xác nhận**  | `CONFIRMED` | Admin kiểm tra danh sách SIM đã hoạt động và xác nhận thông tin → chuyển trạng thái thủ công                                         |
| **Reset → Mới**  | `NEW`       | Khách không dùng nữa, admin reset → trạng thái về "Mới". Nếu SIM phát sinh dung lượng sau reset → tự động chuyển sang "Đã hoạt động" |

---

## 8. Lưu ý kỹ thuật

1. **Polling/Refresh:** Dashboard cần gọi API định kỳ để cập nhật `usedMB` (gợi ý: mỗi 5–15 phút).
2. **Pagination:** Nếu số lượng SIM lớn (>5000), API cần hỗ trợ phân trang bắt buộc.
3. **IMSI unique:** Đảm bảo mỗi IMSI là duy nhất trong hệ thống.
4. **usedMB đơn vị:** Thống nhất đơn vị MB (megabyte, 1 GB = 1024 MB).
5. **Timezone:** Tất cả datetime trả về theo múi giờ Việt Nam (`UTC+7`), định dạng `YYYY-MM-DD HH:mm:ss`.
6. **Encoding:** Response JSON phải encoding UTF-8 (quan trọng cho tiếng Việt).
