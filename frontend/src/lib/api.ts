import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// API base URL - uses environment variable in production (Amplify)
// Falls back to production API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://timetableapi.trixno.com/api/v1';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Clear tokens and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login/', { email, password }),

  register: (data: any) => api.post('/auth/register/', data),

  logout: () => api.post('/auth/logout/'),

  me: () => api.get('/auth/me/'),

  refresh: (refresh: string) => api.post('/auth/refresh/', { refresh }),

  changePassword: (oldPassword: string, newPassword: string, confirmPassword: string) =>
    api.post('/auth/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
};

// Organization API
export const orgApi = {
  getSchools: () => api.get('/org/schools/'),
  getSchool: (id: string) => api.get(`/org/schools/${id}/`),
  createSchool: (data: any) => api.post('/org/schools/', data),
  updateSchool: (id: string, data: any) => api.patch(`/org/schools/${id}/`, data),
  deleteSchool: (id: string) => api.delete(`/org/schools/${id}/`),

  getBranches: () => api.get('/org/branches/'),
  getBranch: (id: string) => api.get(`/org/branches/${id}/`),
  createBranch: (data: any) => api.post('/org/branches/', data),
  updateBranch: (id: string, data: any) => api.patch(`/org/branches/${id}/`, data),
  deleteBranch: (id: string) => api.delete(`/org/branches/${id}/`),
};

// Academics API
export const academicsApi = {
  // Sessions
  getSessions: () => api.get('/academics/sessions/'),
  getSession: (id: string) => api.get(`/academics/sessions/${id}/`),
  createSession: (data: any) => api.post('/academics/sessions/', data),
  updateSession: (id: string, data: any) => api.patch(`/academics/sessions/${id}/`, data),
  deleteSession: (id: string) => api.delete(`/academics/sessions/${id}/`),

  // Shifts
  getShifts: () => api.get('/academics/shifts/'),
  getShift: (id: string) => api.get(`/academics/shifts/${id}/`),
  createShift: (data: any) => api.post('/academics/shifts/', data),
  updateShift: (id: string, data: any) => api.patch(`/academics/shifts/${id}/`, data),
  deleteShift: (id: string) => api.delete(`/academics/shifts/${id}/`),

  // Grades
  getGrades: () => api.get('/academics/grades/'),
  getGrade: (id: string) => api.get(`/academics/grades/${id}/`),
  createGrade: (data: any) => api.post('/academics/grades/', data),
  updateGrade: (id: string, data: any) => api.patch(`/academics/grades/${id}/`, data),
  deleteGrade: (id: string) => api.delete(`/academics/grades/${id}/`),

  // Sections
  getSections: (params?: { grade?: string }) => api.get('/academics/sections/', { params }),
  getSection: (id: string) => api.get(`/academics/sections/${id}/`),
  createSection: (data: any) => api.post('/academics/sections/', data),
  updateSection: (id: string, data: any) => api.patch(`/academics/sections/${id}/`, data),
  deleteSection: (id: string) => api.delete(`/academics/sections/${id}/`),

  // Subjects
  getSubjects: () => api.get('/academics/subjects/'),
  getSubject: (id: string) => api.get(`/academics/subjects/${id}/`),
  createSubject: (data: any) => api.post('/academics/subjects/', data),
  updateSubject: (id: string, data: any) => api.patch(`/academics/subjects/${id}/`, data),
  deleteSubject: (id: string) => api.delete(`/academics/subjects/${id}/`),

  // Teachers
  getTeachers: () => api.get('/academics/teachers/'),
  getTeacher: (id: string) => api.get(`/academics/teachers/${id}/`),
  createTeacher: (data: any) => api.post('/academics/teachers/', data),
  updateTeacher: (id: string, data: any) => api.patch(`/academics/teachers/${id}/`, data),
  deleteTeacher: (id: string) => api.delete(`/academics/teachers/${id}/`),

  // Period Templates
  getPeriodTemplates: () => api.get('/academics/period-templates/'),
  getPeriodTemplate: (id: string) => api.get(`/academics/period-templates/${id}/`),
  createPeriodTemplate: (data: any) => api.post('/academics/period-templates/', data),
  updatePeriodTemplate: (id: string, data: any) => api.patch(`/academics/period-templates/${id}/`, data),
  deletePeriodTemplate: (id: string) => api.delete(`/academics/period-templates/${id}/`),

  // Assignments
  getAssignments: () => api.get('/academics/assignments/'),
  getAssignment: (id: string) => api.get(`/academics/assignments/${id}/`),
  createAssignment: (data: any) => api.post('/academics/assignments/', data),
  updateAssignment: (id: string, data: any) => api.patch(`/academics/assignments/${id}/`, data),
  deleteAssignment: (id: string) => api.delete(`/academics/assignments/${id}/`),
};

// Timetable API
export const timetableApi = {
  getTimetables: () => api.get('/timetables/'),
  getTimetable: (id: string) => api.get(`/timetables/${id}/`),
  generateTimetable: (data: any) => api.post('/timetables/generate/', data),
  publishTimetable: (id: string, data: any) => api.post(`/timetables/${id}/publish/`, data),

  // Versions
  getVersions: (id: string) => api.get(`/timetables/${id}/versions/`),
  getVersion: (id: string, versionId: string) => api.get(`/timetables/${id}/versions/${versionId}/`),
  restoreVersion: (id: string, versionId: string) => api.post(`/timetables/${id}/restore/${versionId}/`),

  // Substitutions
  getSubstitutions: (id: string) => api.get(`/timetables/${id}/substitutions/`),
  createSubstitution: (id: string, data: any) => api.post(`/timetables/${id}/substitutions/`, data),
  deleteSubstitution: (id: string, subId: string) => api.delete(`/timetables/${id}/substitutions/${subId}/`),
};

// Export API
export const exportApi = {
  exportPdf: (id: string, params: { scope: string; entity_id?: string }) =>
    api.get(`/exports/timetables/${id}/pdf/`, { params, responseType: 'blob' }),

  exportExcel: (id: string, params: { scope: string; entity_id?: string }) =>
    api.get(`/exports/timetables/${id}/excel/`, { params, responseType: 'blob' }),

  timetable: (id: string, format: string, scope: string, entityId?: string) =>
    api.get(`/exports/timetables/${id}/${format}/`, {
      params: { scope, entity_id: entityId },
      responseType: 'blob',
    }),

  template: (templateType: string) =>
    api.get(`/exports/templates/${templateType}/`, { responseType: 'blob' }),
};

// Audit API
export const auditApi = {
  getLogs: (params?: { entity_type?: string; entity_id?: string }) =>
    api.get('/audit/logs/', { params }),
  logs: (params?: { action?: string; model_type?: string }) =>
    api.get('/audit/logs/', { params }),
  summary: () => api.get('/audit/summary/'),
};

// Users API
export const usersApi = {
  getUsers: () => api.get('/auth/users/'),
  getUser: (id: string) => api.get(`/auth/users/${id}/`),
  createUser: (data: any) => api.post('/auth/users/', data),
  updateUser: (id: string, data: any) => api.patch(`/auth/users/${id}/`, data),
  deleteUser: (id: string) => api.delete(`/auth/users/${id}/`),
  // CRUD aliases
  list: () => api.get('/auth/users/'),
  get: (id: string) => api.get(`/auth/users/${id}/`),
  create: (data: any) => api.post('/auth/users/', data),
  update: (id: string, data: any) => api.patch(`/auth/users/${id}/`, data),
  delete: (id: string) => api.delete(`/auth/users/${id}/`),
  activate: (id: string) => api.post(`/auth/users/${id}/activate/`),
  deactivate: (id: string) => api.post(`/auth/users/${id}/deactivate/`),
};

// Alias exports with CRUD naming convention (list, get, create, update, delete)
export const timetablesApi = {
  ...timetableApi,
  list: timetableApi.getTimetables,
  get: timetableApi.getTimetable,
  generate: timetableApi.generateTimetable,
  publish: timetableApi.publishTimetable,
  versions: (id: string) => api.get(`/timetables/${id}/versions/`),
  restore: (id: string, versionId: string, data: { change_note: string }) =>
    api.post(`/timetables/${id}/restore/${versionId}/`, data),
};
export const exportsApi = exportApi;
export const branchesApi = {
  ...orgApi,
  list: orgApi.getBranches,
  get: orgApi.getBranch,
  create: orgApi.createBranch,
  update: orgApi.updateBranch,
  delete: orgApi.deleteBranch,
};
export const schoolsApi = {
  list: orgApi.getSchools,
  get: orgApi.getSchool,
  create: orgApi.createSchool,
  update: orgApi.updateSchool,
  delete: orgApi.deleteSchool,
};
export const sessionsApi = {
  list: academicsApi.getSessions,
  get: academicsApi.getSession,
  create: academicsApi.createSession,
  update: academicsApi.updateSession,
  delete: academicsApi.deleteSession,
  setCurrent: (id: string) => api.post(`/academics/sessions/${id}/set-current/`),
};
export const shiftsApi = {
  list: academicsApi.getShifts,
  get: academicsApi.getShift,
  create: academicsApi.createShift,
  update: academicsApi.updateShift,
  delete: academicsApi.deleteShift,
};
export const seasonsApi = {
  list: () => api.get('/academics/seasons/'),
  get: (id: string) => api.get(`/academics/seasons/${id}/`),
  create: (data: any) => api.post('/academics/seasons/', data),
  update: (id: string, data: any) => api.patch(`/academics/seasons/${id}/`, data),
  delete: (id: string) => api.delete(`/academics/seasons/${id}/`),
};
export const gradesApi = {
  list: academicsApi.getGrades,
  get: academicsApi.getGrade,
  create: academicsApi.createGrade,
  update: academicsApi.updateGrade,
  delete: academicsApi.deleteGrade,
};
export const sectionsApi = {
  list: (params?: { grade?: string; branch?: string }) => api.get('/academics/sections/', { params }),
  get: academicsApi.getSection,
  create: academicsApi.createSection,
  update: academicsApi.updateSection,
  delete: academicsApi.deleteSection,
};
export const subjectsApi = {
  list: (params?: { branch?: string }) => api.get('/academics/subjects/', { params }),
  get: academicsApi.getSubject,
  create: academicsApi.createSubject,
  update: academicsApi.updateSubject,
  delete: academicsApi.deleteSubject,
};
export const teachersApi = {
  list: (params?: { branch?: string }) => api.get('/academics/teachers/', { params }),
  get: academicsApi.getTeacher,
  create: academicsApi.createTeacher,
  update: academicsApi.updateTeacher,
  delete: academicsApi.deleteTeacher,
  import: (file: File, branchId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('branch', branchId);
    return api.post('/academics/teachers/import/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  markDeparted: (id: string, data: any) => api.post(`/academics/teachers/${id}/mark-departed/`, data),
  replace: (data: any) => api.post('/academics/teachers/replace/', data),
};
export const periodTemplatesApi = {
  list: academicsApi.getPeriodTemplates,
  get: academicsApi.getPeriodTemplate,
  create: academicsApi.createPeriodTemplate,
  update: academicsApi.updatePeriodTemplate,
  delete: academicsApi.deletePeriodTemplate,
  duplicate: (id: string, name: string) =>
    api.post(`/academics/period-templates/${id}/duplicate/`, { name }),
};
export const assignmentsApi = {
  list: academicsApi.getAssignments,
  get: academicsApi.getAssignment,
  create: academicsApi.createAssignment,
  update: academicsApi.updateAssignment,
  delete: academicsApi.deleteAssignment,
  import: (file: File, branchId: string, sessionId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('branch', branchId);
    formData.append('session', sessionId);
    return api.post('/academics/assignments/import/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
export const substitutionsApi = {
  list: () => api.get('/substitutions/'),
  get: (id: string) => api.get(`/substitutions/${id}/`),
  create: (data: any) => api.post('/substitutions/', data),
  update: (id: string, data: any) => api.patch(`/substitutions/${id}/`, data),
  delete: (id: string) => api.delete(`/substitutions/${id}/`),
  cancel: (id: string) => api.post(`/substitutions/${id}/cancel/`),
  active: () => api.get('/substitutions/active/'),
  teacherSchedule: (timetableId: string, teacherId: string, dayOfWeek: number) =>
    api.get(`/timetables/${timetableId}/teacher-schedule/`, { params: { teacher: teacherId, day_of_week: dayOfWeek } }),
  availableTeachers: (timetableId: string, dayOfWeek: number, periodNumbers: number[]) =>
    api.get(`/timetables/${timetableId}/available-teachers/`, { params: { day_of_week: dayOfWeek, periods: periodNumbers.join(',') } }),
  markAbsent: (data: any) => api.post('/substitutions/mark-absent/', data),
};
export const timetableEntriesApi = {
  list: (timetableId: string) => api.get(`/timetables/${timetableId}/entries/`),
  get: (entryId: string) => api.get(`/timetable-entries/${entryId}/`),
  create: (timetableId: string, data: any) => api.post(`/timetables/${timetableId}/entries/`, data),
  update: (entryId: string, data: any) => api.patch(`/timetable-entries/${entryId}/`, data),
  delete: (entryId: string) => api.delete(`/timetable-entries/${entryId}/`),
};

export default api;
