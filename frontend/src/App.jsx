import { Route, Routes } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';
import { AdminRoute, GuestOnlyRoute, PrivateRoute, ShopperRoute } from './routes/guards';
import Home from './pages/Home';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import AccountLayout from './pages/account/AccountLayout';
import Profile from './pages/account/Profile';
import ChangePassword from './pages/account/ChangePassword';
import MyOrders from './pages/account/MyOrders';
import MyOrderDetail from './pages/account/MyOrderDetail';
import Favorites from './pages/account/Favorites';
import Dashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import Contacts from './pages/admin/Contacts';
import Inbox from './pages/admin/Inbox';
import Orders from './pages/admin/Orders';
import OrderDetail from './pages/admin/OrderDetail';
import Products from './pages/admin/Products';
import ProductForm from './pages/admin/ProductForm';
import Catalog from './pages/admin/Catalog';
import AiAssistant from './pages/admin/AiAssistant';

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route element={<ShopperRoute />}>
          <Route path="/cart" element={<Cart />} />
        </Route>

        <Route element={<GuestOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>
        {/* Link trong email: mở được cả khi đang đăng nhập */}
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<PrivateRoute />}>
          {/* Thanh toán: phải đăng nhập + là khách hàng */}
          <Route element={<ShopperRoute />}>
            <Route path="/checkout" element={<Checkout />} />
          </Route>
          <Route path="/account" element={<AccountLayout />}>
            <Route index element={<Profile />} />
            <Route path="password" element={<ChangePassword />} />
            <Route element={<ShopperRoute />}>
              <Route path="orders" element={<MyOrders />} />
              <Route path="orders/:id" element={<MyOrderDetail />} />
              <Route path="favorites" element={<Favorites />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id" element={<ProductForm />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="ai" element={<AiAssistant />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="users" element={<Users />} />
          <Route path="contacts" element={<Contacts />} />
        </Route>
      </Route>
    </Routes>
  );
}
