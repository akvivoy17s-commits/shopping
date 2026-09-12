import "./AdminOrder.css";

import { useEffect, useRef, useState } from "react";

import { useSearchParams } from "react-router-dom";

import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { db, auth } from "../../../backend/firebase";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [updatingId, setUpdatingId] = useState(null);
  const [verifyingPaymentId, setVerifyingPaymentId] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const notificationRef = useRef(null);

  const [searchParams] = useSearchParams();

  const requestedOrderId =
    searchParams.get("orderId");



  // =====================================================
  // STATUS OPTIONS
  // =====================================================

  const statusOptions = [
    {
      value: "placed",
      label: "Order Placed",
      icon: "✓",
    },
    {
      value: "confirmed",
      label: "Confirmed",
      icon: "✓",
    },
    {
      value: "packed",
      label: "Packed",
      icon: "📦",
    },
    {
      value: "shipped",
      label: "Shipped",
      icon: "🚚",
    },
    {
      value: "out_for_delivery",
      label: "Out for Delivery",
      icon: "🛵",
    },
    {
      value: "delivered",
      label: "Delivered",
      icon: "✓",
    },
    {
      value: "cancelled",
      label: "Cancelled",
      icon: "✕",
    },
  ];

  // =====================================================
  // LOAD ORDERS
  // =====================================================

  useEffect(() => {
    const ordersRef = collection(db, "orders");

    const ordersQuery = query(
      ordersRef,
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const orderList = snapshot.docs.map((orderDoc) => ({
          id: orderDoc.id,
          ...orderDoc.data(),
        }));

        setOrders(orderList);
      },
      (error) => {
        console.error("Orders error:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (
      !requestedOrderId ||
      !orders.some(
        (order) => order.id === requestedOrderId
      )
    ) {
      return;
    }

    setSelectedOrderId(requestedOrderId);

    setTimeout(() => {
      document
        .getElementById(`order-${requestedOrderId}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 150);
  }, [orders, requestedOrderId]);

  // =====================================================
  // LOAD ADMIN NOTIFICATIONS
  // =====================================================

  useEffect(() => {
    const notificationsRef = collection(
      db,
      "adminNotifications"
    );

    const notificationsQuery = query(
      notificationsRef,
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notificationList = snapshot.docs.map(
          (notificationDoc) => ({
            id: notificationDoc.id,
            ...notificationDoc.data(),
          })
        );

        setNotifications(notificationList);
      },
      (error) => {
        console.error(
          "Admin notifications error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, []);

  // =====================================================
  // UNREAD COUNT
  // =====================================================

  const unreadCount = notifications.filter(
    (notification) => notification.read !== true
  ).length;

  // =====================================================
  // NOTIFICATION TYPE
  // =====================================================

  const getNotificationType = (notification) => {
    const type = notification?.type;

    switch (type) {
      case "new_order":
        return {
          icon: "🛍️",
          title: "New Order",
          className: "notification-new-order",
        };

      case "payment_pending":
        return {
          icon: "💳",
          title: "Payment Verification",
          className: "notification-payment",
        };

      case "payment_verified":
        return {
          icon: "✅",
          title: "Payment Verified",
          className: "notification-success",
        };

      case "payment_failed":
        return {
          icon: "❌",
          title: "Payment Failed",
          className: "notification-error",
        };

      case "order_status":
        return {
          icon: "🚚",
          title: "Order Update",
          className: "notification-status",
        };

      case "order_cancelled":
        return {
          icon: "❌",
          title: "Order Cancelled",
          className: "notification-error",
        };

      default:
        return {
          icon: "🔔",
          title: notification?.title || "Notification",
          className: "notification-default",
        };
    }
  };

  // =====================================================
  // FORMAT NOTIFICATION DATE
  // =====================================================

  const formatNotificationTime = (timestamp) => {
    if (!timestamp) {
      return "Just now";
    }

    try {
      const date = timestamp.toDate
        ? timestamp.toDate()
        : new Date(timestamp);

      const now = new Date();

      const difference =
        Math.floor((now - date) / 1000);

      if (difference < 10) {
        return "Just now";
      }

      if (difference < 60) {
        return `${difference}s ago`;
      }

      if (difference < 3600) {
        return `${Math.floor(
          difference / 60
        )}m ago`;
      }

      if (difference < 86400) {
        return `${Math.floor(
          difference / 3600
        )}h ago`;
      }

      if (difference < 604800) {
        return `${Math.floor(
          difference / 86400
        )}d ago`;
      }

      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Just now";
    }
  };

  // =====================================================
  // MARK NOTIFICATION AS READ
  // =====================================================

  const markNotificationAsRead = async (
    notification
  ) => {
    try {
      if (!notification?.id) return;

      if (notification.read === true) {
        return;
      }

      await updateDoc(
        doc(
          db,
          "adminNotifications",
          notification.id
        ),
        {
          read: true,
          readAt: serverTimestamp(),
        }
      );
    } catch (error) {
      console.error(
        "Notification read error:",
        error
      );
    }
  };

  // =====================================================
  // MARK ALL AS READ
  // =====================================================

  const markAllAsRead = async () => {
    try {
      const unreadNotifications =
        notifications.filter(
          (notification) =>
            notification.read !== true
        );

      if (unreadNotifications.length === 0) {
        return;
      }

      await Promise.all(
        unreadNotifications.map(
          (notification) =>
            updateDoc(
              doc(
                db,
                "adminNotifications",
                notification.id
              ),
              {
                read: true,
                readAt: serverTimestamp(),
              }
            )
        )
      );
    } catch (error) {
      console.error(
        "Mark all read error:",
        error
      );
    }
  };

  // =====================================================
  // DELETE NOTIFICATION
  // =====================================================

  const deleteNotification = async (
    notificationId,
    event
  ) => {
    event?.stopPropagation();

    try {
      if (!notificationId) return;

      await deleteDoc(
        doc(
          db,
          "adminNotifications",
          notificationId
        )
      );
    } catch (error) {
      console.error(
        "Delete notification error:",
        error
      );
    }
  };

  // =====================================================
  // CLEAR READ NOTIFICATIONS
  // =====================================================

  const clearReadNotifications = async () => {
    try {
      const readNotifications =
        notifications.filter(
          (notification) =>
            notification.read === true
        );

      if (readNotifications.length === 0) {
        return;
      }

      await Promise.all(
        readNotifications.map(
          (notification) =>
            deleteDoc(
              doc(
                db,
                "adminNotifications",
                notification.id
              )
            )
        )
      );
    } catch (error) {
      console.error(
        "Clear notifications error:",
        error
      );
    }
  };

  // =====================================================
  // OPEN NOTIFICATION
  // =====================================================

  const handleNotificationClick = async (
    notification
  ) => {
    try {
      await markNotificationAsRead(
        notification
      );

      setShowNotifications(false);

      if (!notification.orderId) {
        return;
      }

      setSelectedOrderId(
        notification.orderId
      );

      setTimeout(() => {
        const element =
          document.getElementById(
            `order-${notification.orderId}`
          );

        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 150);
    } catch (error) {
      console.error(
        "Notification click error:",
        error
      );
    }
  };

  // =====================================================
  // VERIFY PAYMENT
  // =====================================================

  const verifyPayment = async (order) => {
    if (!order?.id) {
      return;
    }

    if (order.paymentStatus === "verified") {
      return;
    }

    const confirmed = window.confirm(
      `Verify payment for order #${order.id
        .slice(0, 10)
        .toUpperCase()}?\n\n` +
        `Payment: ${
          order.paymentMethod || "N/A"
        }\n` +
        `UTR: ${order.utr || "N/A"}\n` +
        `Amount: ₹${getTotal(
          order
        ).toLocaleString("en-IN")}`
    );

    if (!confirmed) {
      return;
    }

    try {
      setVerifyingPaymentId(order.id);

      const currentAdmin =
        auth?.currentUser;

      await updateDoc(
        doc(db, "orders", order.id),
        {
          paymentStatus: "verified",
          paymentVerified: true,
          paymentVerifiedAt:
            serverTimestamp(),
          paymentVerifiedBy:
            currentAdmin?.uid || "admin",
          paymentVerifiedByEmail:
            currentAdmin?.email || "",
        }
      );

      console.log(
        "Payment verified:",
        order.id
      );

      alert(
        "Payment verified successfully."
      );
    } catch (error) {
      console.error(
        "Payment verification error:",
        error
      );

      alert(
        "Unable to verify payment."
      );
    } finally {
      setVerifyingPaymentId(null);
    }
  };

  // =====================================================
  // REJECT PAYMENT
  // =====================================================

  const rejectPayment = async (order) => {
    if (!order?.id) {
      return;
    }

    const confirmed = window.confirm(
      `Reject payment for order #${order.id
        .slice(0, 10)
        .toUpperCase()}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setVerifyingPaymentId(order.id);

      const currentAdmin =
        auth?.currentUser;

      await updateDoc(
        doc(db, "orders", order.id),
        {
          paymentStatus: "failed",
          paymentVerified: false,
          paymentRejectedAt:
            serverTimestamp(),
          paymentRejectedBy:
            currentAdmin?.uid || "admin",
          paymentRejectedByEmail:
            currentAdmin?.email || "",
        }
      );

      alert(
        "Payment marked as failed."
      );
    } catch (error) {
      console.error(
        "Payment rejection error:",
        error
      );

      alert(
        "Unable to reject payment."
      );
    } finally {
      setVerifyingPaymentId(null);
    }
  };

  // =====================================================
  // STATUS UPDATE
  // =====================================================

  const updateOrderStatus = async (
    orderId,
    newStatus
  ) => {
    try {
      setUpdatingId(orderId);

      const orderRef = doc(db, "orders", orderId);

      if (newStatus === "cancelled") {
        await runTransaction(
          db,
          async (transaction) => {
            const orderSnapshot =
              await transaction.get(orderRef);

            if (!orderSnapshot.exists()) {
              throw new Error("Order not found.");
            }

            const orderData = orderSnapshot.data();
            const orderUpdate = {
              status: newStatus,
              orderStatus: newStatus,
              statusUpdatedAt: serverTimestamp(),
            };

            if (orderData.stockRestored !== true) {
              const inventoryMap = new Map();

              for (const item of orderData.items || []) {
                const productId =
                  item.productId || item.id;

                if (!productId) {
                  throw new Error(
                    "Cancelled order contains an item without a product ID."
                  );
                }

                inventoryMap.set(
                  productId,
                  (inventoryMap.get(productId) || 0) +
                    Number(item.quantity || 1)
                );
              }

              const inventoryItems = Array.from(
                inventoryMap,
                ([productId, quantity]) => ({
                  productId,
                  quantity,
                })
              );

              const productSnapshots = [];

              for (const item of inventoryItems) {
                const productRef = doc(
                  db,
                  "products",
                  item.productId
                );
                const productSnapshot =
                  await transaction.get(productRef);

                productSnapshots.push({
                  item,
                  productRef,
                  productSnapshot,
                });
              }

              for (const {
                item,
                productRef,
                productSnapshot,
              } of productSnapshots) {
                if (!productSnapshot.exists()) {
                  throw new Error(
                    `Product ${item.productId} was not found.`
                  );
                }

                const currentStock = Number(
                  productSnapshot.data().stock || 0
                );

                transaction.update(productRef, {
                  stock:
                    currentStock + item.quantity,
                  updatedAt: serverTimestamp(),
                });
              }

              orderUpdate.stockRestored = true;
              orderUpdate.stockRestoredAt =
                serverTimestamp();
            }

            transaction.update(orderRef, orderUpdate);
          }
        );
      } else {
        await updateDoc(orderRef, {
          status: newStatus,
          orderStatus: newStatus,
          statusUpdatedAt: serverTimestamp(),
        });
      }

      console.log(
        "Order status updated:",
        newStatus
      );
    } catch (error) {
      console.error(
        "Status update error:",
        error
      );

      alert(
        "Unable to update order status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // =====================================================
  // STATUS LABEL
  // =====================================================

  const getStatusInfo = (status) => {
    return (
      statusOptions.find(
        (item) => item.value === status
      ) || statusOptions[0]
    );
  };

  // =====================================================
  // PRICE
  // =====================================================

  const getTotal = (order) => {
    return Number(
      order.totalAmount ??
        order.grandTotal ??
        order.total ??
        order.amount ??
        0
    );
  };

  // =====================================================
  // PAYMENT STATUS
  // =====================================================

  const getPaymentStatusInfo = (
    paymentStatus
  ) => {
    switch (paymentStatus) {
      case "verified":
        return {
          label: "Verified",
          icon: "✓",
          className:
            "payment-verified",
        };

      case "failed":
      case "rejected":
        return {
          label: "Payment Failed",
          icon: "✕",
          className:
            "payment-failed",
        };

      case "verification_pending":
      case "pending":
        return {
          label:
            "Verification Pending",
          icon: "⏳",
          className:
            "payment-pending",
        };

      case "paid":
        return {
          label: "Paid",
          icon: "✓",
          className:
            "payment-verified",
        };

      case "cod":
        return {
          label: "Cash on Delivery",
          icon: "💵",
          className: "payment-cod",
        };

      default:
        return {
          label:
            paymentStatus || "N/A",
          icon: "•",
          className:
            "payment-unknown",
        };
    }
  };

  const normalizeSearchValue = (value) =>
    String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, " ");

  const normalizedSearchTerm = normalizeSearchValue(
    searchTerm
  );

  const searchTokens = normalizedSearchTerm
    .split(" ")
    .filter(Boolean);

  const filteredOrders = searchTokens.length
    ? orders.filter((order) => {
        const customerName =
          order.customerName ||
          order.deliveryAddress?.name ||
          order.name ||
          "";
        const customerPhone =
          order.customerPhone ||
          order.deliveryAddress?.phone ||
          "";
        const itemNames = Array.isArray(order.items)
          ? order.items.map(
              (item) =>
                item.productName ||
                item.name ||
                ""
            )
          : [];
        const searchableText = normalizeSearchValue(
          [
            order.id,
            order.id?.slice(0, 10),
            customerName,
            customerPhone,
            order.email,
            order.userEmail,
            order.status,
            order.orderStatus,
            order.paymentStatus,
            order.paymentMethod,
            order.utr,
            ...itemNames,
          ].join(" ")
        );

        const searchableDigits = String(
          customerPhone || ""
        ).replace(/\D/g, "");
        const queryDigits = searchTerm.replace(
          /\D/g,
          ""
        );

        const textMatches = searchTokens.every(
          (token) => searchableText.includes(token)
        );
        const phoneMatches = queryDigits.length >= 3
          ? searchableDigits.includes(queryDigits)
          : false;

        return textMatches || phoneMatches;
      })
    : orders;

  // =====================================================
  // DATE FORMAT
  // =====================================================

  const formatDate = (timestamp) => {
    if (!timestamp) {
      return "Just now";
    }

    try {
      const date = timestamp.toDate
        ? timestamp.toDate()
        : new Date(timestamp);

      return date.toLocaleString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return "Just now";
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="admin-orders-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="admin-orders-header">

        <div>
          <p className="admin-label">
            ADMIN PANEL
          </p>

          <h1>Orders</h1>

          <p>
            Manage and update customer orders
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >

          {/* =================================================
              NOTIFICATION BELL
          ================================================= */}

          <div
            ref={notificationRef}
            style={{
              position: "relative",
            }}
          >

            <button
              type="button"
              onClick={() =>
                setShowNotifications(
                  (prev) => !prev
                )
              }
              style={{
                position: "relative",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "1px solid #e0deda",
                background: "#fff",
                cursor: "pointer",
                fontSize: "22px",
              }}
              aria-label="Notifications"
            >
              🔔

              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    minWidth: "22px",
                    height: "22px",
                    padding: "0 5px",
                    borderRadius: "20px",
                    background: "#cc674e",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #fff",
                  }}
                >
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              )}
            </button>

            {/* =================================================
                NOTIFICATION DROPDOWN
            ================================================= */}

            {showNotifications && (
              <div
                style={{
                  position: "absolute",
                  top: "58px",
                  right: "0",
                  width:
                    "min(420px, calc(100vw - 30px))",
                  maxHeight: "560px",
                  overflowY: "auto",
                  background: "#fff",
                  border:
                    "1px solid #e8e6e2",
                  borderRadius: "14px",
                  boxShadow:
                    "0 15px 40px rgba(0,0,0,0.15)",
                  zIndex: 1000,
                }}
              >

                {/* HEADER */}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "space-between",
                    padding: "16px",
                    borderBottom:
                      "1px solid #f0eeec",
                    gap: "10px",
                  }}
                >

                  <div>
                    <strong
                      style={{
                        fontSize: "17px",
                      }}
                    >
                      Notifications
                    </strong>

                    {unreadCount > 0 && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "12px",
                          color: "#cc674e",
                          fontWeight: "600",
                        }}
                      >
                        {unreadCount} unread
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                    }}
                  >

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={
                          markAllAsRead
                        }
                        style={{
                          border: "none",
                          background:
                            "transparent",
                          cursor:
                            "pointer",
                          fontSize: "12px",
                          fontWeight:
                            "600",
                        }}
                      >
                        Mark all read
                      </button>
                    )}

                  </div>
                </div>

                {/* =================================================
                    NOTIFICATION LIST
                ================================================= */}

                {notifications.length === 0 ? (

                  <div
                    style={{
                      padding:
                        "50px 20px",
                      textAlign:
                        "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "40px",
                        marginBottom:
                          "10px",
                      }}
                    >
                      🔔
                    </div>

                    <strong>
                      No notifications
                    </strong>

                    <p
                      style={{
                        marginTop:
                          "6px",
                        fontSize:
                          "13px",
                        opacity: 0.7,
                      }}
                    >
                      New orders and
                      updates will
                      appear here.
                    </p>
                  </div>

                ) : (

                  notifications.map(
                    (notification) => {

                      const typeInfo =
                        getNotificationType(
                          notification
                        );

                      return (
                        <div
                          key={
                            notification.id
                          }
                          onClick={() =>
                            handleNotificationClick(
                              notification
                            )
                          }
                          style={{
                            padding:
                              "15px",
                            cursor:
                              "pointer",
                            background:
                              notification.read
                                ? "#fff"
                                : "#fdfbf7",
                            borderBottom:
                              "1px solid #f0eeec",
                            position:
                              "relative",
                            transition:
                              "background 0.2s",
                          }}
                        >

                          <div
                            style={{
                              display:
                                "flex",
                              gap:
                                "12px",
                            }}
                          >

                            {/* ICON */}

                            <div
                              style={{
                                width:
                                  "42px",
                                height:
                                  "42px",
                                borderRadius:
                                  "50%",
                                background:
                                  "#fbf8f2",
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                flexShrink:
                                  0,
                                fontSize:
                                  "20px",
                              }}
                            >
                              {
                                typeInfo.icon
                              }
                            </div>

                            {/* CONTENT */}

                            <div
                              style={{
                                flex: 1,
                                minWidth:
                                  0,
                                paddingRight:
                                  "20px",
                              }}
                            >

                              <div
                                style={{
                                  display:
                                    "flex",
                                  justifyContent:
                                    "space-between",
                                  gap:
                                    "8px",
                                }}
                              >

                                <strong
                                  style={{
                                    fontSize:
                                      "14px",
                                  }}
                                >
                                  {notification.title ||
                                    typeInfo.title}
                                </strong>

                                {notification.read !==
                                  true && (
                                  <span
                                    style={{
                                      width:
                                        "8px",
                                      height:
                                        "8px",
                                      borderRadius:
                                        "50%",
                                      background:
                                        "#cc674e",
                                      marginTop:
                                        "5px",
                                      flexShrink:
                                        0,
                                    }}
                                  />
                                )}
                              </div>

                              <p
                                style={{
                                  margin:
                                    "5px 0",
                                  fontSize:
                                    "13px",
                                  lineHeight:
                                    "1.4",
                                  color:
                                    "#4b463d",
                                }}
                              >
                                {notification.message ||
                                  "You have a new notification."}
                              </p>

                              {notification.orderId && (
                                <p
                                  style={{
                                    margin:
                                      "5px 0",
                                    fontSize:
                                      "12px",
                                    fontWeight:
                                      "600",
                                  }}
                                >
                                  Order: #
                                  {notification.orderId
                                    .slice(
                                      0,
                                      10
                                    )
                                    .toUpperCase()}
                                </p>
                              )}

                              {notification.customerName && (
                                <p
                                  style={{
                                    margin:
                                      "4px 0",
                                    fontSize:
                                      "12px",
                                  }}
                                >
                                  Customer:{" "}
                                  {
                                    notification.customerName
                                  }
                                </p>
                              )}

                              {notification.totalAmount !==
                                undefined && (
                                <p
                                  style={{
                                    margin:
                                      "4px 0",
                                    fontSize:
                                      "12px",
                                    fontWeight:
                                      "600",
                                  }}
                                >
                                  Total: ₹
                                  {Number(
                                    notification.totalAmount ||
                                      0
                                  ).toLocaleString(
                                    "en-IN"
                                  )}
                                </p>
                              )}

                              <small
                                style={{
                                  display:
                                    "block",
                                  marginTop:
                                    "8px",
                                  opacity:
                                    0.6,
                                  fontSize:
                                    "11px",
                                }}
                              >
                                {formatNotificationTime(
                                  notification.createdAt
                                )}
                              </small>
                            </div>

                            {/* DELETE */}

                            <button
                              type="button"
                              onClick={(event) =>
                                deleteNotification(
                                  notification.id,
                                  event
                                )
                              }
                              style={{
                                position:
                                  "absolute",
                                top:
                                  "12px",
                                right:
                                  "10px",
                                width:
                                  "25px",
                                height:
                                  "25px",
                                border:
                                  "none",
                                background:
                                  "transparent",
                                cursor:
                                  "pointer",
                                fontSize:
                                  "14px",
                                opacity:
                                  0.55,
                              }}
                              title="Delete notification"
                            >
                              🗑️
                            </button>

                          </div>
                        </div>
                      );
                    }
                  )
                )}

                {/* =================================================
                    FOOTER
                ================================================= */}

                {notifications.some(
                  (notification) =>
                    notification.read === true
                ) && (
                  <div
                    style={{
                      padding: "12px 16px",
                      borderTop:
                        "1px solid #f0eeec",
                      textAlign: "center",
                    }}
                  >
                    <button
                      type="button"
                      onClick={
                        clearReadNotifications
                      }
                      style={{
                        border: "none",
                        background:
                          "transparent",
                        color: "#c6573c",
                        cursor:
                          "pointer",
                        fontSize: "12px",
                        fontWeight:
                          "700",
                      }}
                    >
                      🗑️ Clear read notifications
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* ORDERS COUNT */}

          <div className="orders-count">
            {normalizedSearchTerm
              ? `${filteredOrders.length} of ${orders.length} Orders`
              : `${orders.length} Orders`}
          </div>
        </div>
      </div>

      <div className="admin-orders-toolbar">
        <label htmlFor="admin-order-search">
          Search orders
        </label>

        <div className="admin-order-search">
          <span aria-hidden="true">⌕</span>

          <input
            id="admin-order-search"
            type="search"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            placeholder="Order ID, customer, phone, product, email..."
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              aria-label="Clear order search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* =================================================
          ORDER LIST
      ================================================= */}

      <div className="admin-orders-list">

          {filteredOrders.length === 0 ? (

          <div className="no-orders">
            <div>📦</div>

            <h2>
              {orders.length === 0
                ? "No Orders Found"
                : "No Matching Orders"}
            </h2>

            <p>
              {orders.length === 0
                ? "Customer orders will appear here."
                : "Try a different search term."}
            </p>
          </div>

        ) : (

          filteredOrders.map((order) => {

            const status =
              order.status ||
              order.orderStatus ||
              "placed";

            const statusInfo =
              getStatusInfo(status);

            const paymentStatus =
              order.paymentStatus ||
              "verification_pending";

            const paymentInfo =
              getPaymentStatusInfo(
                paymentStatus
              );

            const isSelected =
              selectedOrderId ===
              order.id;

            const isVerifying =
              verifyingPaymentId ===
              order.id;

            return (
              <div
                className={`admin-order-card ${
                  isSelected
                    ? "selected-order"
                    : ""
                }`}
                key={order.id}
                id={`order-${order.id}`}
                style={
                  isSelected
                    ? {
                        outline:
                          "3px solid #97772c",
                        outlineOffset:
                          "3px",
                      }
                    : undefined
                }
              >

                {/* =================================================
                    ORDER TOP
                ================================================= */}

                <div className="admin-order-top">

                  <div>

                    <span className="order-label">
                      ORDER ID
                    </span>

                    <h3>
                      #
                      {order.id
                        .slice(
                          0,
                          10
                        )
                        .toUpperCase()}
                    </h3>

                    <small>
                      {formatDate(
                        order.createdAt
                      )}
                    </small>

                  </div>

                  <div
                    className={`admin-status-badge status-${status}`}
                  >
                    {statusInfo.icon}{" "}
                    {statusInfo.label}
                  </div>
                </div>

                {/* =================================================
                    CUSTOMER INFO
                ================================================= */}

                <div className="admin-order-info">

                  <div>
                    <span>
                      Customer
                    </span>

                    <strong>
                      {order.customerName ||
                        order.deliveryAddress
                          ?.name ||
                        order.name ||
                        "Customer"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Phone
                    </span>

                    <strong>
                      {order.customerPhone ||
                        order.deliveryAddress
                          ?.phone ||
                        "N/A"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Items
                    </span>

                    <strong>
                      {Array.isArray(
                        order.items
                      )
                        ? order.items.reduce(
                            (
                              count,
                              item
                            ) =>
                              count +
                              Number(
                                item.quantity ||
                                  1
                              ),
                            0
                          )
                        : order.quantity ||
                          1}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Total
                    </span>

                    <strong>
                      ₹
                      {getTotal(
                        order
                      ).toLocaleString(
                        "en-IN"
                      )}
                    </strong>
                  </div>

                </div>

                {/* =================================================
                    DELIVERY ADDRESS
                ================================================= */}

                {order.deliveryAddress && (
                  <div
                    style={{
                      marginTop:
                        "15px",
                      padding:
                        "14px",
                      borderRadius:
                        "10px",
                      background:
                        "#f8f8f8",
                    }}
                  >
                    <span
                      style={{
                        display:
                          "block",
                        fontSize:
                          "12px",
                        fontWeight:
                          "600",
                        marginBottom:
                          "5px",
                        opacity:
                          0.7,
                      }}
                    >
                      DELIVERY ADDRESS
                    </span>

                    <p
                      style={{
                        margin: 0,
                        lineHeight:
                          "1.5",
                        fontSize:
                          "13px",
                      }}
                    >
                      {
                        order
                          .deliveryAddress
                          .address
                      }
                      ,{" "}
                      {
                        order
                          .deliveryAddress
                          .city
                      }
                      ,{" "}
                      {
                        order
                          .deliveryAddress
                          .state
                      }{" "}
                      -{" "}
                      {
                        order
                          .deliveryAddress
                          .pincode
                      }
                    </p>
                  </div>
                )}

                {/* =================================================
                    PRODUCTS
                ================================================= */}

                {Array.isArray(
                  order.items
                ) && (
                  <div
                    style={{
                      marginTop:
                        "15px",
                    }}
                  >

                    <span
                      style={{
                        display:
                          "block",
                        fontSize:
                          "12px",
                        fontWeight:
                          "600",
                        marginBottom:
                          "10px",
                        opacity:
                          0.7,
                      }}
                    >
                      PRODUCTS
                    </span>

                    {order.items.map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          key={`${order.id}-${index}`}
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap:
                              "12px",
                            padding:
                              "10px 0",
                            borderBottom:
                              "1px solid #f0eeec",
                          }}
                        >

                          <img
                            src={
                              item.productImage ||
                              item.image ||
                              item.imageUrl ||
                              "/placeholder.png"
                            }
                            alt={
                              item.productName ||
                              item.name ||
                              "Product"
                            }
                            style={{
                              width:
                                "55px",
                              height:
                                "55px",
                              objectFit:
                                "cover",
                              borderRadius:
                                "8px",
                            }}
                          />

                          <div
                            style={{
                              flex: 1,
                            }}
                          >

                            <strong
                              style={{
                                display:
                                  "block",
                                fontSize:
                                  "14px",
                              }}
                            >
                              {item.productName ||
                                item.name ||
                                "Product"}
                            </strong>

                            <span
                              style={{
                                fontSize:
                                  "12px",
                                opacity:
                                  0.7,
                              }}
                            >
                              ₹
                              {Number(
                                item.price ||
                                  0
                              ).toLocaleString(
                                "en-IN"
                              )}{" "}
                              ×{" "}
                              {item.quantity ||
                                1}
                            </span>
                          </div>

                          <strong>
                            ₹
                            {Number(
                              item.itemTotal ??
                                Number(
                                  item.price ||
                                    0
                                ) *
                                  Number(
                                    item.quantity ||
                                      1
                                  )
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </strong>

                        </div>
                      )
                    )}
                  </div>
                )}

                {/* =================================================
                    PAYMENT SECTION
                ================================================= */}

                <div
                  style={{
                    marginTop:
                      "18px",
                    padding:
                      "16px",
                    borderRadius:
                      "12px",
                    background:
                      "#fafafa",
                    border:
                      "1px solid #eae9e6",
                  }}
                >

                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      gap:
                        "12px",
                      flexWrap:
                        "wrap",
                    }}
                  >

                    <div>

                      <span
                        style={{
                          display:
                            "block",
                          fontSize:
                            "12px",
                          fontWeight:
                            "700",
                          opacity:
                            0.65,
                          marginBottom:
                            "7px",
                        }}
                      >
                        PAYMENT
                      </span>

                      <strong
                        style={{
                          fontSize:
                            "14px",
                        }}
                      >
                        {(
                          order.paymentMethod ||
                          "N/A"
                        ).toUpperCase()}
                      </strong>

                    </div>

                    <span
                      className={`payment-status-badge ${paymentInfo.className}`}
                      style={{
                        padding:
                          "8px 13px",
                        borderRadius:
                          "20px",
                        fontSize:
                          "12px",
                        fontWeight:
                          "700",
                      }}
                    >
                      {paymentInfo.icon}{" "}
                      Payment Status:{" "}
                      {
                        paymentInfo.label
                      }
                    </span>

                  </div>

                  {/* UTR */}

                  {order.utr && (
                    <div
                      style={{
                        marginTop:
                          "13px",
                        padding:
                          "10px 12px",
                        background:
                          "#fff",
                        borderRadius:
                          "8px",
                        border:
                          "1px solid #e8e6e2",
                      }}
                    >

                      <span
                        style={{
                          fontSize:
                            "11px",
                          fontWeight:
                            "700",
                          opacity:
                            0.6,
                        }}
                      >
                        UTR / TRANSACTION ID
                      </span>

                      <strong
                        style={{
                          display:
                            "block",
                          marginTop:
                            "4px",
                          fontSize:
                            "14px",
                          letterSpacing:
                            "0.5px",
                        }}
                      >
                        {order.utr}
                      </strong>

                    </div>
                  )}

                  {/* PAYMENT BUTTONS */}

                  {paymentStatus ===
                    "verification_pending" && (
                    <div
                      style={{
                        display:
                          "flex",
                        gap:
                          "10px",
                        marginTop:
                          "14px",
                        flexWrap:
                          "wrap",
                      }}
                    >

                      <button
                        type="button"
                        onClick={() =>
                          verifyPayment(
                            order
                          )
                        }
                        disabled={
                          isVerifying
                        }
                        style={{
                          border:
                            "none",
                          borderRadius:
                            "9px",
                          padding:
                            "11px 18px",
                          background:
                            "#33864f",
                          color:
                            "#fff",
                          fontWeight:
                            "700",
                          cursor:
                            isVerifying
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            isVerifying
                              ? 0.6
                              : 1,
                        }}
                      >
                        {isVerifying
                          ? "Verifying..."
                          : "✓ Verify Payment"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          rejectPayment(
                            order
                          )
                        }
                        disabled={
                          isVerifying
                        }
                        style={{
                          border:
                            "1px solid #c6573c",
                          borderRadius:
                            "9px",
                          padding:
                            "11px 18px",
                          background:
                            "#fff",
                          color:
                            "#c6573c",
                          fontWeight:
                            "700",
                          cursor:
                            isVerifying
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            isVerifying
                              ? 0.6
                              : 1,
                        }}
                      >
                        {isVerifying
                          ? "Please wait..."
                          : "✕ Reject Payment"}
                      </button>

                    </div>
                  )}

                  {/* VERIFIED */}

                  {paymentStatus ===
                    "verified" && (
                    <div
                      style={{
                        marginTop:
                          "12px",
                        padding:
                          "10px 12px",
                        borderRadius:
                          "8px",
                        background:
                          "#f0f9f3",
                        color:
                          "#225934",
                        fontSize:
                          "13px",
                        fontWeight:
                          "600",
                      }}
                    >
                      ✓ Payment verified successfully
                    </div>
                  )}

                  {/* FAILED */}

                  {(paymentStatus ===
                    "failed" ||
                    paymentStatus ===
                      "rejected") && (
                    <div
                      style={{
                        marginTop:
                          "12px",
                        padding:
                          "10px 12px",
                        borderRadius:
                          "8px",
                        background:
                          "#fcf6f4",
                        color:
                          "#a54730",
                        fontSize:
                          "13px",
                        fontWeight:
                          "600",
                      }}
                    >
                      ✕ Payment verification failed
                    </div>
                  )}

                </div>

                {/* =================================================
                    ORDER STATUS
                ================================================= */}

                <div className="admin-status-section">

                  <label>
                    Order Status
                  </label>

                  <div className="status-update-row">

                    <select
                      value={status}
                      onChange={(e) =>
                        updateOrderStatus(
                          order.id,
                          e.target.value
                        )
                      }
                      disabled={
                        updatingId ===
                        order.id
                      }
                    >

                      {statusOptions.map(
                        (option) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {option.icon}{" "}
                            {option.label}
                          </option>
                        )
                      )}

                    </select>

                    {updatingId ===
                    order.id ? (
                      <span className="updating">
                        Updating...
                      </span>
                    ) : (
                      <span className="saved">
                        ✓ Saved
                      </span>
                    )}

                  </div>
                </div>

                {/* =================================================
                    TRACKING
                ================================================= */}

                {status !==
                  "cancelled" && (
                  <div className="admin-tracking">

                    {statusOptions
                      .slice(0, 6)
                      .map(
                        (
                          step,
                          index
                        ) => {

                          const currentIndex =
                            statusOptions
                              .slice(
                                0,
                                6
                              )
                              .findIndex(
                                (
                                  item
                                ) =>
                                  item.value ===
                                  status
                              );

                          const completed =
                            index <=
                            currentIndex;

                          return (
                            <div
                              className={
                                completed
                                  ? "admin-track-step completed"
                                  : "admin-track-step"
                              }
                              key={
                                step.value
                              }
                            >

                              <div className="track-dot">
                                {completed
                                  ? "✓"
                                  : step.icon}
                              </div>

                              <span>
                                {
                                  step.label
                                }
                              </span>

                            </div>
                          );
                        }
                      )}

                  </div>
                )}

              </div>
            );
          })
        )}

      </div>
    </div>
  );
}
