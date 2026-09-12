import { useState } from "react";
import "./SuperAdmin.css";

function SuperAdmin() {
  const [active, setActive] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const mainMenu = [
    { name: "Dashboard", icon: "▦" },
  ];

  const storeMenu = [
    { name: "Products", icon: "▣" },
    { name: "Orders", icon: "🛒", badge: "12" },
    { name: "Customers", icon: "♙" },
    { name: "Categories", icon: "▤" },
    { name: "Coupons", icon: "🎟" },
    { name: "Banners", icon: "▧" },
    { name: "Reviews", icon: "★", badge: "8" },
  ];

  const financeMenu = [
    { name: "Payments", icon: "₹" },
    { name: "Reports", icon: "▥" },
  ];

  const managementMenu = [
    { name: "Admins & Staff", icon: "♙" },
    { name: "Roles & Permissions", icon: "🔐" },
  ];

  const systemMenu = [
    { name: "Settings", icon: "⚙" },
    { name: "Security", icon: "♢" },
    { name: "Activity Logs", icon: "◷" },
  ];

  const renderMenu = (items) =>
    items.map((item) => (
      <button
        key={item.name}
        className={`menu-item ${
          active === item.name ? "active" : ""
        }`}
        onClick={() => {
          setActive(item.name);
          setSidebarOpen(false);
        }}
      >
        <span className="menu-icon">{item.icon}</span>
        <span className="menu-name">{item.name}</span>

        {item.badge && (
          <span className="menu-badge">{item.badge}</span>
        )}
      </button>
    ));

  return (
    <div className="super-admin">

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <aside
        className={`admin-sidebar ${
          sidebarOpen ? "mobile-open" : ""
        }`}
      >

        {/* LOGO */}
        <div className="brand">
          <div className="brand-logo">N</div>

          <div className="brand-text">
            <h2>RS</h2>
            <span>SUPER ADMIN</span>
          </div>

          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>

        <div className="sidebar-content">

          {/* MAIN */}
          <div className="menu-section">
            <div className="section-title">MAIN</div>
            {renderMenu(mainMenu)}
          </div>

          {/* STORE */}
          <div className="menu-section">
            <div className="section-title">STORE</div>
            {renderMenu(storeMenu)}
          </div>

          {/* FINANCE */}
          <div className="menu-section">
            <div className="section-title">FINANCE</div>
            {renderMenu(financeMenu)}
          </div>

          {/* MANAGEMENT */}
          <div className="menu-section">
            <div className="section-title">MANAGEMENT</div>
            {renderMenu(managementMenu)}
          </div>

          {/* SYSTEM */}
          <div className="menu-section">
            <div className="section-title">SYSTEM</div>
            {renderMenu(systemMenu)}
          </div>

        </div>

        {/* ADMIN PROFILE */}
        <div className="sidebar-profile">

          <div className="profile-avatar">
            SA
          </div>

          <div className="profile-details">
            <strong>Super Admin</strong>
            <span>Administrator</span>
          </div>

          <button className="profile-menu">
            •••
          </button>

        </div>

      </aside>


      {/* ================= MAIN CONTENT ================= */}
      <main className="admin-main">

        {/* HEADER */}
        <header className="admin-header">

          <div className="header-left">

            <button
              className="hamburger"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>

            <div>
              <h1>{active}</h1>
              <p>
                Manage your ecommerce platform
              </p>
            </div>

          </div>


          <div className="header-right">

            {/* SEARCH */}
            <div className="admin-search">
              <span>⌕</span>
              <input
                type="text"
                placeholder="Search..."
              />
              <kbd>Ctrl K</kbd>
            </div>

            {/* NOTIFICATION */}
            <button className="header-button">
              🔔
              <i></i>
            </button>

            {/* ADMIN */}
            <div className="header-admin">

              <div className="header-avatar">
                SA
              </div>

              <div className="header-admin-info">
                <strong>Super Admin</strong>
                <span>
                  <b></b> Online
                </span>
              </div>

              <span className="arrow">⌄</span>

            </div>

          </div>

        </header>


        {/* ================= PAGE ================= */}
        <div className="admin-page">

          {/* WELCOME */}
          <div className="welcome">

            <div>
              <h2>
                Good evening, Super Admin 👋
              </h2>

              <p>
                Here's what's happening with your store today.
              </p>
            </div>

            <button className="date-filter">
              ◷ &nbsp; Aug 30, 2026
              <span>⌄</span>
            </button>

          </div>


          {/* ================= STATS ================= */}
          <div className="stats">

            <div className="stat-card">

              <div className="stat-row">
                <div className="stat-icon revenue">
                  ₹
                </div>

                <span className="growth up">
                  ↑ 12.5%
                </span>
              </div>

              <p>Total Revenue</p>

              <h3>₹24,58,920</h3>

              <small>
                Compared to last month
              </small>

            </div>


            <div className="stat-card">

              <div className="stat-row">
                <div className="stat-icon orders">
                  🛒
                </div>

                <span className="growth up">
                  ↑ 8.2%
                </span>
              </div>

              <p>Total Orders</p>

              <h3>12,842</h3>

              <small>
                Compared to last month
              </small>

            </div>


            <div className="stat-card">

              <div className="stat-row">
                <div className="stat-icon customers">
                  ♙
                </div>

                <span className="growth up">
                  ↑ 5.4%
                </span>
              </div>

              <p>Total Customers</p>

              <h3>48,290</h3>

              <small>
                Compared to last month
              </small>

            </div>


            <div className="stat-card">

              <div className="stat-row">
                <div className="stat-icon products">
                  ▣
                </div>

                <span className="growth down">
                  ↓ 2.1%
                </span>
              </div>

              <p>Total Products</p>

              <h3>8,492</h3>

              <small>
                Compared to last month
              </small>

            </div>

          </div>


          {/* ================= ANALYTICS ================= */}
          <div className="analytics-grid">

            {/* SALES */}
            <div className="card sales-card">

              <div className="card-header">

                <div>
                  <h3>Sales Overview</h3>
                  <p>
                    Revenue performance
                  </p>
                </div>

                <select>
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                  <option>Last 3 Months</option>
                  <option>This Year</option>
                </select>

              </div>


              <div className="chart">

                <div className="chart-values">
                  <span>₹80K</span>
                  <span>₹60K</span>
                  <span>₹40K</span>
                  <span>₹20K</span>
                  <span>₹0</span>
                </div>

                <div className="chart-body">

                  <div className="chart-lines">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>

                  <svg
                    viewBox="0 0 700 240"
                    preserveAspectRatio="none"
                  >

                    <defs>
                      <linearGradient
                        id="areaGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#aa8631"
                          stopOpacity=".22"
                        />

                        <stop
                          offset="100%"
                          stopColor="#aa8631"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>

                    <path
                      d="
                      M0 190
                      C55 175 70 150 115 165
                      C160 180 185 105 230 125
                      C275 145 295 75 345 92
                      C395 108 420 135 465 96
                      C510 58 535 80 580 52
                      C625 25 665 45 700 18
                      L700 240
                      L0 240
                      Z
                      "
                      fill="url(#areaGradient)"
                    />

                    <path
                      d="
                      M0 190
                      C55 175 70 150 115 165
                      C160 180 185 105 230 125
                      C275 145 295 75 345 92
                      C395 108 420 135 465 96
                      C510 58 535 80 580 52
                      C625 25 665 45 700 18
                      "
                      fill="none"
                      stroke="#aa8631"
                      strokeWidth="4"
                    />

                  </svg>

                  <div className="chart-days">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                  </div>

                </div>

              </div>

            </div>


            {/* ORDER STATUS */}
            <div className="card order-card">

              <div className="card-header">
                <div>
                  <h3>Order Status</h3>
                  <p>
                    Current order distribution
                  </p>
                </div>
              </div>

              <div className="donut-wrapper">

                <div className="donut">
                  <div>
                    <strong>12.8K</strong>
                    <span>Orders</span>
                  </div>
                </div>

              </div>

              <div className="legend">

                <div>
                  <span className="dot green"></span>
                  <label>Delivered</label>
                  <strong>7,842</strong>
                </div>

                <div>
                  <span className="dot yellow"></span>
                  <label>Processing</label>
                  <strong>2,486</strong>
                </div>

                <div>
                  <span className="dot blue"></span>
                  <label>Shipped</label>
                  <strong>1,842</strong>
                </div>

                <div>
                  <span className="dot red"></span>
                  <label>Cancelled</label>
                  <strong>672</strong>
                </div>

              </div>

            </div>

          </div>


          {/* ================= BOTTOM ================= */}
          <div className="bottom-grid">

            {/* RECENT ORDERS */}
            <div className="card recent-card">

              <div className="card-header">

                <div>
                  <h3>Recent Orders</h3>
                  <p>
                    Latest customer orders
                  </p>
                </div>

                <button className="view-all">
                  View All →
                </button>

              </div>


              <div className="table-container">

                <table>

                  <thead>
                    <tr>
                      <th>ORDER ID</th>
                      <th>CUSTOMER</th>
                      <th>PRODUCT</th>
                      <th>AMOUNT</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>

                  <tbody>

                    <tr>
                      <td>#NX-82941</td>

                      <td>
                        <div className="customer">
                          <span>AK</span>
                          Arun Kumar
                        </div>
                      </td>

                      <td>iPhone 16 Pro</td>

                      <td>₹1,19,999</td>

                      <td>
                        <b className="status delivered">
                          Delivered
                        </b>
                      </td>
                    </tr>


                    <tr>
                      <td>#NX-82940</td>

                      <td>
                        <div className="customer">
                          <span>RS</span>
                          Rahul S
                        </div>
                      </td>

                      <td>Samsung Galaxy S25</td>

                      <td>₹89,999</td>

                      <td>
                        <b className="status processing">
                          Processing
                        </b>
                      </td>
                    </tr>


                    <tr>
                      <td>#NX-82939</td>

                      <td>
                        <div className="customer">
                          <span>PM</span>
                          Priya M
                        </div>
                      </td>

                      <td>MacBook Air M4</td>

                      <td>₹1,14,900</td>

                      <td>
                        <b className="status shipped">
                          Shipped
                        </b>
                      </td>
                    </tr>

                  </tbody>

                </table>

              </div>

            </div>


            {/* QUICK ACTIONS */}
            <div className="card quick-card">

              <div className="card-header">

                <div>
                  <h3>Quick Actions</h3>
                  <p>
                    Frequently used tools
                  </p>
                </div>

              </div>


              <div className="quick-grid">

                <button>
                  <span>＋</span>
                  <strong>Add Product</strong>
                  <small>
                    Create a new product
                  </small>
                </button>

                <button>
                  <span>▧</span>
                  <strong>Create Banner</strong>
                  <small>
                    Promote your products
                  </small>
                </button>

                <button>
                  <span>🎟</span>
                  <strong>Create Coupon</strong>
                  <small>
                    Launch a discount
                  </small>
                </button>

                <button>
                  <span>▥</span>
                  <strong>View Reports</strong>
                  <small>
                    Analyze your business
                  </small>
                </button>

              </div>

            </div>

          </div>


          {/* ALERTS */}
          <div className="alerts">

            <div className="alert warning">
              <div className="alert-symbol">!</div>

              <div>
                <strong>Low Stock Alert</strong>
                <p>
                  24 products are running low on stock.
                </p>
              </div>

              <button>
                Review →
              </button>
            </div>


            <div className="alert review-alert">
              <div className="alert-symbol">★</div>

              <div>
                <strong>Pending Reviews</strong>
                <p>
                  18 customer reviews are waiting for approval.
                </p>
              </div>

              <button>
                Review →
              </button>
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}

export default SuperAdmin;