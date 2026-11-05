import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAdmin } from '@/components/auth/RequireAdmin';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { lazyNamed } from './lazyNamed';

const DashboardPage = lazyNamed(() => import('@/pages/admin/DashboardPage'), 'DashboardPage');
const AnalyticsPage = lazyNamed(() => import('@/pages/admin/AnalyticsPage'), 'AnalyticsPage');
const ProductsPage = lazyNamed(() => import('@/pages/admin/ProductsPage'), 'ProductsPage');
const ProductFormPage = lazyNamed(() => import('@/pages/admin/ProductFormPage'), 'ProductFormPage');
const CategoriesPage = lazyNamed(() => import('@/pages/admin/CategoriesPage'), 'CategoriesPage');
const InventoryPage = lazyNamed(() => import('@/pages/admin/InventoryPage'), 'InventoryPage');
const OrdersPage = lazyNamed(() => import('@/pages/admin/OrdersPage'), 'OrdersPage');
const OrderDetailPage = lazyNamed(() => import('@/pages/admin/OrderDetailPage'), 'OrderDetailPage');
const CustomersPage = lazyNamed(() => import('@/pages/admin/CustomersPage'), 'CustomersPage');
const PaymentsPage = lazyNamed(() => import('@/pages/admin/PaymentsPage'), 'PaymentsPage');
const RefundsPage = lazyNamed(() => import('@/pages/admin/RefundsPage'), 'RefundsPage');
const CouponsPage = lazyNamed(() => import('@/pages/admin/CouponsPage'), 'CouponsPage');
const ReviewsPage = lazyNamed(() => import('@/pages/admin/ReviewsPage'), 'ReviewsPage');
const SupportPage = lazyNamed(() => import('@/pages/admin/SupportPage'), 'SupportPage');
const ContentPage = lazyNamed(() => import('@/pages/admin/ContentPage'), 'ContentPage');
const SettingsPage = lazyNamed(() => import('@/pages/admin/SettingsPage'), 'SettingsPage');

// Everything under /admin except the login page requires an ADMIN session (RequireAdmin).
// The API enforces the same rule on every /admin request.
export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<AdminLoginPage />} />
      <Route element={<RequireAdmin />}>
        <Route index element={<DashboardPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/:id/edit" element={<ProductFormPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="refunds" element={<RefundsPage />} />
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="content" element={<ContentPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
