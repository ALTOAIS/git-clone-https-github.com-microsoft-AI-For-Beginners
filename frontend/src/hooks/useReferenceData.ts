import { useQuery } from '@tanstack/react-query';
import { businessProcessesApi, categoriesApi, companiesApi, departmentsApi, usersApi } from '../api/endpoints';

export function useCompanies() {
  return useQuery({ queryKey: ['companies'], queryFn: () => companiesApi.list().then((r) => r.data) });
}

export function useDepartments(companyId?: string) {
  return useQuery({
    queryKey: ['departments', companyId ?? 'all'],
    queryFn: () => departmentsApi.list(companyId).then((r) => r.data),
  });
}

export function useBusinessProcesses(departmentId?: string) {
  return useQuery({
    queryKey: ['business-processes', departmentId ?? 'all'],
    queryFn: () => businessProcessesApi.list(departmentId).then((r) => r.data),
    enabled: !!departmentId,
  });
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list().then((r) => r.data) });
}

export function useCategoryTree() {
  return useQuery({ queryKey: ['categories', 'tree'], queryFn: () => categoriesApi.tree().then((r) => r.data) });
}

export function useUsersList(role?: string) {
  return useQuery({
    queryKey: ['users', role ?? 'all'],
    queryFn: () => usersApi.list({ pageSize: 200, role }).then((r) => r.data),
  });
}
