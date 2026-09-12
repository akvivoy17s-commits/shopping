import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../../../backend/firebase";
import "./Cart.css";

function Cart() {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);


  // =====================================================
// BUY THIS PRODUCT
// =====================================================

const handleBuyNow = (productId) => {
  if (!productId) {
    console.error("❌ Product ID missing");
    return;
  }

  navigate(`/buy/${productId}`);
};

const handleProductClick = (productId) => {
  if (!productId) {
    console.error("❌ Product ID missing");
    return;
  }

  navigate(`/product/${productId}`);
};


  // =====================================================
  // REAL-TIME CART DATA
  // =====================================================


  useEffect(() => {
  const user = auth.currentUser;

  if (!user) {
    setCartItems([]);
    setLoading(false);
    return;
  }

  const cartRef = collection(
    db,
    "users",
    user.uid,
    "cart"
  );

  const unsubscribe = onSnapshot(
    cartRef,
    (snapshot) => {

      const items = snapshot.docs.map((cartDoc) => {
        const data = cartDoc.data();

        return {
          id: cartDoc.id,

          // IMPORTANT:
          // This is the actual products document ID
          productId: data.productId,

          name: data.name || "",
          price: Number(data.price || 0),
          image: data.image || "",
          imageUrl: data.imageUrl || "",
          quantity: Number(data.quantity || 1),
          brand: data.brand || "",
          category: data.category || "",
          description: data.description || "",
          stock: Number(data.stock || 0),
        };
      });

      console.log("🛒 CART ITEMS:", items);

      setCartItems(items);
      setLoading(false);
    },
    (error) => {
      console.error("❌ Cart error:", error);
      setLoading(false);
    }
  );

  return () => unsubscribe();

}, []);
  // useEffect(() => {
  //   const user = auth.currentUser;

  //   if (!user) {
  //     setCartItems([]);
  //     setLoading(false);
  //     return;
  //   }

  //   const cartRef = collection(
  //     db,
  //     "users",
  //     user.uid,
  //     "cart"
  //   );

  //   const unsubscribe = onSnapshot(
  //     cartRef,
  //     (snapshot) => {
  //       const items = snapshot.docs.map((cartDoc) => ({
  //         id: cartDoc.id,
  //         ...cartDoc.data(),
  //       }));

  //       setCartItems(items);
  //       setLoading(false);
  //     },
  //     (error) => {
  //       console.error("❌ Cart error:", error);
  //       setLoading(false);
  //     }
  //   );

  //   return () => unsubscribe();
  // }, []);

  // =====================================================
  // UPDATE QUANTITY
  // =====================================================

  const updateQuantity = async (item, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      const user = auth.currentUser;

      if (!user) {
        navigate("/login");
        return;
      }

      const itemRef = doc(
        db,
        "users",
        user.uid,
        "cart",
        item.id
      );

      await updateDoc(itemRef, {
        quantity: newQuantity,
      });
    } catch (error) {
      console.error(
        "❌ Quantity update error:",
        error
      );
    }
  };

  // =====================================================
  // REMOVE PRODUCT
  // =====================================================

  const removeItem = async (itemId) => {
    try {
      const user = auth.currentUser;

      if (!user) {
        navigate("/login");
        return;
      }

      const itemRef = doc(
        db,
        "users",
        user.uid,
        "cart",
        itemId
      );

      await deleteDoc(itemRef);
    } catch (error) {
      console.error(
        "❌ Remove cart item error:",
        error
      );
    }
  };

  // =====================================================
  // PRICE CALCULATION
  // =====================================================

  const subtotal = cartItems.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) *
        Number(item.quantity || 1),
    0
  );

  const deliveryCharge =
    subtotal > 0 ? 0 : 0;

  const total = subtotal + deliveryCharge;

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="cart-loading">
        <div className="cart-spinner"></div>
        <p>Loading your cart...</p>
      </div>
    );
  }

  // =====================================================
  // LOGIN CHECK
  // =====================================================

  if (!auth.currentUser) {
    return (
      <div className="empty-cart">
        <div className="empty-cart-icon">
          🛒
        </div>

        <h2>Please Login</h2>

        <p>
          Login to view the products in your cart.
        </p>

        <button
          onClick={() => navigate("/login")}
        >
          Login
        </button>
      </div>
    );
  }

  // =====================================================
  // EMPTY CART
  // =====================================================

  if (cartItems.length === 0) {
    return (
      <div className="empty-cart">
        <div className="empty-cart-icon">
          🛒
        </div>

        <h2>Your Cart is Empty</h2>

        <p>
          Looks like you haven't added anything
          to your cart yet.
        </p>

        <button
          onClick={() => navigate("/")}
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  // =====================================================
  // CART UI
  // =====================================================

  return (
    <div className="cart-page">

      {/* HEADER */}

      <div className="cart-header">
        <h1>Shopping Cart</h1>

        <span>
          {cartItems.length}{" "}
          {cartItems.length === 1
            ? "Item"
            : "Items"}
        </span>
      </div>

      <div className="cart-container" >

        {/* LEFT */}

        <section className="cart-items">

        {cartItems.map((item) => (
  <div
    className="cart-item"
    key={item.id}
    onClick={() => handleProductClick(item.productId)}
    style={{ cursor: "pointer" }}
  >

    {/* IMAGE */}
    <div className="cart-image">
      {item.image ? (
        <img
          src={item.image}
          alt={item.name}
        />
      ) : (
        <div className="no-cart-image">
          📦
        </div>
      )}
    </div>

              {/* PRODUCT INFO */}

              <div className="cart-product-info">

                <h2>
                  {item.name}
                </h2>

                {item.brand && (
                  <p className="cart-brand">
                    {item.brand}
                  </p>
                )}

                {item.category && (
                  <p className="cart-category">
                    {item.category}
                  </p>
                )}

                <div className="cart-price">

                  ₹
                  {Number(
                    item.price || 0
                  ).toLocaleString("en-IN")}

                </div>

                {/* QUANTITY */}

                <div className="cart-actions">

                  <div className="cart-quantity">

                    {/* <button
                      onClick={() =>
                        updateQuantity(
                          item,
                          Number(item.quantity) - 1
                        )
                      }
                      disabled={
                        Number(item.quantity) <= 1
                      }
                    >
                      −
                    </button> */}
                    <button
  onClick={(e) => {
    e.stopPropagation();

    updateQuantity(
      item,
      Number(item.quantity) - 1
    );
  }}
  disabled={Number(item.quantity) <= 1}
>
  −
</button>

                    <span>
                      {item.quantity}
                    </span>

                    <button
  onClick={(e) => {
    e.stopPropagation();

    updateQuantity(
      item,
      Number(item.quantity) + 1
    );
  }}
>
  +
</button>

                  </div>

                  <button
  className="remove-btn"
  onClick={(e) => {
    e.stopPropagation();
    removeItem(item.id);
  }}
>
  🗑 Remove
</button>

                </div>

              </div>

              {/* ITEM TOTAL */}

              <div className="cart-item-total">

                ₹
                {(
                  Number(item.price || 0) *
                  Number(item.quantity || 1)
                ).toLocaleString("en-IN")}

              </div>

            </div>

          ))}

        </section>

        {/* RIGHT - SUMMARY */}

        <aside className="cart-summary">

          <h2>Price Details</h2>

          <div className="summary-row">

            <span>
              Price (
              {cartItems.reduce(
                (total, item) =>
                  total +
                  Number(item.quantity || 1),
                0
              )}{" "}
              Items)
            </span>

            <strong>
              ₹
              {subtotal.toLocaleString("en-IN")}
            </strong>

          </div>

          <div className="summary-row">

            <span>
              Delivery
            </span>

            <strong className="free">
              FREE
            </strong>

          </div>

          <div className="summary-divider"></div>

          <div className="summary-total">

            <span>
              Total Amount
            </span>

            <strong>
              ₹
              {total.toLocaleString("en-IN")}
            </strong>

          </div>

          <p className="saving-text">
            🎉 You are getting FREE delivery
          </p>

          {/* <button
            className="checkout-btn"
            onClick={() =>{handleBuyNow}
            }
          >
            Proceed to Buy
          </button> */}

<button
  className="checkout-btn"
  onClick={() => {
    if (cartItems.length > 0) {
      navigate("/buy", {
        state: {
          cartItems: cartItems,
        },
      });
    }
  }}
>
  Proceed to Buy
</button>

          <button
            className="continue-shopping"
            onClick={() =>
              navigate("/")
            }
          >
            Continue Shopping
          </button>

        </aside>

      </div>
    </div>
  );
}

export default Cart;
