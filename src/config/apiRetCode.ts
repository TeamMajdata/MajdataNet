/**
 * API返回码常量定义
 * 与后端 mmfcapi 的 `ApiReturnCode` 枚举（src/WebApplication2/Types/ApiReturnCode.cs）保持一致。
 * 4XXXX 为请求错误（前三位对应最接近的 HTTP 状态码），6XXXX 为账号错误。
 */

export const CODE_SUCCESS = 114514;
export const CODE_ERROR = -114514;

// 请求错误 4XXXX
export const CODE_INVALID_VALUE = 40000;
export const CODE_PAYLOAD_REQUIRED = 40001;
export const CODE_TOO_MANY_ELEMENTS = 40002;
export const CODE_NO_SUCH_ITEM = 40400;
export const CODE_ITEM_ALREADY_EXISTS = 40900;
export const CODE_ITEM_DELETED = 41000;
export const CODE_PAYLOAD_TOO_LARGE = 41300;
export const CODE_FORMAT_NOT_SUPPORTED = 41500;
export const CODE_TOO_MANY_REQUESTS = 42900;

// 账号错误 6XXXX
export const CODE_NOT_LOGGED_IN = 60000;
export const CODE_ALREADY_LOGGED_IN = 60001;
export const CODE_PERMISSION_DENIED = 60002;
export const CODE_INVALID_CREDENTIALS = 60003;
export const CODE_LOGIN_FAILED_PENDING_VERIFCATION = 60004;
export const CODE_LOGIN_FAILED_USER_BANNED = 60005;

export const CODE_INVALID_INVITE_CODE = 60100;
export const CODE_PASSWORD_IS_EMPTY = 60101;
export const CODE_INVALID_EMAIL_ADDRESS = 60102;
export const CODE_USERNAME_ALREADY_EXISTS = 60103;
export const CODE_EMAIL_ALREADY_EXISTS = 60104;
