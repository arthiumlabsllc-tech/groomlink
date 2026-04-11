import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminManagementApi, CreateAdminData } from '../api';

export function useAdmins(page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: ['admins', page, limit],
    queryFn: () => adminManagementApi.getAdmins(page, limit),
  });
}

export function useCreateAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdminData) => adminManagementApi.createAdmin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
  });
}

export function useUpdateAdminPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, pages }: { id: string; pages: string[] }) =>
      adminManagementApi.updatePermissions(id, pages),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
  });
}

export function useDeleteAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminManagementApi.deleteAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
  });
}
