import { useEffect, useMemo, useState } from "react";

import {
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";

import {
  doc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import { db, auth } from "../../../backend/firebase";

import "./BuyNow.css";

function BuyNow() {
  const { productId } = useParams();

  const navigate = useNavigate();

  const location = useLocation();

  // =====================================================
  // CART ITEMS
  // =====================================================

  const passedCartItems = location.state?.cartItems || [];

  // =====================================================
  // STATES
  // =====================================================

  const [product, setProduct] = useState(null);

  const [loading, setLoading] = useState(Boolean(productId));

  const [placingOrder, setPlacingOrder] = useState(false);

  const [quantity, setQuantity] = useState(1);

  const [paymentMethod, setPaymentMethod] = useState("upi");

  const [utr, setUtr] = useState("");

  const [address, setAddress] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [hasSavedAddress, setHasSavedAddress] =
    useState(false);

  // =====================================================
  // FETCH SINGLE PRODUCT
  // =====================================================

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);

        const productRef = doc(
          db,
          "products",
          productId
        );

        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
          setProduct(null);
          return;
        }

        const data = productSnap.data();

        setProduct({
          id: productSnap.id,
          ...data,
          image:
            data.imageUrls?.[0] ||
            data.image ||
            data.imageUrl ||
            "",
        });
      } catch (error) {
        console.error("PRODUCT FETCH ERROR:", error);

        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          if (mounted) {
            setHasSavedAddress(false);
          }
          return;
        }

        try {
          const addressSnapshot = await getDocs(
            collection(
              db,
              "users",
              user.uid,
              "addresses"
            )
          );

          if (!mounted || addressSnapshot.empty) {
            return;
          }

          const savedAddresses = addressSnapshot.docs.map(
            (addressDoc) => ({
              id: addressDoc.id,
              ...addressDoc.data(),
            })
          );

          const savedAddress =
            savedAddresses.find(
              (item) => item.isDefault
            ) || savedAddresses[0];

          setAddress((previous) => ({
            ...previous,
            name: savedAddress.name || "",
            phone: savedAddress.phone || "",
            address: savedAddress.address || "",
            city: savedAddress.city || "",
            state: savedAddress.state || "",
            pincode: savedAddress.pincode || "",
          }));

          setHasSavedAddress(true);
        } catch (error) {
          console.error(
            "Saved address loading error:",
            error
          );
        }
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // =====================================================
  // CHECKOUT ITEMS
  // =====================================================

  const checkoutItems = useMemo(() => {
    // BUY NOW

    if (productId && product) {
      return [
        {
          id: product.id,

          productId: product.id,

          name:
            product.name ||
            product.title ||
            "",

          image:
            product.image ||
            product.imageUrls?.[0] ||
            product.imageUrl ||
            "",

          imageUrl:
            product.imageUrls?.[0] ||
            product.imageUrl ||
            product.image ||
            "",

          brand: product.brand || "",

          category: product.category || "",

          description: product.description || "",

          price: Number(product.price || 0),

          quantity: Number(quantity || 1),

          stock: Number(product.stock || 0),
        },
      ];
    }

    // CART CHECKOUT

    return passedCartItems
      .filter((item) => item)
      .map((item) => ({
        ...item,

        id: item.id || item.productId,

        productId:
          item.productId ||
          item.id,

        name:
          item.name ||
          item.title ||
          "",

        image:
          item.image ||
          item.imageUrl ||
          item.imageUrls?.[0] ||
          "",

        imageUrl:
          item.imageUrl ||
          item.imageUrls?.[0] ||
          item.image ||
          "",

        brand: item.brand || "",

        category: item.category || "",

        description: item.description || "",

        price: Number(item.price || 0),

        quantity: Number(item.quantity || 1),

        stock: Number(item.stock || 0),
      }));
  }, [
    productId,
    product,
    quantity,
    passedCartItems,
  ]);

  // =====================================================
  // SUBTOTAL
  // =====================================================

  const subtotal = useMemo(() => {
    return checkoutItems.reduce(
      (total, item) =>
        total +
        Number(item.price || 0) *
          Number(item.quantity || 1),
      0
    );
  }, [checkoutItems]);

  // =====================================================
  // DELIVERY
  // =====================================================

  const deliveryCharge =
    subtotal >= 1000 ? 0 : 100;

  // =====================================================
  // TOTAL
  // =====================================================

  const total =
    subtotal + deliveryCharge;

  // =====================================================
  // TOTAL QUANTITY
  // =====================================================

  const totalProductQuantity = useMemo(() => {
    return checkoutItems.reduce(
      (count, item) =>
        count +
        Number(item.quantity || 1),
      0
    );
  }, [checkoutItems]);

  // =====================================================
  // QUANTITY
  // =====================================================

  const increaseQuantity = () => {
    if (!product) return;

    const stock = Number(product.stock || 0);

    if (quantity < stock) {
      setQuantity(
        (previous) => previous + 1
      );
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(
        (previous) => previous - 1
      );
    }
  };

  // =====================================================
  // ADDRESS CHANGE
  // =====================================================

  const handleAddressChange = (event) => {
    const { name, value } = event.target;

    let newValue = value;

    if (name === "phone") {
      newValue = value
        .replace(/\D/g, "")
        .slice(0, 10);
    }

    if (name === "pincode") {
      newValue = value
        .replace(/\D/g, "")
        .slice(0, 6);
    }

    setAddress((previous) => ({
      ...previous,
      [name]: newValue,
    }));
  };

  // =====================================================
  // UTR CHANGE
  // =====================================================

  const handleUtrChange = (event) => {
    setUtr(
      event.target.value.trimStart()
    );
  };

  // =====================================================
  // VALIDATE ADDRESS
  // =====================================================

  const validateAddress = () => {
    if (!address.name.trim()) {
      alert("Please enter your full name.");
      return false;
    }

    if (!address.phone.trim()) {
      alert("Please enter your phone number.");
      return false;
    }

    if (!/^[0-9]{10}$/.test(address.phone)) {
      alert(
        "Please enter a valid 10-digit phone number."
      );
      return false;
    }

    if (!address.address.trim()) {
      alert(
        "Please enter your delivery address."
      );
      return false;
    }

    if (!address.city.trim()) {
      alert("Please enter your city.");
      return false;
    }

    if (!address.state.trim()) {
      alert("Please enter your state.");
      return false;
    }

    if (!address.pincode.trim()) {
      alert("Please enter your pincode.");
      return false;
    }

    if (!/^[0-9]{6}$/.test(address.pincode)) {
      alert(
        "Please enter a valid 6-digit pincode."
      );
      return false;
    }

    return true;
  };

  // =====================================================
  // VALIDATE PAYMENT
  // =====================================================

  const validatePayment = () => {
    if (paymentMethod === "upi") {
      if (!utr.trim()) {
        alert(
          "Please enter your UPI Transaction ID / UTR."
        );
        return false;
      }

      if (utr.trim().length < 6) {
        alert(
          "Please enter a valid UPI Transaction ID."
        );
        return false;
      }
    }

    return true;
  };

  // =====================================================
  // CREATE ORDER ITEMS
  // =====================================================

  const createOrderItems = () => {
    return checkoutItems.map((item) => ({
      productId:
        item.productId ||
        item.id,

      productName:
        item.name || "",

      productImage:
        item.image ||
        item.imageUrl ||
        "",

      brand:
        item.brand || "",

      category:
        item.category || "",

      description:
        item.description || "",

      price:
        Number(item.price || 0),

      quantity:
        Number(item.quantity || 1),

      itemTotal:
        Number(item.price || 0) *
        Number(item.quantity || 1),
    }));
  };

  // =====================================================
  // CREATE UNIQUE STOCK ITEMS
  // =====================================================

  const createStockItems = () => {
    const stockMap = new Map();

    checkoutItems.forEach((item) => {
      const id =
        item.productId ||
        item.id;

      const existing =
        stockMap.get(id);

      if (existing) {
        existing.quantity +=
          Number(item.quantity || 1);
      } else {
        stockMap.set(id, {
          productId: id,

          name:
            item.name || "",

          quantity:
            Number(item.quantity || 1),
        });
      }
    });

    return Array.from(
      stockMap.values()
    );
  };




  // =====================================================
// SEND ADMIN ORDER NOTIFICATION
// =====================================================
const sendAdminNotification = async ({
  orderId,
  customerName,
  totalAmount,
  items,
  paymentMethod,
}) => {
  try {
    const workerUrl =
      "https://shopping.gameplay28-4-2008.workers.dev";

    const firstProductName =
      items?.[0]?.productName || "Product";

    const extraItems =
      items?.length > 1
        ? ` + ${items.length - 1} more`
        : "";

    const body =
      `${customerName} ordered ${firstProductName}${extraItems} • ₹${Number(
        totalAmount
      ).toLocaleString("en-IN")} • ${paymentMethod.toUpperCase()}`;

    const response = await fetch(
      `${workerUrl}/send-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "🛒 New Order Received",
          body,
          orderId,
          icon: "/favicon.ico",
        }),
      }
    );

    const result = await response.json();

if (!response.ok) {
  console.error(
    "❌ ADMIN NOTIFICATION ERROR:",
    result?.error || "Unknown error"
  );
}
  } catch (error) {
    // Notification failure should NOT cancel the order
    console.error(
      "❌ Admin notification error:",
      error
    );
  }
};


  // =====================================================
  // PLACE ORDER
  // =====================================================

  const handlePlaceOrder = async () => {
    // LOGIN CHECK

    if (!auth.currentUser) {
      alert(
        "Please login before placing an order."
      );

      navigate("/login");

      return;
    }

    // ITEMS CHECK

    if (
      !checkoutItems ||
      checkoutItems.length === 0
    ) {
      alert(
        "No products selected."
      );

      return;
    }

    // ADDRESS CHECK

    if (!validateAddress()) {
      return;
    }

    // PAYMENT CHECK

    if (!validatePayment()) {
      return;
    }

    const currentUser =
      auth.currentUser;

    try {
      setPlacingOrder(true);

      if (!hasSavedAddress) {
        const addressCollection = collection(
          db,
          "users",
          currentUser.uid,
          "addresses"
        );

        const savedAddressSnapshot =
          await getDocs(addressCollection);

        if (savedAddressSnapshot.empty) {
          await addDoc(addressCollection, {
            name: address.name.trim(),
            phone: address.phone.trim(),
            address: address.address.trim(),
            city: address.city.trim(),
            state: address.state.trim(),
            pincode: address.pincode.trim(),
            type: "Home",
            isDefault: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        setHasSavedAddress(true);
      }

      // ===================================================
      // ORDER REFERENCE
      // ===================================================

      const orderRef = doc(
        collection(db, "orders")
      );

      // ===================================================
      // DATA
      // ===================================================

      const orderItems =
        createOrderItems();

      const stockItems =
        createStockItems();

      const orderData = {
        orderId:
          orderRef.id,

        userId:
          currentUser.uid,

        userEmail:
          currentUser.email || "",

        customerName:
          address.name.trim(),

        customerPhone:
          address.phone.trim(),

        items:
          orderItems,

        productCount:
          checkoutItems.length,

        totalProductQuantity,

        subtotal:
          Number(subtotal),

        deliveryCharge:
          Number(deliveryCharge),

        totalAmount:
          Number(total),

        paymentMethod,

        paymentStatus:
          paymentMethod === "cod"
            ? "pending"
            : "verification_pending",

        utr:
          paymentMethod === "upi"
            ? utr.trim()
            : null,

        deliveryAddress: {
          name:
            address.name.trim(),

          phone:
            address.phone.trim(),

          address:
            address.address.trim(),

          city:
            address.city.trim(),

          state:
            address.state.trim(),

          pincode:
            address.pincode.trim(),
        },

        status:
          "placed",

        orderStatus:
          "placed",

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      };

      // ===================================================
      // FIRESTORE TRANSACTION
      // ===================================================

      await runTransaction(
        db,
        async (transaction) => {
          const productSnapshots = [];

          // READ ALL PRODUCTS FIRST

          for (
            const stockItem of stockItems
          ) {
            const productRef =
              doc(
                db,
                "products",
                stockItem.productId
              );

            const productSnap =
              await transaction.get(
                productRef
              );

            productSnapshots.push({
              productRef,
              productSnap,
              stockItem,
            });
          }

          // CHECK STOCK

          for (
            const {
              productSnap,
              stockItem,
            } of productSnapshots
          ) {
            if (
              !productSnap.exists()
            ) {
              throw new Error(
                `Product "${stockItem.name}" is no longer available.`
              );
            }

            const productData =
              productSnap.data();

            const currentStock =
              Number(
                productData.stock || 0
              );

            const requestedQuantity =
              Number(
                stockItem.quantity || 1
              );

            if (
              currentStock <
              requestedQuantity
            ) {
              throw new Error(
                `Not enough stock for "${stockItem.name}". Available: ${currentStock}, Requested: ${requestedQuantity}`
              );
            }
          }

          // UPDATE STOCK

          for (
            const {
              productRef,
              productSnap,
              stockItem,
            } of productSnapshots
          ) {
            const productData =
              productSnap.data();

            const currentStock =
              Number(
                productData.stock || 0
              );

            const requestedQuantity =
              Number(
                stockItem.quantity || 1
              );

            const newStock =
              currentStock -
              requestedQuantity;

            transaction.update(
              productRef,
              {
                stock:
                  newStock,

                updatedAt:
                  serverTimestamp(),
              }
            );
          }

          // CREATE ORDER

          transaction.set(
            orderRef,
            orderData
          );
        }
      );

      // ===================================================
      // FIRESTORE SUCCESS
      // ===================================================

      // ===================================================
// SEND ADMIN PUSH NOTIFICATION
// ===================================================

await sendAdminNotification({
  orderId: orderRef.id,
  customerName: address.name.trim(),
  totalAmount: total,
  items: orderItems,
  paymentMethod,
});


      // ===================================================
      // SUCCESS PAGE
      // ===================================================

      navigate(
        `/order-success/${orderRef.id}`
      );
    } catch (error) {
      console.error(
        "❌ PLACE ORDER ERROR:",
        error
      );

      // STOCK ERROR

      if (
        error.message?.includes(
          "Not enough stock"
        )
      ) {
        alert(
          `❌ ${error.message}`
        );

        if (productId) {
          try {
            const productRef =
              doc(
                db,
                "products",
                productId
              );

            const productSnap =
              await getDoc(
                productRef
              );

            if (
              productSnap.exists()
            ) {
              const data =
                productSnap.data();

              setProduct({
                id:
                  productSnap.id,

                ...data,

                image:
                  data.imageUrls?.[0] ||
                  data.image ||
                  data.imageUrl ||
                  "",
              });

              setQuantity(1);
            }
          } catch (
            refreshError
          ) {
            console.error(
              "STOCK REFRESH ERROR:",
              refreshError
            );
          }
        }

        return;
      }

      // PRODUCT NOT FOUND

      if (
        error.message?.includes(
          "is no longer available"
        )
      ) {
        alert(
          `❌ ${error.message}`
        );

        return;
      }

      // GENERAL ERROR

      alert(
        error.message ||
          "Unable to place order. Please try again."
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="buying-state">
        <div className="loader"></div>

        <p>
          Loading product...
        </p>
      </div>
    );
  }

  // =====================================================
  // NOTHING SELECTED
  // =====================================================

  if (
    !productId &&
    checkoutItems.length === 0
  ) {
    return (
      <div className="buying-state">
        <h2>
          No products selected
        </h2>

        <p>
          Please select a product before
          proceeding to checkout.
        </p>

        <button
          onClick={() =>
            navigate("/")
          }
        >
          Back to Shop
        </button>
      </div>
    );
  }

  // =====================================================
  // PRODUCT NOT FOUND
  // =====================================================

  if (
    productId &&
    !product
  ) {
    return (
      <div className="buying-state">
        <h2>
          Product not found
        </h2>

        <p>
          The product you're looking for
          doesn't exist or has been removed.
        </p>

        <button
          onClick={() =>
            navigate("/")
          }
        >
          Back to Shop
        </button>
      </div>
    );
  }

  // =====================================================
  // OUT OF STOCK
  // =====================================================

  if (
    productId &&
    product &&
    Number(product.stock || 0) <= 0
  ) {
    return (
      <div className="buying-state">
        <h2>
          Out of Stock
        </h2>

        <p>
          Sorry, this product is currently
          unavailable.
        </p>

        <button
          onClick={() =>
            navigate(-1)
          }
        >
          Go Back
        </button>
      </div>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <div className="buying-page">
      {/* HEADER */}

      <header className="buying-header">
        <div
          className="buying-logo"
          onClick={() =>
            navigate("/")
          }
        >
          <span>
            JS
          </span>
          Fashion
        </div>

        <div className="secure-checkout">
          🔒 Secure Checkout
        </div>
      </header>

      {/* MAIN */}

      <main className="checkout-container">
        <div className="checkout-title">
          <p>
            CHECKOUT
          </p>

          <h1>
            Complete your purchase
          </h1>
        </div>

        <div className="checkout-grid">

          {/* LEFT */}

          <section className="checkout-left">

            {/* ADDRESS */}

            <div className="checkout-card">
              <div className="card-heading">
                <div className="heading-number">
                  1
                </div>

                <div>
                  <h2>
                    Delivery Address
                  </h2>

                  <p>
                    Where should we deliver
                    your order?
                  </p>
                </div>
              </div>

              <div className="address-form">

                <div className="form-row">

                  <div className="form-group">
                    <label>
                      Full Name
                    </label>

                    <input
                      name="name"
                      type="text"
                      placeholder="Enter your name"
                      value={address.name}
                      onChange={
                        handleAddressChange
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Phone Number
                    </label>

                    <input
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength="10"
                      placeholder="10-digit mobile number"
                      value={address.phone}
                      onChange={
                        handleAddressChange
                      }
                    />
                  </div>

                </div>

                <div className="form-group">
                  <label>
                    Address
                  </label>

                  <textarea
                    name="address"
                    placeholder="House no, street, area"
                    value={address.address}
                    onChange={
                      handleAddressChange
                    }
                  />
                </div>

                <div className="form-row">

                  <div className="form-group">
                    <label>
                      City
                    </label>

                    <input
                      name="city"
                      type="text"
                      placeholder="City"
                      value={address.city}
                      onChange={
                        handleAddressChange
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      State
                    </label>

                    <input
                      name="state"
                      type="text"
                      placeholder="State"
                      value={address.state}
                      onChange={
                        handleAddressChange
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Pincode
                    </label>

                    <input
                      name="pincode"
                      type="text"
                      inputMode="numeric"
                      maxLength="6"
                      placeholder="600001"
                      value={address.pincode}
                      onChange={
                        handleAddressChange
                      }
                    />
                  </div>

                </div>

              </div>
            </div>

            {/* ORDER SUMMARY */}

            <div className="checkout-card">
              <div className="card-heading">
                <div className="heading-number">
                  2
                </div>

                <div>
                  <h2>
                    Order Summary
                  </h2>

                  <p>
                    Review your products
                    and quantity.
                  </p>
                </div>
              </div>

              {checkoutItems.map(
                (item, index) => (
                  <div
                    className="product-row"
                    key={
                      item.productId ||
                      item.id ||
                      index
                    }
                  >

                    <div className="product-image">
                      <img
                        src={
                          item.image ||
                          item.imageUrl ||
                          "/placeholder.png"
                        }
                        alt={
                          item.name ||
                          "Product"
                        }
                      />
                    </div>

                    <div className="product-details">

                      <span className="product-brand">
                        {item.brand ||
                          "STORE"}
                      </span>

                      <h3>
                        {item.name}
                      </h3>

                      {item.description && (
                        <p className="product-description">
                          {
                            item.description
                          }
                        </p>
                      )}

                      <strong>
                        ₹
                        {Number(
                          item.price || 0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                      <p>
                        Quantity:{" "}
                        {item.quantity}
                      </p>

                      <p>
                        Item Total: ₹
                        {(
                          Number(
                            item.price || 0
                          ) *
                          Number(
                            item.quantity || 1
                          )
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </p>

                      {productId && (
                        <div className="quantity-control">

                          <button
                            type="button"
                            onClick={
                              decreaseQuantity
                            }
                            disabled={
                              quantity <= 1
                            }
                          >
                            −
                          </button>

                          <span>
                            {quantity}
                          </span>

                          <button
                            type="button"
                            onClick={
                              increaseQuantity
                            }
                            disabled={
                              quantity >=
                              Number(
                                product?.stock ||
                                  0
                              )
                            }
                          >
                            +
                          </button>

                        </div>
                      )}

                    </div>
                  </div>
                )
              )}

            </div>

            {/* PAYMENT */}

            <div className="checkout-card">

              <div className="card-heading">
                <div className="heading-number">
                  3
                </div>

                <div>
                  <h2>
                    Payment Method
                  </h2>

                  <p>
                    Choose your preferred
                    payment method.
                  </p>
                </div>
              </div>

              {/* UPI */}

              <div
                className={`payment-option ${
                  paymentMethod === "upi"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setPaymentMethod("upi")
                }
              >

                <div className="payment-radio">
                  {paymentMethod ===
                    "upi" && (
                    <span></span>
                  )}
                </div>

                <div className="payment-icon upi-icon">
                  UPI
                </div>

                <div className="payment-info">
                  <h3>
                    UPI Payment
                  </h3>

                  <p>
                    Google Pay, PhonePe,
                    Paytm and other UPI apps.
                  </p>
                </div>

              </div>

              {paymentMethod ===
                "upi" && (
                <div className="upi-payment-box">

                  <div className="qr-section">

                    <div className="qr-placeholder">
                      <img
                        src="/payment-qr.png"
                        alt="UPI Payment QR Code"
                      />
                    </div>

                    <div>
                      <h3>
                        Scan & Pay
                      </h3>

                      <p>
                        Scan the QR code using
                        any UPI application.
                      </p>

                      <strong>
                        Pay ₹
                        {total.toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </div>

                  </div>

                  <div className="utr-section">

                    <label>
                      UTR / Transaction ID
                      <span>*</span>
                    </label>

                    <input
                      type="text"
                      placeholder="Enter transaction ID"
                      value={utr}
                      onChange={
                        handleUtrChange
                      }
                    />

                    <small>
                      Complete the UPI payment
                      first, then enter the
                      transaction ID.
                    </small>

                  </div>

                </div>
              )}

              {/* COD */}

              <div
                className={`payment-option ${
                  paymentMethod === "cod"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setPaymentMethod("cod")
                }
              >

                <div className="payment-radio">
                  {paymentMethod ===
                    "cod" && (
                    <span></span>
                  )}
                </div>

                <div className="payment-icon cod-icon">
                  ₹
                </div>

                <div className="payment-info">
                  <h3>
                    Cash on Delivery
                  </h3>

                  <p>
                    Pay when your order
                    arrives.
                  </p>
                </div>

              </div>

              {paymentMethod ===
                "cod" && (
                <div className="cod-message">

                  <span>
                    ✓
                  </span>

                  <div>
                    <strong>
                      Cash on Delivery selected
                    </strong>

                    <p>
                      Pay ₹
                      {total.toLocaleString(
                        "en-IN"
                      )}{" "}
                      when your order
                      is delivered.
                    </p>
                  </div>

                </div>
              )}

            </div>

          </section>

          {/* RIGHT */}

          <aside className="checkout-right">

            <div className="price-card">

              <h2>
                Price Details
              </h2>

              {checkoutItems.map(
                (item, index) => (
                  <div
                    className="price-line"
                    key={
                      item.productId ||
                      item.id ||
                      index
                    }
                  >

                    <span>
                      {item.name} ×{" "}
                      {item.quantity}
                    </span>

                    <strong>
                      ₹
                      {(
                        Number(
                          item.price || 0
                        ) *
                        Number(
                          item.quantity || 1
                        )
                      ).toLocaleString(
                        "en-IN"
                      )}
                    </strong>

                  </div>
                )
              )}

              <div className="price-line">

                <span>
                  Subtotal
                </span>

                <strong>
                  ₹
                  {subtotal.toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>

              <div className="price-line">

                <span>
                  Delivery
                </span>

                <span className="free">
                  {deliveryCharge === 0
                    ? "FREE"
                    : `₹${deliveryCharge}`}
                </span>

              </div>

              <div className="price-divider"></div>

              <div className="total-line">

                <span>
                  Total Amount
                </span>

                <strong>
                  ₹
                  {total.toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>

              <button
                type="button"
                className="place-order-btn"
                onClick={
                  handlePlaceOrder
                }
                disabled={
                  placingOrder
                }
              >

                {placingOrder
                  ? "Placing Order..."
                  : paymentMethod === "cod"
                  ? "Place Order"
                  : "Confirm UPI Payment"}

                {!placingOrder && (
                  <span>
                    →
                  </span>
                )}

              </button>

              <div className="secure-note">

                <span>
                  🔒
                </span>

                <p>
                  Your order information is
                  securely protected.
                </p>

              </div>

            </div>

            <div className="benefits-card">

              <div className="benefit">

                <span>
                  🚚
                </span>

                <div>
                  <strong>
                    Fast Delivery
                  </strong>

                  <p>
                    Quick & reliable shipping
                  </p>
                </div>

              </div>

              <div className="benefit">

                <span>
                  ↩
                </span>

                <div>
                  <strong>
                    Easy Returns
                  </strong>

                  <p>
                    Simple return process
                  </p>
                </div>

              </div>

              <div className="benefit">

                <span>
                  ✓
                </span>

                <div>
                  <strong>
                    Secure Shopping
                  </strong>

                  <p>
                    Your data is protected
                  </p>
                </div>

              </div>

            </div>

          </aside>

        </div>
      </main>
    </div>
  );
}

export default BuyNow;
