import "./Profile.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { auth, db } from "../../../backend/firebase";

import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import {
  onAuthStateChanged,
  signOut,
  updateProfile,
} from "firebase/auth";


export default function Profile() {

  const navigate = useNavigate();

  // =========================
  // USER
  // =========================

  const [user, setUser] = useState(null);


  // =========================
  // EDIT MODE
  // =========================

  const [isEditing, setIsEditing] = useState(false);


  // =========================
  // FORM
  // =========================

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    photo: "",
  });


  // =========================
  // SAVING
  // =========================

  const [saving, setSaving] = useState(false);


  // =========================
  // REAL FIREBASE STATS
  // =========================

  const [stats, setStats] = useState({
    orders: 0,
    wishlist: 0,
    addresses: 0,
    payments: 0,
  });


  // =========================
  // NAVIGATION
  // =========================

  const goHome = () => {
    navigate("/");
  };


  const goLogin = () => {
    navigate("/login");
  };


  const goOrders = () => {
    navigate("/orders");
  };


  const goWishlist = () => {
    navigate("/wish");
  };


  const goAddress = () => {
    navigate("/address");
  };


  // =========================
  // LOAD USER STATS
  // =========================

  const loadUserStats = async (uid) => {

    try {

      // =========================
      // ORDERS
      // =========================

      const ordersQuery = query(
        collection(db, "orders"),
        where("userId", "==", uid)
      );

      const ordersSnap =
        await getDocs(ordersQuery);


      // =========================
      // WISHLIST
      // =========================

      const wishlistRef = collection(
        db,
        "users",
        uid,
        "wishlist"
      );

      const wishlistSnap =
        await getDocs(wishlistRef);


      // =========================
      // ADDRESSES
      // =========================

      const addressesRef = collection(
        db,
        "users",
        uid,
        "addresses"
      );

      const addressesSnap =
        await getDocs(addressesRef);


      // =========================
      // PAYMENTS
      // =========================

      const paymentsQuery = query(
        collection(db, "payments"),
        where("userId", "==", uid)
      );

      const paymentsSnap =
        await getDocs(paymentsQuery);


      // =========================
      // SET STATS
      // =========================

      setStats({
        orders: ordersSnap.size,
        wishlist: wishlistSnap.size,
        addresses: addressesSnap.size,
        payments: paymentsSnap.size,
      });

    } catch (error) {

      console.error(
        "Failed to load profile stats:",
        error
      );

      setStats({
        orders: 0,
        wishlist: 0,
        addresses: 0,
        payments: 0,
      });
    }
  };


  // =========================
  // GET USER DATA
  // =========================

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {

          // =========================
          // NOT LOGGED IN
          // =========================

          if (!currentUser) {

            setUser(false);

            return;
          }


          // =========================
          // DEFAULT PROFILE
          // =========================

          let profile = {

            uid: currentUser.uid,

            name:
              currentUser.displayName || "",

            email:
              currentUser.email || "",

            phone:
              currentUser.phoneNumber || "",

            photo:
              currentUser.photoURL || "",

            address: "",
          };


          try {

            // =========================
            // FIRESTORE USER
            // =========================

            const userRef = doc(
              db,
              "users",
              currentUser.uid
            );


            const userSnap =
              await getDoc(userRef);


            if (userSnap.exists()) {

              const data =
                userSnap.data();


              profile = {

                ...profile,

                ...data,


                phone:
                  data.phone ||
                  data.phoneNumber ||
                  currentUser.phoneNumber ||
                  "",


                address:
                  data.address || "",


                photo:
                  data.photo ||
                  data.photoURL ||
                  currentUser.photoURL ||
                  "",
              };
            }

          } catch (error) {

            console.error(
              "Profile loading error:",
              error
            );
          }


          // =========================
          // SET USER
          // =========================

          setUser(profile);


          // =========================
          // SET FORM
          // =========================

          setForm({

            name:
              profile.name || "",

            phone:
              profile.phone || "",

            address:
              profile.address || "",

            photo:
              profile.photo || "",
          });


          // =========================
          // LOAD STATS
          // =========================

          await loadUserStats(
            currentUser.uid
          );
        }
      );


    return () => unsubscribe();

  }, []);


  // =========================
  // FORM CHANGE
  // =========================

  const handleChange = (e) => {

    const {
      name,
      value,
    } = e.target;


    setForm((prev) => ({

      ...prev,

      [name]: value,
    }));
  };


  // =========================
  // SAVE PROFILE
  // =========================

  const handleSave = async () => {

    if (!auth.currentUser) {
      return;
    }


    setSaving(true);


    try {

      const uid =
        auth.currentUser.uid;


      // =========================
      // FIRESTORE USER
      // =========================

      const userRef = doc(
        db,
        "users",
        uid
      );


      // =========================
      // SAVE USER
      // =========================

      await setDoc(
        userRef,
        {

          name:
            form.name.trim(),

          phone:
            form.phone.trim(),

          address:
            form.address.trim(),

          photo:
            form.photo.trim(),

          email:
            auth.currentUser.email || "",

          uid:
            uid,

        },
        {
          merge: true,
        }
      );


      // =========================
      // UPDATE FIREBASE AUTH
      // =========================

      await updateProfile(
        auth.currentUser,
        {

          displayName:
            form.name.trim(),

          photoURL:
            form.photo.trim() || null,

        }
      );


      // =========================
      // UPDATE UI
      // =========================

      setUser((prev) => ({

        ...prev,

        name:
          form.name.trim(),

        phone:
          form.phone.trim(),

        address:
          form.address.trim(),

        photo:
          form.photo.trim(),

      }));


      setIsEditing(false);


      alert(
        "Profile updated successfully!"
      );

    } catch (error) {

      console.error(
        "Profile update error:",
        error
      );

      alert(
        "Failed to update profile."
      );

    } finally {

      setSaving(false);
    }
  };


  // =========================
  // CANCEL EDIT
  // =========================

  const handleCancel = () => {

    setForm({

      name:
        user.name || "",

      phone:
        user.phone || "",

      address:
        user.address || "",

      photo:
        user.photo || "",
    });


    setIsEditing(false);
  };


  // =========================
  // LOGOUT
  // =========================

  const sout = async () => {

    try {

      await signOut(auth);

      navigate("/login");

    } catch (error) {

      console.error(
        "Logout failed:",
        error
      );
    }
  };


  // =========================
  // LOADING
  // =========================

  if (user === null) {

    return (

      <div className="profile-page loading-page">

        <div className="loader"></div>

        <p>
          Loading your profile...
        </p>

      </div>
    );
  }


  // =========================
  // LOGIN REQUIRED
  // =========================

  if (user === false) {

    return (

      <div className="profile-page login-required">

        <div className="login-box">

          <div className="login-icon">
            🔐
          </div>


          <h2>
            Login Required
          </h2>


          <p>
            Please login to view your
            profile.
          </p>


          <button
            onClick={goLogin}
          >
            Go to Login
          </button>

        </div>

      </div>
    );
  }


  // =========================
  // FIRST LETTER
  // =========================

  const firstLetter = (

    user.name ||
    user.email ||
    "U"

  )
    .charAt(0)
    .toUpperCase();


  // =========================
  // PAGE
  // =========================

  return (

    <div className="profile-page">


      {/* =========================
          HEADER
      ========================= */}

      <div className="profile-header">

        <div>

          <p className="profile-label">
            MY ACCOUNT
          </p>


          <h1>
            My Profile
          </h1>


          <p className="profile-subtitle">
            Manage your account and
            personal information
          </p>

        </div>


        <button
          className="back-btn"
          onClick={goHome}
        >
          ← Back to Shop
        </button>

      </div>



      <div className="profile-container">


        {/* =========================
            PROFILE CARD
        ========================= */}

        <div className="profile-main-card">

          <div className="profile-cover"></div>


          <div className="profile-info">


            {/* PROFILE IMAGE */}

            <div className="profile-avatar-wrapper">

              {user.photo ? (

                <img
                  src={user.photo}
                  alt="Profile"
                  className="profile-img"

                  onError={(e) => {

                    e.target.style.display =
                      "none";


                    if (
                      e.target.nextElementSibling
                    ) {

                      e.target.nextElementSibling.style.display =
                        "flex";
                    }

                  }}
                />

              ) : null}


              <div
                className="avatar"

                style={{
                  display: user.photo
                    ? "none"
                    : "flex",
                }}
              >

                {firstLetter}

              </div>

            </div>



            {/* USER DETAILS */}

            <div className="profile-details">

              {!isEditing ? (

                <>

                  <h2>
                    {user.name ||
                      "Welcome User"}
                  </h2>


                  <p className="email">
                    ✉ {user.email}
                  </p>


                  <p className="phone">
                    ☎{" "}
                    {user.phone ||
                      "Phone number not added"}
                  </p>

                </>

              ) : (

                <div className="edit-profile-inline">

                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Full Name"
                  />


                  <p className="email">
                    ✉ {user.email}
                  </p>


                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Phone Number"
                  />

                </div>
              )}

            </div>



            {/* EDIT / SAVE */}

            {!isEditing ? (

              <button
                className="edit-btn"
                onClick={() =>
                  setIsEditing(true)
                }
              >
                ✎ Edit Profile
              </button>

            ) : (

              <div className="edit-actions">

                <button
                  className="save-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "✓ Save"}
                </button>


                <button
                  className="cancel-btn"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>

              </div>
            )}

          </div>

        </div>



        {/* =========================
            EDIT PROFILE DETAILS
        ========================= */}

        {isEditing && (

          <div className="edit-details-card">

            <div className="card-title">

              <div>

                <h3>
                  Edit Profile Details
                </h3>

                <p>
                  Update your personal
                  information
                </p>

              </div>

            </div>



            <div className="edit-form">


              {/* NAME */}

              <div className="form-group">

                <label>
                  Full Name
                </label>


                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                />

              </div>



              {/* PHONE */}

              <div className="form-group">

                <label>
                  Phone Number
                </label>


                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />

              </div>



              {/* ADDRESS */}

              <div className="form-group full">

                <label>
                  Address
                </label>


                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Enter your address"
                  rows="3"
                ></textarea>

              </div>



              {/* PHOTO */}

              <div className="form-group full">

                <label>
                  Profile Photo URL
                </label>


                <input
                  type="url"
                  name="photo"
                  value={form.photo}
                  onChange={handleChange}
                  placeholder="https://example.com/photo.jpg"
                />


                <small>
                  Enter an image URL for
                  your profile picture.
                </small>

              </div>

            </div>

          </div>
        )}



        {/* =========================
            QUICK STATS
        ========================= */}

        <div className="stats-grid">


          {/* ORDERS */}

          <div
            className="stat-card"
            onClick={goOrders}
            style={{
              cursor: "pointer",
            }}
          >

            <div className="stat-icon">
              📦
            </div>


            <div>

              <span>
                Total Orders
              </span>


              <strong>
                {stats.orders}
              </strong>

            </div>

          </div>



          {/* WISHLIST */}

          <div
            className="stat-card"
            onClick={goWishlist}
            style={{
              cursor: "pointer",
            }}
          >

            <div className="stat-icon">
              ♡
            </div>


            <div>

              <span>
                Wishlist
              </span>


              <strong>
                {stats.wishlist}
              </strong>

            </div>

          </div>



          {/* ADDRESSES */}

          <div
            className="stat-card"
            onClick={goAddress}
            style={{
              cursor: "pointer",
            }}
          >

            <div className="stat-icon">
              ⌖
            </div>


            <div>

              <span>
                Addresses
              </span>


              <strong>
                {stats.addresses}
              </strong>

            </div>

          </div>



          {/* PAYMENTS */}

          <div className="stat-card">

            <div className="stat-icon">
              ▣
            </div>


            <div>

              <span>
                Payments
              </span>


              <strong>
                {stats.payments}
              </strong>

            </div>

          </div>

        </div>



        {/* =========================
            CONTENT
        ========================= */}

        <div className="content-grid">


          {/* =========================
              PERSONAL INFORMATION
          ========================= */}

          <div className="info-card">

            <div className="card-title">

              <div>

                <h3>
                  Personal Information
                </h3>


                <p>
                  Your account details
                </p>

              </div>


              <span className="verified">
                ✓ Verified
              </span>

            </div>



            <div className="info-list">


              {/* NAME */}

              <div className="info-row">

                <span className="info-label">
                  Full Name
                </span>


                <span className="info-value">
                  {user.name ||
                    "Not provided"}
                </span>

              </div>



              {/* EMAIL */}

              <div className="info-row">

                <span className="info-label">
                  Email Address
                </span>


                <span className="info-value">
                  {user.email}
                </span>

              </div>



              {/* PHONE */}

              <div className="info-row">

                <span className="info-label">
                  Phone Number
                </span>


                <span className="info-value">
                  {user.phone ||
                    "Not provided"}
                </span>

              </div>



              {/* ADDRESS */}

              <div className="info-row">

                <span className="info-label">
                  Address
                </span>


                <span className="info-value">
                  {user.address ||
                    "No address added"}
                </span>

              </div>

            </div>

          </div>



          {/* =========================
              ACCOUNT SETTINGS
          ========================= */}

          <div className="info-card">

            <div className="card-title">

              <div>

                <h3>
                  Account Settings
                </h3>


                <p>
                  Manage your account
                </p>

              </div>

            </div>



            <div className="settings-list">


              {/* ORDERS */}

              <button
                onClick={goOrders}
                className="setting-item"
              >

                <span className="setting-icon">
                  📦
                </span>


                <div>

                  <strong>
                    My Orders
                  </strong>


                  <small>
                    View your recent orders
                  </small>

                </div>


                <span className="arrow">
                  ›
                </span>

              </button>



              {/* WISHLIST */}

              <button
                onClick={goWishlist}
                className="setting-item"
              >

                <span className="setting-icon">
                  ♡
                </span>


                <div>

                  <strong>
                    Wishlist
                  </strong>


                  <small>
                    Your saved products
                  </small>

                </div>


                <span className="arrow">
                  ›
                </span>

              </button>



              {/* ADDRESS */}

              <button
                onClick={goAddress}
                className="setting-item"
              >

                <span className="setting-icon">
                  ⌖
                </span>


                <div>

                  <strong>
                    My Addresses
                  </strong>


                  <small>
                    Manage delivery addresses
                  </small>

                </div>


                <span className="arrow">
                  ›
                </span>

              </button>

            </div>

          </div>

        </div>



        {/* =========================
            LOGOUT
        ========================= */}

        <div className="logout-section">

          <div>

            <h3>
              Sign out of your account
            </h3>


            <p>
              You can sign in again anytime.
            </p>

          </div>


          <button
            className="logout"
            onClick={sout}
          >
            Logout
          </button>

        </div>

      </div>

    </div>
  );
}
