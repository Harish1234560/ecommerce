import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { AccountLayout } from '@/layouts/AccountLayout';
import { StoreLayout } from '@/layouts/StoreLayout';
import { CategoryPage } from '@/pages/store/CategoryPage';
import HomePage from '@/pages/store/HomePage';
import { ProductsPage } from '@/pages/store/ProductsPage';
import { SearchPage } from '@/pages/store/SearchPage';
import { lazyNamed } from './lazyNamed';

// The landing and listing pages ship in the main bundle; everything else is loaded on demand.
const ProductDetailPage = lazy(() => import('@/pages/store/ProductDetailPage'));
const CartPage = lazyNamed(() => import('@/pages/store/CartPage'), 'CartPage');
const WishlistPage = lazyNamed(() => import('@/pages/store/WishlistPage'), 'WishlistPage');
const CheckoutAddressPage = lazyNamed(() => import('@/pages/store/CheckoutAddressPage'), 'CheckoutAddressPage');
const CheckoutSummaryPage = lazyNamed(() => import('@/pages/store/CheckoutSummaryPage'), 'CheckoutSummaryPage');
const CheckoutPaymentPage = lazyNamed(() => import('@/pages/store/CheckoutPaymentPage'), 'CheckoutPaymentPage');
const OrderSuccessPage = lazyNamed(() => import('@/pages/store/OrderSuccessPage'), 'OrderSuccessPage');
const OrdersPage = lazyNamed(() => import('@/pages/store/OrdersPage'), 'OrdersPage');
const OrderDetailPage = lazyNamed(() => import('@/pages/store/OrderDetailPage'), 'OrderDetailPage');
const OrderTrackingPage = lazyNamed(() => import('@/pages/store/OrderTrackingPage'), 'OrderTrackingPage');
const ProfilePage = lazyNamed(() => import('@/pages/store/ProfilePage'), 'ProfilePage');
const AddressesPage = lazy(() => import('@/pages/store/AddressesPage'));
const NotificationsPage = lazyNamed(() => import('@/pages/store/NotificationsPage'), 'NotificationsPage');
const ReviewsPage = lazyNamed(() => import('@/pages/store/ReviewsPage'), 'ReviewsPage');
const LoginPage = lazyNamed(() => import('@/pages/store/LoginPage'), 'LoginPage');
const RegisterPage = lazyNamed(() => import('@/pages/store/RegisterPage'), 'RegisterPage');
const ForgotPasswordPage = lazyNamed(() => import('@/pages/store/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyNamed(() => import('@/pages/store/ResetPasswordPage'), 'ResetPasswordPage');
const AboutPage = lazyNamed(() => import('@/pages/store/AboutPage'), 'AboutPage');
const ContactPage = lazyNamed(() => import('@/pages/store/ContactPage'), 'ContactPage');
const PolicyPage = lazyNamed(() => import('@/pages/store/PolicyPage'), 'PolicyPage');
const OffersPage = lazyNamed(() => import('@/pages/store/OffersPage'), 'OffersPage');
const NotFoundPage = lazyNamed(() => import('@/pages/store/NotFoundPage'), 'NotFoundPage');
const AdminRoutes = lazy(() => import('./AdminRoutes'));

export function AppRoutes() {
  return (
    <Routes>
      {/* Admin dashboard: its own layout, palette and bundle */}
      <Route path="/admin/*" element={<AdminRoutes />} />

      <Route element={<StoreLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="category/:slug" element={<CategoryPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="product/:slug" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="return-policy" element={<PolicyPage slug="return-policy" />} />
        <Route path="shipping-policy" element={<PolicyPage slug="shipping-policy" />} />
        <Route path="privacy" element={<PolicyPage slug="privacy" />} />
        <Route path="terms" element={<PolicyPage slug="terms" />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />

        {/* Signed-in customers only */}
        <Route element={<RequireAuth />}>
          <Route path="checkout" element={<CheckoutSummaryPage />} />
          <Route path="checkout/address" element={<CheckoutAddressPage />} />
          <Route path="checkout/payment" element={<CheckoutPaymentPage />} />
          <Route path="order/success/:orderId" element={<OrderSuccessPage />} />
          <Route element={<AccountLayout />}>
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="account" element={<Navigate to="/account/profile" replace />} />
            <Route path="account/profile" element={<ProfilePage />} />
            <Route path="account/orders" element={<OrdersPage />} />
            <Route path="account/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="account/orders/:orderId/tracking" element={<OrderTrackingPage />} />
            <Route path="account/addresses" element={<AddressesPage />} />
            <Route path="account/notifications" element={<NotificationsPage />} />
            <Route path="account/reviews" element={<ReviewsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
