import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Athuntiction/Login";
import Home from "./pages/Home/Home";
import Addproducts from "./pages/Addproduct/Addproducts";
import SuperAdmin from "./pages/SuperAdmin/SuperAdmin";
import ProductDetails from "./pages/Products/ProductDetails";
import Profile from "./pages/profile/Profile";
import Admin from './pages/Admin/Admin'
import BuyNow from "./pages/BuyNow/BuyNow";
import Cart from "./pages/Cart/Cart";
import Wishlist from "./pages/Wishlist/Wishlist";
import Category from "./pages/Category/Category";
import Address from "./pages/Address/Address";
import Orders from "./pages/Orders/Orders";
import AdminOrder from "./pages/Adminorder/Adminorder";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home/>} />
        <Route path="/add-pro" element={<Addproducts/>}/>
        <Route path="/super-admin" element={<SuperAdmin/>}/>
        <Route path="/pro-details" element={<ProductDetails/>}/>
        <Route path="/profile" element={<Profile/>} />
        <Route path="/admin" element={<Admin/>} />
        <Route path="/product/:id" element={<ProductDetails/>} />
        <Route path="/buy/:productId" element={<BuyNow/>} />
        <Route  path="/buy"  element={<BuyNow />}/>
        <Route path="/cart" element={<Cart/>} />
        <Route path="/wish" element={<Wishlist/>} />
        <Route path="/address" element={<Address/>} />
        <Route path="/cate/:categoryName" element={<Category/>} />
        <Route path="/orders" element={<Orders />}/>
        <Route path="/ad-order" element={<AdminOrder/>} />
        <Route path="*" element={<Navigate to="/" replace/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
