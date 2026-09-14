export function apiErrorMessage(error) {
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return 'Máy chủ phản hồi quá lâu. Kéo xuống để thử lại.'
  }
  if (!error?.response) {
    return 'Chưa kết nối được máy chủ. Có thể máy chủ đang khởi động hoặc kết nối bị gián đoạn. Vui lòng thử lại sau ít phút.'
  }
  const status = error.response.status
  if ([502, 503, 504].includes(status)) return 'Máy chủ tạm thời chưa sẵn sàng hoặc phản hồi quá lâu. Vui lòng thử lại sau ít phút.'
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Tài khoản chưa có quyền truy cập dữ liệu này.'
  return `Máy chủ không tải được dữ liệu (HTTP ${status}). Kéo xuống để thử lại.`
}
