import "./Orders.css";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { auth, db } from "../../../backend/firebase";

import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";


export default function Orders() {

  const navigate = useNavigate();


  // =========================
  // USER
  // =========================

  const [user, setUser] = useState(null);


  // =========================
  // ORDERS
  // =========================

  const [orders, setOrders] = useState([]);


  // =========================
  // LOADING
  // =========================

  const [loading, setLoading] = useState(true);


  // =========================
  // ERROR
  // =========================

  const [error, setError] = useState("");


  // =========================
  // EXPANDED ORDER
  // =========================

  const [expandedOrder, setExpandedOrder] =
    useState(null);


  // =========================
  // STATUS STEPS
  // =========================

  const statusSteps = [
    {
      key: "placed",
      label: "Order Placed",
      icon: "✓",
    },
    {
      key: "confirmed",
      label: "Confirmed",
      icon: "✓",
    },
    {
      key: "packed",
      label: "Packed",
      icon: "📦",
    },
    {
      key: "shipped",
      label: "Shipped",
      icon: "🚚",
    },
    {
      key: "out_for_delivery",
      label: "Out for Delivery",
      icon: "🛵",
    },
    {
      key: "delivered",
      label: "Delivered",
      icon: "✓",
    },
  ];


  // =========================
  // NORMALIZE STATUS
  // =========================

  const normalizeStatus = (status) => {

    if (!status) {
      return "placed";
    }


    const value =
      String(status)
        .toLowerCase()
        .trim()
        .replace(/[\s-]+/g, "_");


    const statusMap = {

      pending: "placed",

      order_placed: "placed",

      placed: "placed",

      confirmed: "confirmed",

      processing: "confirmed",

      packed: "packed",

      packing: "packed",

      shipped: "shipped",

      out_for_delivery:
        "out_for_delivery",

      outfordelivery:
        "out_for_delivery",

      delivered: "delivered",

      completed: "delivered",

      cancelled: "cancelled",

      canceled: "cancelled",

    };


    return (
      statusMap[value] ||
      "placed"
    );
  };


  // =========================
  // AUTH + ORDERS
  // =========================

  useEffect(() => {

    let unsubscribeOrders = null;


    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        (currentUser) => {

          // =========================
          // NOT LOGGED IN
          // =========================

          if (!currentUser) {

            setUser(false);

            setOrders([]);

            setLoading(false);

            return;
          }


          setUser(currentUser);


          // =========================
          // ORDERS COLLECTION
          // =========================

          const ordersRef =
            collection(db, "orders");


          // =========================
          // USER ORDERS QUERY
          // =========================

          const ordersQuery =
            query(
              ordersRef,
              where(
                "userId",
                "==",
                currentUser.uid
              )
            );


          // =========================
          // REAL TIME LISTENER
          // =========================

          unsubscribeOrders =
            onSnapshot(
              ordersQuery,

              (snapshot) => {

                const orderList =
                  snapshot.docs.map(
                    (orderDoc) => {

                      const data =
                        orderDoc.data();


                      return {

                        id:
                          orderDoc.id,

                        ...data,

                        status:
                          normalizeStatus(
                            data.status ||
                            data.orderStatus
                          ),

                      };
                    }
                  );


                // =========================
                // SORT NEWEST FIRST
                // =========================

                orderList.sort(
                  (a, b) => {

                    const dateA =
                      getOrderTimestamp(a);

                    const dateB =
                      getOrderTimestamp(b);

                    return dateB - dateA;
                  }
                );


                setOrders(orderList);

                setLoading(false);

                setError("");
              },

              (snapshotError) => {

                console.error(
                  "Orders loading error:",
                  snapshotError
                );


                setError(
                  "Unable to load your orders."
                );


                setLoading(false);
              }
            );
        }
      );


    return () => {

      unsubscribeAuth();

      if (unsubscribeOrders) {
        unsubscribeOrders();
      }

    };

  }, []);


  // =========================
  // GET ORDER TIMESTAMP
  // =========================

  const getOrderTimestamp = (order) => {

    const timestamp =
      order.createdAt ||
      order.orderDate ||
      order.date ||
      order.timestamp;


    if (!timestamp) {
      return 0;
    }


    // Firebase Timestamp

    if (
      typeof timestamp.toMillis ===
      "function"
    ) {

      return timestamp.toMillis();
    }


    // JavaScript Date

    if (
      timestamp instanceof Date
    ) {

      return timestamp.getTime();
    }


    // String / Number

    const parsed =
      new Date(timestamp).getTime();


    return Number.isNaN(parsed)
      ? 0
      : parsed;
  };


  // =========================
  // FORMAT DATE
  // =========================

  const formatDate = (order) => {

    const time =
      getOrderTimestamp(order);


    if (!time) {
      return "Date unavailable";
    }


    return new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(new Date(time));
  };


  // =========================
  // GET STATUS INDEX
  // =========================

  const getStatusIndex = (status) => {

    const normalized =
      normalizeStatus(status);


    return statusSteps.findIndex(
      (step) =>
        step.key === normalized
    );
  };


  // =========================
  // GET PRODUCT ITEMS
  // =========================

  const getItems = (order) => {

    if (
      Array.isArray(order.items)
    ) {

      return order.items;
    }


    if (
      Array.isArray(order.products)
    ) {

      return order.products;
    }


    if (
      Array.isArray(order.orderItems)
    ) {

      return order.orderItems;
    }


    // Single product order

    if (
      order.productId ||
      order.productName ||
      order.name
    ) {

      return [
        {
          id:
            order.productId ||
            order.id,

          productId:
            order.productId,

          name:
            order.productName ||
            order.name ||
            "Product",

          image:
            order.productImage ||
            order.image ||
            order.imageUrl ||
            "",

          price:
            order.price ||
            order.total ||
            0,

          quantity:
            order.quantity ||
            1,
        },
      ];
    }


    return [];
  };


  // =========================
  // GET PRODUCT ID
  // =========================

  const getProductId = (item) => {

    return (
      item.productId ||
      item.id ||
      item.productID ||
      ""
    );
  };


  // =========================
  // GET PRODUCT IMAGE
  // =========================

  const getProductImage = (item) => {

    return (
      item.image ||
      item.imageUrl ||
      item.imageURL ||
      item.productImage ||
      ""
    );
  };


  // =========================
  // GET PRODUCT NAME
  // =========================

  const getProductName = (item) => {

    return (
      item.name ||
      item.productName ||
      item.title ||
      "Product"
    );
  };


  // =========================
  // GET PRICE
  // =========================

  const getItemPrice = (item) => {

    const price =
      Number(
        item.price ||
        item.salePrice ||
        item.productPrice ||
        0
      );


    return price;
  };


  // =========================
  // GET QUANTITY
  // =========================

  const getQuantity = (item) => {

    return Number(
      item.quantity ||
      item.qty ||
      1
    );
  };


  // =========================
  // GET TOTAL
  // =========================

  const getOrderTotal = (order) => {

    const total =
      order.totalAmount ??
      order.grandTotal ??
      order.total ??
      order.amount ??
      order.finalAmount;


    if (
      total !== undefined &&
      total !== null
    ) {

      return Number(total) || 0;
    }


    const items =
      getItems(order);


    return items.reduce(
      (sum, item) =>
        sum +
        getItemPrice(item) *
        getQuantity(item),
      0
    );
  };


  // =========================
  // FORMAT PRICE
  // =========================

  const formatPrice = (price) => {

    return `₹${Number(price || 0).toLocaleString(
      "en-IN"
    )}`;
  };


  // =========================
  // GET ADDRESS
  // =========================

  const getAddress = (order) => {

    const address =
      order.shippingAddress ||
      order.deliveryAddress ||
      order.address;


    if (
      typeof address === "string"
    ) {

      return {
        name:
          order.customerName ||
          order.name ||
          "",

        phone:
          order.phone ||
          order.phoneNumber ||
          "",

        address,

        city:
          order.city || "",

        state:
          order.state || "",

        pincode:
          order.pincode ||
          order.zipCode ||
          "",
      };
    }


    if (
      address &&
      typeof address === "object"
    ) {

      return {

        name:
          address.name ||
          address.fullName ||
          order.customerName ||
          "",

        phone:
          address.phone ||
          address.phoneNumber ||
          "",

        address:
          address.address ||
          address.street ||
          address.fullAddress ||
          "",

        city:
          address.city || "",

        state:
          address.state || "",

        pincode:
          address.pincode ||
          address.zipCode ||
          "",

      };
    }


    return {

      name:
        order.customerName ||
        order.name ||
        "",

      phone:
        order.phone ||
        order.phoneNumber ||
        "",

      address:
        order.address || "",

      city:
        order.city || "",

      state:
        order.state || "",

      pincode:
        order.pincode ||
        order.zipCode ||
        "",

    };
  };


  // =========================
  // PAYMENT STATUS
  // =========================

  const getPaymentStatus = (order) => {

    return (
      order.paymentStatus ||
      order.payment?.status ||
      "Pending"
    );
  };


  // =========================
  // PAYMENT METHOD
  // =========================

  const getPaymentMethod = (order) => {

    return (
      order.paymentMethod ||
      order.payment?.method ||
      "Not specified"
    );
  };


  // =========================
  // TOGGLE ORDER
  // =========================

  const toggleOrder = (id) => {

    setExpandedOrder(
      (previous) =>
        previous === id
          ? null
          : id
    );
  };


  // =========================
  // VIEW PRODUCT
  // =========================

  const handleViewProduct = (item) => {

    const productId =
      getProductId(item);


    if (!productId) {
      return;
    }


    navigate(
      `/product/${productId}`
    );
  };


  // =========================
  // LOGIN REQUIRED
  // =========================

  if (user === false) {

    return (

      <div className="orders-page login-required">

        <div className="login-box">

          <div className="login-icon">
            🔐
          </div>


          <h2>
            Login Required
          </h2>


          <p>
            Please login to view
            your orders.
          </p>


          <button
            onClick={() =>
              navigate("/login")
            }
          >
            Go to Login
          </button>

        </div>

      </div>
    );
  }


  // =========================
  // LOADING
  // =========================

  if (loading) {

    return (

      <div className="orders-page">

        <div className="orders-loading">

          <div className="loader"></div>

          <p>
            Loading your orders...
          </p>

        </div>

      </div>
    );
  }


  // =========================
  // PAGE
  // =========================

  return (

    <div className="orders-page">


      {/* =========================
          HEADER
      ========================= */}

      <div className="orders-header">

        <div>

          <p className="orders-label">
            MY ACCOUNT
          </p>


          <h1>
            My Orders
          </h1>


          <p className="orders-subtitle">
            Track and manage your orders
          </p>

        </div>


        <button
          className="back-btn"
          onClick={() =>
            navigate("/profile")
          }
        >
          ← Back to Profile
        </button>

      </div>



      <div className="orders-container">


        {/* =========================
            ERROR
        ========================= */}

        {error && (

          <div className="orders-error">
            {error}
          </div>
        )}



        {/* =========================
            EMPTY
        ========================= */}

        {orders.length === 0 ? (

          <div className="empty-orders">

            <div className="empty-orders-icon">
              📦
            </div>


            <h2>
              No orders yet
            </h2>


            <p>
              You haven't placed any
              orders yet.
            </p>


            <button
              onClick={() =>
                navigate("/")
              }
            >
              Start Shopping
            </button>

          </div>

        ) : (

          <>

            {/* =========================
                SUMMARY
            ========================= */}

            <div className="orders-summary">

              <div>

                <span>
                  Total Orders
                </span>

                <strong>
                  {orders.length}
                </strong>

              </div>


              <div>

                <span>
                  Active Orders
                </span>

                <strong>

                  {
                    orders.filter(
                      (order) =>
                        order.status !==
                        "delivered" &&
                        order.status !==
                        "cancelled"
                    ).length
                  }

                </strong>

              </div>


              <div>

                <span>
                  Delivered
                </span>

                <strong>

                  {
                    orders.filter(
                      (order) =>
                        order.status ===
                        "delivered"
                    ).length
                  }

                </strong>

              </div>

            </div>



            {/* =========================
                ORDER LIST
            ========================= */}

            <div className="orders-list">

              {orders.map((order) => {

                const status =
                  normalizeStatus(
                    order.status
                  );


                const items =
                  getItems(order);


                const total =
                  getOrderTotal(order);


                const address =
                  getAddress(order);


                const currentIndex =
                  getStatusIndex(
                    status
                  );


                const isExpanded =
                  expandedOrder ===
                  order.id;


                const isCancelled =
                  status ===
                  "cancelled";


                return (

                  <div
                    className={
                      isCancelled
                        ? "order-card cancelled"
                        : "order-card"
                    }
                    key={order.id}
                  >


                    {/* =========================
                        ORDER HEADER
                    ========================= */}

                    <div className="order-top">

                      <div className="order-id-section">

                        <span className="order-small-label">
                          ORDER ID
                        </span>


                        <strong>
                          #{order.id.slice(0, 10).toUpperCase()}
                        </strong>


                        <span className="order-date">
                          {formatDate(order)}
                        </span>

                      </div>


                      <div className="order-status-section">

                        <span
                          className={
                            `status-badge status-${status}`
                          }
                        >

                          {status ===
                            "delivered" &&
                            "✓ "}

                          {status ===
                            "cancelled" &&
                            "✕ "}

                          {status ===
                            "placed" &&
                            "● "}

                          {status ===
                            "confirmed" &&
                            "● "}

                          {status ===
                            "packed" &&
                            "📦 "}

                          {status ===
                            "shipped" &&
                            "🚚 "}

                          {status ===
                            "out_for_delivery" &&
                            "🛵 "}

                          {status ===
                            "out_for_delivery"
                            ? "Out for Delivery"
                            : status
                              .replace(
                                /_/g,
                                " "
                              )
                              .replace(
                                /\b\w/g,
                                (letter) =>
                                  letter.toUpperCase()
                              )}

                        </span>

                      </div>

                    </div>



                    {/* =========================
                        PRODUCTS
                    ========================= */}

                    <div className="order-products">

                      {items.map(
                        (item, index) => (

                          <div
                            className="order-product"
                            key={
                              item.id ||
                              item.productId ||
                              index
                            }
                          >


                            <div className="order-product-image">

                              {getProductImage(
                                item
                              ) ? (

                                <img
                                  src={getProductImage(
                                    item
                                  )}
                                  alt={getProductName(
                                    item
                                  )}
                                  onError={(
                                    e
                                  ) => {

                                    e.currentTarget.style.display =
                                      "none";

                                  }}
                                />

                              ) : (

                                <span>
                                  📦
                                </span>

                              )}

                            </div>


                            <div className="order-product-info">

                              <h3>
                                {getProductName(
                                  item
                                )}
                              </h3>

                              {item.brand && (
                                <p className="order-product-brand">
                                  {item.brand}
                                </p>
                              )}


                              <p>
                                Qty:{" "}
                                {getQuantity(
                                  item
                                )}
                              </p>

                            </div>


                            <div className="order-product-price">

                              {formatPrice(
                                getItemPrice(
                                  item
                                ) *
                                getQuantity(
                                  item
                                )
                              )}

                            </div>

                          </div>
                        )
                      )}

                    </div>



                    {/* =========================
                        TRACKING
                    ========================= */}

                    {!isCancelled && (

                      <div className="tracking-section">

                        <div className="tracking-header">

                          <div>

                            <h3>
                              Order Tracking
                            </h3>


                            <p>
                              {status ===
                              "delivered"
                                ? "Your order has been delivered"
                                : "Your order is on the way"}

                            </p>

                          </div>


                          <span className="tracking-live">
                            ● Live
                          </span>

                        </div>


                        <div className="tracking">

                          {statusSteps.map(
                            (
                              step,
                              index
                            ) => {

                              const completed =
                                index <=
                                currentIndex;


                              const active =
                                index ===
                                currentIndex;


                              return (

                                <div
                                  className={
                                    completed
                                      ? active
                                        ? "tracking-step active"
                                        : "tracking-step completed"
                                      : "tracking-step"
                                  }
                                  key={
                                    step.key
                                  }
                                >

                                  <div className="tracking-icon">

                                    {completed
                                      ? "✓"
                                      : step.icon}

                                  </div>


                                  <div className="tracking-label">

                                    {step.label}

                                  </div>


                                  {index <
                                    statusSteps.length -
                                      1 && (

                                    <div
                                      className={
                                        index <
                                        currentIndex
                                          ? "tracking-line completed"
                                          : "tracking-line"
                                      }
                                    ></div>
                                  )}

                                </div>
                              );
                            }
                          )}

                        </div>

                      </div>
                    )}



                    {/* =========================
                        CANCELLED TRACKING
                    ========================= */}

                    {isCancelled && (

                      <div className="cancelled-message">

                        <div className="cancelled-icon">
                          ✕
                        </div>


                        <div>

                          <strong>
                            Order Cancelled
                          </strong>


                          <p>
                            This order has been
                            cancelled.
                          </p>

                        </div>

                      </div>
                    )}



                    {/* =========================
                        ORDER FOOTER
                    ========================= */}

                    <div className="order-footer">

                      <div className="order-total">

                        <span>
                          Total Amount
                        </span>


                        <strong>
                          {formatPrice(total)}
                        </strong>

                      </div>


                      <button
                        className="details-btn"
                        onClick={() =>
                          toggleOrder(
                            order.id
                          )
                        }
                      >

                        {isExpanded
                          ? "Hide Details ↑"
                          : "View Details ↓"}

                      </button>

                    </div>



                    {/* =========================
                        DETAILS
                    ========================= */}

                    {isExpanded && (

                      <div className="order-details">


                        {/* DELIVERY */}

                        <div className="detail-box">

                          <h3>
                            📍 Delivery Address
                          </h3>


                          <p>
                            <strong>
                              {address.name ||
                                "Customer"}
                            </strong>
                          </p>


                          {address.address && (

                            <p>
                              {address.address}
                            </p>
                          )}


                          {(address.city ||
                            address.state ||
                            address.pincode) && (

                            <p>

                              {address.city}

                              {address.city &&
                                address.state
                                ? ", "
                                : ""}

                              {address.state}

                              {(address.city ||
                                address.state) &&
                                address.pincode
                                ? " - "
                                : ""}

                              {address.pincode}

                            </p>
                          )}


                          {address.phone && (

                            <p>
                              ☎{" "}
                              {address.phone}
                            </p>
                          )}

                        </div>



                        {/* PAYMENT */}

                        <div className="detail-box">

                          <h3>
                            💳 Payment
                          </h3>


                          <div className="payment-row">

                            <span>
                              Method
                            </span>


                            <strong>
                              {getPaymentMethod(
                                order
                              )}
                            </strong>

                          </div>


                          <div className="payment-row">

                            <span>
                              Status
                            </span>


                            <strong
                              className={
                                getPaymentStatus(
                                  order
                                )
                                  .toLowerCase()
                                  .includes(
                                    "paid"
                                  )
                                  ? "paid"
                                  : ""
                              }
                            >
                              {getPaymentStatus(
                                order
                              )}
                            </strong>

                          </div>

                        </div>



                        {/* PRICE BREAKDOWN */}

                        <div className="detail-box">

                          <h3>
                            💰 Price Details
                          </h3>


                          <div className="price-row">

                            <span>
                              Items
                            </span>


                            <span>
                              {formatPrice(
                                items.reduce(
                                  (
                                    sum,
                                    item
                                  ) =>
                                    sum +
                                    getItemPrice(
                                      item
                                    ) *
                                    getQuantity(
                                      item
                                    ),
                                  0
                                )
                              )}
                            </span>

                          </div>


                          <div className="price-row">

                            <span>
                              Delivery
                            </span>


                            <span>
                              {Number(
                                order.deliveryCharge ||
                                order.shippingCharge ||
                                0
                              ) === 0
                                ? "FREE"
                                : formatPrice(
                                    order.deliveryCharge ||
                                    order.shippingCharge
                                  )}
                            </span>

                          </div>


                          <div className="price-row total">

                            <strong>
                              Total
                            </strong>


                            <strong>
                              {formatPrice(
                                total
                              )}
                            </strong>

                          </div>

                        </div>



                        {/* VIEW PRODUCT */}

                        {items.length > 0 && (

                          <div className="ordered-products-actions">

                            {items.map(
                              (
                                item,
                                index
                              ) => {

                                const productId =
                                  getProductId(
                                    item
                                  );


                                if (!productId) {
                                  return null;
                                }


                                return (

                                  <button
                                    key={
                                      item.id ||
                                      productId ||
                                      index
                                    }
                                    onClick={() =>
                                      handleViewProduct(
                                        item
                                      )
                                    }
                                  >
                                    View{" "}
                                    {getProductName(
                                      item
                                    )}
                                  </button>
                                );
                              }
                            )}

                          </div>
                        )}

                      </div>
                    )}

                  </div>
                );
              })}

            </div>

          </>
        )}

      </div>

    </div>
  );
}
