import { useNavigate } from "react-router-dom";

import { useEffect, useState } from "react";

import { signOut } from "firebase/auth";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../../../backend/firebase";

import "./Admin.css";

export default function Admin() {
  // =====================================================
  // DASHBOARD STATE
  // =====================================================

  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    customers: 0,
    revenue: 0,
  });

  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const CLOUDFLARE_WORKER_URL =
  "https://shopping.gameplay28-4-2008.workers.dev";

const VAPID_PUBLIC_KEY =
  "BCRauPcsTysgOzsurM8u5LGYHmqSQysvx2U9nxA4u51uF1UtPZlR96NduT-QyNpLHR-CQxs3ngjbNQiV-4p7OKo";

 function urlBase64ToUint8Array(base64String) {
  const padding =
    "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 =
    (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((char) =>
      char.charCodeAt(0)
    )
  );
}


const setupAdminNotifications = async () => {
  try {

    // ==========================================
    // Browser Notification Support
    // ==========================================

    if (!("Notification" in window)) {
      return;
    }

    // ==========================================
    // Service Worker Support
    // ==========================================

    if (!("serviceWorker" in navigator)) {
      return;
    }

    // ==========================================
    // Check VAPID KEY
    // ==========================================

    if (
      !VAPID_PUBLIC_KEY ||
      VAPID_PUBLIC_KEY ===
        "YOUR_REAL_VAPID_PUBLIC_KEY"
    ) {
      console.error(
        "❌ VAPID_PUBLIC_KEY is missing"
      );
      return;
    }


    // ==========================================
    // Notification Permission
    // ==========================================

    let permission =
      Notification.permission;

    if (permission !== "granted") {
      permission =
        await Notification.requestPermission();
    }


    if (permission !== "granted") {
      return;
    }

    // ==========================================
    // Register Service Worker
    // ==========================================

    const registration =
      await navigator.serviceWorker.register(
        "/sw.js"
      );


    // ==========================================
    // Wait for Service Worker Ready
    // ==========================================

    const readyRegistration =
      await navigator.serviceWorker.ready;


    // ==========================================
    // Convert VAPID Public Key
    // ==========================================

    const applicationServerKey =
      urlBase64ToUint8Array(
        VAPID_PUBLIC_KEY.trim()
      );


    // VAPID public key MUST be 65 bytes
    if (
      applicationServerKey.length !== 65
    ) {
      console.error(
        "❌ Invalid VAPID public key."
      );

      console.error(
        "Expected: 65 bytes"
      );

      console.error(
        "Received:",
        applicationServerKey.length,
        "bytes"
      );

      return;
    }

    // ==========================================
    // Existing Subscription
    // ==========================================

    let subscription =
      await readyRegistration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      subscription = null;
    }

    // ==========================================
    // Create New Subscription
    // ==========================================

    if (!subscription) {

      subscription =
        await readyRegistration.pushManager.subscribe(
          {
            userVisibleOnly: true,

            applicationServerKey:
              applicationServerKey,
          }
        );

    } else {
    }

    // ==========================================
    // Send Subscription to Cloudflare
    // ==========================================

    const response = await fetch(
      `${CLOUDFLARE_WORKER_URL}/subscribe`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          subscription
        ),
      }
    );

    const result =
      await response.json();


    if (!response.ok) {
      console.error(
        "❌ Cloudflare subscription failed:",
        result
      );

      return;
    }

    if (result.success) {
    }
  } catch (error) {
    console.error(
      "❌ Admin notification setup failed:",
      error
    );
  }
};

useEffect(() => {
  setupAdminNotifications();
}, []);
  // =====================================================
  // LOAD DASHBOARD DATA
  // =====================================================

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [
        productsSnapshot,
        ordersSnapshot,
        usersSnapshot,
      ] = await Promise.all([
        getDocs(
          collection(
            db,
            "products"
          )
        ),

        getDocs(
          collection(
            db,
            "orders"
          )
        ),

        getDocs(
          collection(
            db,
            "users"
          )
        ),
      ]);

      // =================================================
      // PRODUCTS
      // =================================================

      const productCount =
        productsSnapshot.size;

      // =================================================
      // ORDERS
      // =================================================

      const orderList =
        ordersSnapshot.docs.map(
          (orderDoc) => ({
            id: orderDoc.id,
            ...orderDoc.data(),
          })
        );

      const orderCount =
        orderList.length;

      // =================================================
      // REVENUE
      // Cancelled orders excluded
      // =================================================

      const revenue =
        orderList.reduce(
          (total, order) => {
            const status =
              order.status ||
              order.orderStatus ||
              "placed";

            // Do not include cancelled orders
            if (
              status === "cancelled"
            ) {
              return total;
            }

            const amount =
              Number(
                order.totalAmount ??
                order.grandTotal ??
                order.total ??
                order.amount ??
                0
              );

            return (
              total +
              (
                Number.isFinite(amount)
                  ? amount
                  : 0
              )
            );
          },
          0
        );

      // =================================================
      // CUSTOMERS
      // Admin excluded
      // =================================================

      const customerCount =
        usersSnapshot.docs.filter(
          (userDoc) => {
            const user =
              userDoc.data();

            return (
              user.role !== "admin"
            );
          }
        ).length;

      // =================================================
      // UPDATE STATS
      // =================================================

      setStats({
        products: productCount,
        orders: orderCount,
        customers: customerCount,
        revenue: revenue,
      });

    } catch (error) {
      console.error(
        "Dashboard error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadDashboard();
  }, []);

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout =
    async () => {
      try {
        await signOut(auth);

        navigate("/login");

      } catch (error) {
        console.error(
          "Logout error:",
          error
        );

        alert(
          "Failed to logout"
        );
      }
    };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">
        </div>

        <p>
          Loading dashboard...
        </p>
      </div>
    );
  }

  // =====================================================
  // ADMIN DASHBOARD UI
  // =====================================================

  return (
    <div className="admin-dashboard">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="dashboard-header">

        <div>

          <span className="dashboard-label">
            ADMIN PANEL
          </span>

          <h1>
            Dashboard
          </h1>

          <p>
            Welcome back. Here's what's
            happening with your store today.
          </p>

        </div>

      </div>

      {/* =================================================
          DASHBOARD ACTIONS
      ================================================= */}

      <div className="dashboard-actions">

        {/* ADD PRODUCT */}

        <button
          className="add-product-btn"
          onClick={() =>
            navigate("/add-pro")
          }
        >
          <span>
            +
          </span>

          Add Product
        </button>

        {/* REFRESH */}

        <button
          className="refresh-btn"
          onClick={
            loadDashboard
          }
        >
          <span>
            ↻
          </span>

          Refresh
        </button>

        {/* LOGOUT */}

        <button
          className="logout-button"
          onClick={
            handleLogout
          }
        >
          <span className="action-icon">
            ↪
          </span>

          <span>
            Logout
          </span>
        </button>

        {/* HOME */}

        <button
          className="home-button"
          onClick={() =>
            navigate("/")
          }
        >
          <span className="action-icon">
            ⌂
          </span>

          <span>
            Home
          </span>
        </button>

        {/* ORDERS */}

        <button
          className="orders-button"
          onClick={() =>
            navigate("/ad-order")
          }
        >
          <span className="action-icon">
            ◫
          </span>

          <span>
            Orders
          </span>
        </button>

      </div>

      {/* =================================================
          STAT CARDS
      ================================================= */}

      <div className="stats-grid">

        {/* PRODUCTS */}

        <div className="stat-card">

          <div className="stat-top">

            <div className="stat-icon products">
              <span>
                ▦
              </span>
            </div>

            <span className="stat-badge">
              Active
            </span>

          </div>

          <div className="stat-content">

            <p>
              Total Products
            </p>

            <h2>
              {stats.products}
            </h2>

          </div>

          <div className="stat-footer">
            <span>
              Products in store
            </span>
          </div>

        </div>

        {/* ORDERS */}

        <div className="stat-card">

          <div className="stat-top">

            <div className="stat-icon orders">
              <span>
                ◫
              </span>
            </div>

            <span className="stat-badge">
              Orders
            </span>

          </div>

          <div className="stat-content">

            <p>
              Total Orders
            </p>

            <h2>
              {stats.orders}
            </h2>

          </div>

          <div className="stat-footer">
            <span>
              All customer orders
            </span>
          </div>

        </div>

        {/* CUSTOMERS */}

        <div className="stat-card">

          <div className="stat-top">

            <div className="stat-icon customers">
              <span>
                ♙
              </span>
            </div>

            <span className="stat-badge">
              Users
            </span>

          </div>

          <div className="stat-content">

            <p>
              Total Customers
            </p>

            <h2>
              {stats.customers}
            </h2>

          </div>

          <div className="stat-footer">
            <span>
              Registered customers
            </span>
          </div>

        </div>

        {/* REVENUE */}

        <div className="stat-card revenue-stat">

          <div className="stat-top">

            <div className="stat-icon revenue">
              <span>
                ₹
              </span>
            </div>

            <span className="stat-badge revenue-badge">
              Revenue
            </span>

          </div>

          <div className="stat-content">

            <p>
              Total Revenue
            </p>

            <h2>
              ₹
              {stats.revenue.toLocaleString(
                "en-IN"
              )}
            </h2>

          </div>

          <div className="stat-footer">
            <span>
              From non-cancelled orders
            </span>
          </div>

        </div>

      </div>

      {/* =================================================
          MAIN GRID
      ================================================= */}

      <div className="dashboard-main-grid">

        {/* =================================================
            REVENUE OVERVIEW
        ================================================= */}

        <div className="dashboard-card revenue-overview">

          <div className="card-header">

            <div>

              <span className="card-label">
                FINANCIAL OVERVIEW
              </span>

              <h2>
                Revenue Overview
              </h2>

              <p>
                Your total store revenue
              </p>

            </div>

            <div className="revenue-icon-large">
              ₹
            </div>

          </div>

          <div className="big-revenue">
            ₹
            {stats.revenue.toLocaleString(
              "en-IN"
            )}
          </div>

          <div className="revenue-meta">

            <div>

              <span className="meta-dot">
              </span>

              <span>
                Revenue generated
              </span>

            </div>

            <span className="meta-value">
              {stats.orders} orders
            </span>

          </div>

          <div className="revenue-line">

            <div
              className="revenue-progress"
              style={{
                width:
                  stats.orders > 0
                    ? "75%"
                    : "0%",
              }}
            >
            </div>

          </div>

        </div>

        {/* =================================================
            WEBSITE STATUS
        ================================================= */}

        <div className="dashboard-card status-overview">

          <div className="card-header">

            <div>

              <span className="card-label">
                SYSTEM MONITOR
              </span>

              <h2>
                Website Status
              </h2>

              <p>
                Current system health
              </p>

            </div>

            <div className="system-status">

              <span>
              </span>

              Healthy

            </div>

          </div>

          <div className="status-list">

            {/* WEBSITE */}

            <div className="status-row">

              <div className="status-info">

                <div className="status-symbol">
                  ◉
                </div>

                <div>

                  <strong>
                    Website
                  </strong>

                  <small>
                    Frontend application
                  </small>

                </div>

              </div>

              <span className="online">
                Online
              </span>

            </div>

            {/* FIREBASE */}

            <div className="status-row">

              <div className="status-info">

                <div className="status-symbol">
                  ◈
                </div>

                <div>

                  <strong>
                    Firebase
                  </strong>

                  <small>
                    Database connection
                  </small>

                </div>

              </div>

              <span className="online">
                Connected
              </span>

            </div>

            {/* PRODUCTS */}

            <div className="status-row">

              <div className="status-info">

                <div className="status-symbol">
                  ◇
                </div>

                <div>

                  <strong>
                    Products
                  </strong>

                  <small>
                    Firestore collection
                  </small>

                </div>

              </div>

              <span className="online">
                Active
              </span>

            </div>

            {/* ORDERS */}

            <div className="status-row">

              <div className="status-info">

                <div className="status-symbol">
                  ◇
                </div>

                <div>

                  <strong>
                    Orders
                  </strong>

                  <small>
                    Firestore collection
                  </small>

                </div>

              </div>

              <span className="online">
                Active
              </span>

            </div>

          </div>

        </div>

      </div>

      {/* =================================================
          STORE SUMMARY
      ================================================= */}

      <div className="dashboard-card summary-card">

        <div className="card-header summary-header">

          <div>

            <span className="card-label">
              STORE PERFORMANCE
            </span>

            <h2>
              Store Summary
            </h2>

            <p>
              Quick overview of your
              e-commerce platform
            </p>

          </div>

        </div>

        <div className="summary-grid">

          {/* PRODUCTS */}

          <div className="summary-item">

            <span>
              Products
            </span>

            <strong>
              {stats.products}
            </strong>

            <small>
              Available in store
            </small>

          </div>

          {/* ORDERS */}

          <div className="summary-item">

            <span>
              Orders
            </span>

            <strong>
              {stats.orders}
            </strong>

            <small>
              Total orders received
            </small>

          </div>

          {/* CUSTOMERS */}

          <div className="summary-item">

            <span>
              Customers
            </span>

            <strong>
              {stats.customers}
            </strong>

            <small>
              Customer accounts
            </small>

          </div>

          {/* REVENUE */}

          <div className="summary-item">

            <span>
              Revenue
            </span>

            <strong>
              ₹
              {stats.revenue.toLocaleString(
                "en-IN"
              )}
            </strong>

            <small>
              Current total revenue
            </small>

          </div>

        </div>

      </div>

    </div>
  );
}