import { adminCategoryService } from '@/services/adminService';
import { useQuery } from '@tanstack/react-query';

export const useAdminCategories = () => useQuery({ queryKey: ['admin', 'categories'], queryFn: () => adminCategoryService.list() });
