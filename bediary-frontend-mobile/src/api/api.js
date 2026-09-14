import apiClient from './client'

export const authApi = {
  login: (data) => apiClient.post('/auth/login', data),
  register: (data) => apiClient.post('/auth/register', data),
  me: () => apiClient.get('/auth/me'),
  logout: () => apiClient.post('/auth/logout'),
}

export const familyApi = {
  linkBaby: (babyId) => apiClient.post(`/families/household/babies/${babyId}`),
  create: (data) => apiClient.post('/families/create', data),
  join: (data) => apiClient.post('/families/join', data),
  myJournals: () => apiClient.get('/families/my-journals'),
  switchJournal: (familyId) => apiClient.post(`/families/switch/${familyId}`),
  uploadBabyAvatar: (file) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post('/families/current/baby-avatar', form)
  },
  removeMember: (memberId) => apiClient.delete(`/families/members/${memberId}`),
  changeMemberRole: (memberId, role) => apiClient.patch(`/families/members/${memberId}/role`, { role }),
}

export const profileApi = {
  get: () => apiClient.get('/profile'),
  update: (data) => apiClient.patch('/profile', data),
  uploadAvatar: (file) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post('/profile/avatar', form)
  },
}

export const dashboardApi = {
  get: () => apiClient.get('/home/dashboard'),
}

export const trackingApi = {
  daily: (date) => apiClient.get(`/tracking/daily?date=${date}`),
  log: (data) => apiClient.post('/tracking/log', data),
  update: (id, data) => apiClient.put(`/tracking/${id}`, data),
  delete: (id) => apiClient.delete(`/tracking/${id}`),
}

export const growthApi = {
  update: (id, data) => apiClient.put(`/growth/${id}`, data),
  remove: (id) => apiClient.delete(`/growth/${id}`),
  latest: () => apiClient.get('/growth/latest'),
  history: (page = 0) => apiClient.get(`/growth/history?page=${page}&size=20`),
  record: (data) => apiClient.post('/growth/record', data),
  nutritionSuggestions: () => apiClient.get('/growth/nutrition-suggestions'),
}

export const vaccinationApi = {
  list: () => apiClient.get('/vaccinations'),
  create: (data) => apiClient.post('/vaccinations', data),
  update: (id, data) => apiClient.put(`/vaccinations/${id}`, data),
  complete: (id) => apiClient.post(`/vaccinations/${id}/complete`),
  uncomplete: (id) => apiClient.post(`/vaccinations/${id}/uncomplete`),
  delete: (id) => apiClient.delete(`/vaccinations/${id}`),
}

export const healthApi = {
  list: (type, subjectId) => apiClient.get('/health-records', { params: { type, subjectId } }),
  upcoming: (days = 60) => apiClient.get(`/health-records/upcoming?days=${days}`),
  analyzeImport: (file) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post('/health-records/import/analyze', form, { timeout: 120000 })
  },
  create: (data) => apiClient.post('/health-records', data),
  update: (id, data) => apiClient.put(`/health-records/${id}`, data),
  delete: (id) => apiClient.delete(`/health-records/${id}`),
}

export const healthSubjectApi = {
  list: () => apiClient.get('/health-subjects'),
  create: (data) => apiClient.post('/health-subjects', data),
  delete: (id) => apiClient.delete(`/health-subjects/${id}`),
}

export const aiApi = {
  chat: (data) => apiClient.post('/ai/chat', data, { timeout: 60000 }),
}

export const doctorChatApi = {
  messages: () => apiClient.get('/doctor-chat/messages'),
  send: (content) => apiClient.post('/doctor-chat/messages', { content }),
}

export const notificationApi = {
  unreadCount: () => apiClient.get('/notifications/unread-count'),
  list: (page = 0) => apiClient.get(`/notifications?page=${page}&size=20`),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
}
