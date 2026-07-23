import axiosClient from './axiosClient'

export const authApi = {
  register: (data) => axiosClient.post('/auth/register', data),
  login: (data) => axiosClient.post('/auth/login', data),
  logout: () => axiosClient.post('/auth/logout'),
  me: () => axiosClient.get('/auth/me'),
}

export const familyApi = {
  create: (data) => axiosClient.post('/families/create', data),
  join: (data) => axiosClient.post('/families/join', data),
  myJournals: () => axiosClient.get('/families/my-journals'),
  switchJournal: (familyId) => axiosClient.post(`/families/switch/${familyId}`),
  uploadBabyAvatar: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return axiosClient.post('/families/current/baby-avatar', fd, {
      timeout: 120000,
    })
  },
  getMembers: () => axiosClient.get('/families/members'),
  changeMemberRole: (memberId, role) => axiosClient.patch(`/families/members/${memberId}/role`, { role }),
  removeMember: (memberId) => axiosClient.delete(`/families/members/${memberId}`),
  deleteCurrent: () => axiosClient.delete('/families/current'),
}

export const profileApi = {
  get: () => axiosClient.get('/profile'),
  update: (data) => axiosClient.patch('/profile', data),
  uploadAvatar: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return axiosClient.post('/profile/avatar', fd, {
      timeout: 120000,
    })
  },
}

export const trackingApi = {
  log: (data) => axiosClient.post('/tracking/log', data),
  update: (id, data) => axiosClient.put(`/tracking/${id}`, data),
  delete: (id) => axiosClient.delete(`/tracking/${id}`),
  daily: (date) => axiosClient.get(`/tracking/daily?date=${date}`),
}

export const healthApi = {
  list: (type, subjectId) =>
    axiosClient.get('/health-records', {
      params: { type: type || undefined, subjectId: subjectId || undefined },
    }),
  upcoming: (days = 60) => axiosClient.get(`/health-records/upcoming?days=${days}`),
  analyzeImport: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return axiosClient.post('/health-records/import/analyze', fd, { timeout: 120000 })
  },
  create: (data) => axiosClient.post('/health-records', data),
  update: (id, data) => axiosClient.put(`/health-records/${id}`, data),
  delete: (id) => axiosClient.delete(`/health-records/${id}`),
}

export const healthSubjectApi = {
  list: () => axiosClient.get('/health-subjects'),
  create: (data) => axiosClient.post('/health-subjects', data),
  delete: (id) => axiosClient.delete(`/health-subjects/${id}`),
}

export const mediaApi = {
  feed: (page = 0, size = 10) => axiosClient.get(`/media/feed?page=${page}&size=${size}`),

  /** Upload image/video directly (multipart, no AWS) */
  upload: (file, caption = '') => {
    const fd = new FormData()
    fd.append('file', file)
    if (caption) fd.append('caption', caption)
    return axiosClient.post('/media/upload', fd, {
      timeout: 120000,
    })
  },

  /** Toggle reaction (like/unlike) on a post */
  react: (postId) => axiosClient.post(`/media/${postId}/react`),

  /** Get comments for a post */
  getComments: (postId) => axiosClient.get(`/media/${postId}/comments`),

  /** Post a comment */
  postComment: (postId, content) => axiosClient.post(`/media/${postId}/comments`, { content }),

  /** Delete a comment */
  deleteComment: (postId, commentId) => axiosClient.delete(`/media/${postId}/comments/${commentId}`),
}

// Dashboard
export const dashboardApi = {
  get: () => axiosClient.get('/home/dashboard'),
}

// Routines
export const routineApi = {
  list: () => axiosClient.get('/routines'),
  create: (data) => axiosClient.post('/routines', data),
  update: (id, data) => axiosClient.put(`/routines/${id}`, data),
  delete: (id) => axiosClient.delete(`/routines/${id}`),
  log: (id, data) => axiosClient.post(`/routines/${id}/log`, data),
  reschedule: (id, data) => axiosClient.patch(`/routines/${id}/reschedule`, data),
}

// Growth
export const growthApi = {
  record: (data) => axiosClient.post('/growth/record', data),
  history: (page = 0) => axiosClient.get(`/growth/history?page=${page}&size=20`),
  latest: () => axiosClient.get('/growth/latest'),
  nutritionSuggestions: () => axiosClient.get('/growth/nutrition-suggestions'),
}

// Vaccination
export const vaccinationApi = {
  list: () => axiosClient.get('/vaccinations'),
  create: (data) => axiosClient.post('/vaccinations', data),
  complete: (id, data) => axiosClient.post(`/vaccinations/${id}/complete`, data),
  uncomplete: (id) => axiosClient.post(`/vaccinations/${id}/uncomplete`),
  delete: (id) => axiosClient.delete(`/vaccinations/${id}`),
}

// Care Tips
export const careTipApi = {
  today: () => axiosClient.get('/care/today'),
}

// Comments
export const commentApi = {
  list: (postId) => axiosClient.get(`/media/${postId}/comments`),
  create: (postId, data) => axiosClient.post(`/media/${postId}/comments`, data),
  delete: (postId, commentId) => axiosClient.delete(`/media/${postId}/comments/${commentId}`),
}

// AI Caption
export const aiApi = {
  caption: (imageUrl) => axiosClient.post('/ai/caption', { imageUrl }),
  chat: (data) => axiosClient.post('/ai/chat', data, { timeout: 60000 }),
}

// Streaks
export const streakApi = {
  get: () => axiosClient.get('/streaks'),
}

// Notifications
export const notificationApi = {
  list: (page = 0) => axiosClient.get(`/notifications?page=${page}&size=20`),
  markRead: (id) => axiosClient.patch(`/notifications/${id}/read`),
  markAllRead: () => axiosClient.patch('/notifications/read-all'),
  unreadCount: () => axiosClient.get('/notifications/unread-count'),
}


