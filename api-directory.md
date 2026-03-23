# MajdataNet API 接口目录

本文档整理了项目中所有使用 `apiroot3` 的API接口。`apiroot3` 的值为 `/api3/api`，所以完整URL为 `/api3/api` + 相对路径。

## 账户相关 API

### 登录

- **路径**: `/account/Login`
- **方法**: POST
- **参数**: FormData 包含 `username`, `password` (MD5加密), `rememberMe`
- **用途**: 用户登录
- **文件**: `src/pages/LoginPage.tsx`

### OTP 验证

- **路径**: `/account/verify`
- **方法**: GET
- **参数**: 查询参数 `otp`
- **用途**: OTP 验证
- **文件**: `src/pages/LoginPage.tsx`

### 登出

- **路径**: `/account/Logout`
- **方法**: POST
- **用途**: 用户登出
- **文件**: `src/utils/authUtils.ts`

### 获取用户信息

- **路径**: `/account/info/`
- **方法**: GET
- **用途**: 获取当前用户信息
- **文件**: `src/hooks/useUser.ts`

### 上传头像

- **路径**: `/account/Icon`
- **方法**: POST
- **参数**: FormData 包含 `pic` (图片文件)
- **用途**: 上传用户头像
- **文件**: `src/components/AvatarUploader.tsx`

### 获取头像

- **路径**: `/account/Icon`
- **方法**: GET
- **参数**: 查询参数 `username`
- **用途**: 获取用户头像
- **文件**: `src/components/AvatarUploader.tsx`

### 获取个人分数

- **路径**: `/account/scores`
- **方法**: GET
- **用途**: 获取用户的个人分数记录
- **文件**: `src/pages/PersonalScoresPage.tsx`

## 谱面相关 API

### 获取谱面列表

- **路径**: `/maichart/list`
- **方法**: GET
- **参数**: 可选查询参数 `sort`, `search`, `isRanking`
- **用途**: 获取谱面列表，支持排序、搜索和排行榜筛选
- **文件**: `src/pages/HomePage.tsx`, `src/pages/RankingPage.tsx`, `src/pages/EventTagPage.tsx`

### 获取谱面详情

- **路径**: `/maichart/{songid}`
- **方法**: GET
- **用途**: 获取特定谱面的基本信息
- **文件**: `src/utils/scrollUtils.ts`

### 获取谱面图表

- **路径**: `/maichart/{songid}/chart`
- **方法**: GET
- **用途**: 下载谱面图表文件
- **文件**: `src/utils/scrollUtils.ts`, `src/utils/download.ts`

### 获取谱面音频

- **路径**: `/maichart/{songid}/track`
- **方法**: GET
- **用途**: 下载谱面音频文件
- **文件**: `src/utils/scrollUtils.ts`, `src/utils/download.ts`

### 获取谱面图片

- **路径**: `/maichart/{songid}/image`
- **方法**: GET
- **参数**: 可选查询参数 `fullImage`
- **用途**: 下载谱面封面图片
- **文件**: `src/utils/scrollUtils.ts`, `src/utils/download.ts`

### 获取谱面视频

- **路径**: `/maichart/{songid}/video`
- **方法**: GET
- **用途**: 下载谱面背景视频
- **文件**: `src/utils/scrollUtils.ts`, `src/utils/download.ts`

## 总结

- **总API数量**: 12个
- **账户API**: 7个
- **谱面API**: 5个 (包含子路径)
- **主要HTTP方法**: GET (8个), POST (4个)
- **认证方式**: 大部分API使用 `credentials: 'include'` 或 `withCredentials: true` 进行Cookie认证</content>
<parameter name="filePath">c:\Users\Vanillaaaa\Desktop\MajdataNet\api-directory.md
