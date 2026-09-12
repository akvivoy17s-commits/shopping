import "./Address.css";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { auth, db } from "../../../backend/firebase";

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";


export default function Address() {

  const navigate = useNavigate();


  // =========================
  // USER
  // =========================

  const [user, setUser] = useState(null);


  // =========================
  // ADDRESSES
  // =========================

  const [addresses, setAddresses] = useState([]);


  // =========================
  // LOADING
  // =========================

  const [loading, setLoading] = useState(true);


  // =========================
  // FORM
  // =========================

  const [showForm, setShowForm] = useState(false);


  const [editingId, setEditingId] = useState(null);


  const [saving, setSaving] = useState(false);


  // =========================
  // FORM DATA
  // =========================

  const [form, setForm] = useState({

    name: "",

    phone: "",

    address: "",

    city: "",

    state: "",

    pincode: "",

    type: "Home",

    isDefault: false,

  });


  // =========================
  // AUTH + LOAD ADDRESSES
  // =========================

  useEffect(() => {

    let unsubscribeAddresses = null;


    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        (currentUser) => {

          if (!currentUser) {

            setUser(false);

            setAddresses([]);

            setLoading(false);

            return;
          }


          setUser(currentUser);


          // =========================
          // ADDRESS COLLECTION
          // =========================

          const addressRef = collection(
            db,
            "users",
            currentUser.uid,
            "addresses"
          );


          const addressQuery = query(
            addressRef,
            orderBy("createdAt", "desc")
          );


          // =========================
          // REAL TIME LISTENER
          // =========================

          unsubscribeAddresses =
            onSnapshot(
              addressQuery,
              (snapshot) => {

                const addressList =
                  snapshot.docs.map(
                    (addressDoc) => ({

                      id: addressDoc.id,

                      ...addressDoc.data(),

                    })
                  );


                setAddresses(addressList);

                setLoading(false);
              },

              (error) => {

                console.error(
                  "Address loading error:",
                  error
                );

                setLoading(false);
              }
            );
        }
      );


    return () => {

      unsubscribeAuth();

      if (unsubscribeAddresses) {
        unsubscribeAddresses();
      }
    };

  }, []);


  // =========================
  // FORM CHANGE
  // =========================

  const handleChange = (e) => {

    const {
      name,
      value,
      type,
      checked,
    } = e.target;


    setForm((previous) => ({

      ...previous,

      [name]:
        type === "checkbox"
          ? checked
          : value,

    }));
  };


  // =========================
  // RESET FORM
  // =========================

  const resetForm = () => {

    setForm({

      name:
        user?.displayName || "",

      phone:
        user?.phoneNumber || "",

      address: "",

      city: "",

      state: "",

      pincode: "",

      type: "Home",

      isDefault: false,

    });

    setEditingId(null);

    setShowForm(false);
  };


  // =========================
  // OPEN ADD FORM
  // =========================

  const handleAddAddress = () => {

    setForm({

      name:
        user?.displayName || "",

      phone:
        user?.phoneNumber || "",

      address: "",

      city: "",

      state: "",

      pincode: "",

      type: "Home",

      isDefault:
        addresses.length === 0,

    });


    setEditingId(null);

    setShowForm(true);
  };


  // =========================
  // EDIT ADDRESS
  // =========================

  const handleEdit = (address) => {

    setForm({

      name:
        address.name || "",

      phone:
        address.phone || "",

      address:
        address.address || "",

      city:
        address.city || "",

      state:
        address.state || "",

      pincode:
        address.pincode || "",

      type:
        address.type || "Home",

      isDefault:
        address.isDefault || false,

    });


    setEditingId(address.id);

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };


  // =========================
  // SAVE ADDRESS
  // =========================

  const handleSave = async (e) => {

    e.preventDefault();


    if (!user) {
      return;
    }


    // =========================
    // VALIDATION
    // =========================

    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.address.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.pincode.trim()
    ) {

      alert(
        "Please fill all required fields."
      );

      return;
    }


    if (!/^\d{10}$/.test(form.phone)) {

      alert(
        "Please enter a valid 10 digit phone number."
      );

      return;
    }


    if (!/^\d{6}$/.test(form.pincode)) {

      alert(
        "Please enter a valid 6 digit pincode."
      );

      return;
    }


    setSaving(true);


    try {

      const addressCollection =
        collection(
          db,
          "users",
          user.uid,
          "addresses"
        );


      // =========================
      // IF DEFAULT
      // MAKE OTHER ADDRESSES FALSE
      // =========================

      if (form.isDefault) {

        const updatePromises =
          addresses
            .filter(
              (item) =>
                item.id !== editingId &&
                item.isDefault === true
            )
            .map(
              (item) =>
                updateDoc(
                  doc(
                    db,
                    "users",
                    user.uid,
                    "addresses",
                    item.id
                  ),
                  {
                    isDefault: false,
                  }
                )
            );


        await Promise.all(
          updatePromises
        );
      }


      // =========================
      // EDIT EXISTING
      // =========================

      if (editingId) {

        const addressRef = doc(
          db,
          "users",
          user.uid,
          "addresses",
          editingId
        );


        await updateDoc(
          addressRef,
          {

            name:
              form.name.trim(),

            phone:
              form.phone.trim(),

            address:
              form.address.trim(),

            city:
              form.city.trim(),

            state:
              form.state.trim(),

            pincode:
              form.pincode.trim(),

            type:
              form.type,

            isDefault:
              form.isDefault,

            updatedAt:
              serverTimestamp(),

          }
        );

      }

      // =========================
      // ADD NEW
      // =========================

      else {

        await addDoc(
          addressCollection,
          {

            name:
              form.name.trim(),

            phone:
              form.phone.trim(),

            address:
              form.address.trim(),

            city:
              form.city.trim(),

            state:
              form.state.trim(),

            pincode:
              form.pincode.trim(),

            type:
              form.type,

            isDefault:
              form.isDefault,

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),

          }
        );
      }


      alert(
        editingId
          ? "Address updated successfully!"
          : "Address added successfully!"
      );


      resetForm();

    } catch (error) {

      console.error(
        "Save address error:",
        error
      );

      alert(
        "Failed to save address."
      );

    } finally {

      setSaving(false);
    }
  };


  // =========================
  // DELETE ADDRESS
  // =========================

  const handleDelete = async (id) => {

    if (!user) {
      return;
    }


    const confirmed =
      window.confirm(
        "Are you sure you want to delete this address?"
      );


    if (!confirmed) {
      return;
    }


    try {

      await deleteDoc(
        doc(
          db,
          "users",
          user.uid,
          "addresses",
          id
        )
      );


      alert(
        "Address deleted successfully!"
      );

    } catch (error) {

      console.error(
        "Delete address error:",
        error
      );

      alert(
        "Failed to delete address."
      );
    }
  };


  // =========================
  // SET DEFAULT
  // =========================

  const handleSetDefault = async (id) => {

    if (!user) {
      return;
    }


    try {

      const updatePromises =
        addresses.map(
          (address) =>
            updateDoc(
              doc(
                db,
                "users",
                user.uid,
                "addresses",
                address.id
              ),
              {
                isDefault:
                  address.id === id,
              }
            )
        );


      await Promise.all(
        updatePromises
      );


    } catch (error) {

      console.error(
        "Set default address error:",
        error
      );

      alert(
        "Failed to set default address."
      );
    }
  };


  // =========================
  // LOGIN REQUIRED
  // =========================

  if (user === false) {

    return (

      <div className="address-page login-required">

        <div className="login-box">

          <div className="login-icon">
            🔐
          </div>


          <h2>
            Login Required
          </h2>


          <p>
            Please login to manage
            your addresses.
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

      <div className="address-page">

        <div className="address-loading">

          <div className="loader"></div>

          <p>
            Loading your addresses...
          </p>

        </div>

      </div>
    );
  }


  // =========================
  // PAGE
  // =========================

  return (

    <div className="address-page">


      {/* =========================
          HEADER
      ========================= */}

      <div className="address-header">

        <div>

          <p className="address-label">
            MY ACCOUNT
          </p>


          <h1>
            My Addresses
          </h1>


          <p className="address-subtitle">
            Manage your delivery addresses
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



      <div className="address-container">


        {/* =========================
            ADD BUTTON
        ========================= */}

        {!showForm && (

          <button
            className="add-address-btn"
            onClick={handleAddAddress}
          >
            <span>
              +
            </span>

            Add New Address
          </button>

        )}



        {/* =========================
            ADDRESS FORM
        ========================= */}

        {showForm && (

          <div className="address-form-card">

            <div className="form-header">

              <div>

                <h2>
                  {editingId
                    ? "Edit Address"
                    : "Add New Address"}
                </h2>

                <p>
                  Enter your delivery details
                </p>

              </div>


              <button
                className="close-form-btn"
                onClick={resetForm}
                type="button"
              >
                ×
              </button>

            </div>


            <form
              onSubmit={handleSave}
              className="address-form"
            >


              {/* =========================
                  ADDRESS TYPE
              ========================= */}

              <div className="form-group full">

                <label>
                  Address Type
                </label>


                <div className="address-type-options">

                  {[
                    "Home",
                    "Office",
                    "Other",
                  ].map((type) => (

                    <button
                      key={type}
                      type="button"

                      className={
                        form.type === type
                          ? "type-btn active"
                          : "type-btn"
                      }

                      onClick={() =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            type,
                          })
                        )
                      }
                    >

                      {type === "Home" && "🏠"}

                      {type === "Office" && "🏢"}

                      {type === "Other" && "📍"}

                      <span>
                        {type}
                      </span>

                    </button>

                  ))}

                </div>

              </div>



              {/* =========================
                  NAME
              ========================= */}

              <div className="form-group">

                <label>
                  Full Name *
                </label>


                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  required
                />

              </div>



              {/* =========================
                  PHONE
              ========================= */}

              <div className="form-group">

                <label>
                  Phone Number *
                </label>


                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={(e) => {

                    const value =
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10);


                    setForm(
                      (previous) => ({
                        ...previous,
                        phone: value,
                      })
                    );
                  }}
                  placeholder="10 digit mobile number"
                  maxLength="10"
                  required
                />

              </div>



              {/* =========================
                  ADDRESS
              ========================= */}

              <div className="form-group full">

                <label>
                  Address *
                </label>


                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="House No, Street, Area"
                  rows="3"
                  required
                ></textarea>

              </div>



              {/* =========================
                  CITY
              ========================= */}

              <div className="form-group">

                <label>
                  City *
                </label>


                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                  required
                />

              </div>



              {/* =========================
                  STATE
              ========================= */}

              <div className="form-group">

                <label>
                  State *
                </label>


                <input
                  type="text"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  placeholder="Enter state"
                  required
                />

              </div>



              {/* =========================
                  PINCODE
              ========================= */}

              <div className="form-group">

                <label>
                  Pincode *
                </label>


                <input
                  type="text"
                  name="pincode"
                  value={form.pincode}
                  onChange={(e) => {

                    const value =
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6);


                    setForm(
                      (previous) => ({
                        ...previous,
                        pincode: value,
                      })
                    );
                  }}
                  placeholder="6 digit pincode"
                  maxLength="6"
                  required
                />

              </div>



              {/* =========================
                  DEFAULT
              ========================= */}

              <div className="default-address">

                <label>

                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={
                      form.isDefault
                    }
                    onChange={handleChange}
                  />

                  <span>
                    Make this my default address
                  </span>

                </label>

              </div>



              {/* =========================
                  ACTIONS
              ========================= */}

              <div className="form-actions">

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="save-address-btn"
                  disabled={saving}
                >

                  {saving
                    ? "Saving..."
                    : editingId
                    ? "✓ Update Address"
                    : "✓ Save Address"}

                </button>

              </div>

            </form>

          </div>
        )}



        {/* =========================
            ADDRESS COUNT
        ========================= */}

        {!showForm && (

          <div className="address-count">

            <strong>
              {addresses.length}
            </strong>

            <span>
              {addresses.length === 1
                ? "Saved Address"
                : "Saved Addresses"}
            </span>

          </div>
        )}



        {/* =========================
            EMPTY STATE
        ========================= */}

        {!showForm &&
          addresses.length === 0 && (

            <div className="empty-address">

              <div className="empty-icon">
                📍
              </div>


              <h2>
                No addresses saved
              </h2>


              <p>
                Add a delivery address to
                make checkout faster.
              </p>


              <button
                onClick={handleAddAddress}
              >
                + Add Your First Address
              </button>

            </div>
          )}



        {/* =========================
            ADDRESS LIST
        ========================= */}

        {!showForm &&
          addresses.length > 0 && (

            <div className="address-list">

              {addresses.map(
                (address) => (

                  <div
                    className={
                      address.isDefault
                        ? "address-card default"
                        : "address-card"
                    }
                    key={address.id}
                  >


                    {/* CARD HEADER */}

                    <div className="address-card-header">

                      <div className="address-title">

                        <span className="address-type-icon">

                          {address.type ===
                          "Home"
                            ? "🏠"
                            : address.type ===
                              "Office"
                            ? "🏢"
                            : "📍"}

                        </span>


                        <div>

                          <h3>
                            {address.type ||
                              "Address"}
                          </h3>


                          <p>
                            {address.name}
                          </p>

                        </div>

                      </div>


                      {address.isDefault && (

                        <span className="default-badge">
                          ✓ Default
                        </span>
                      )}

                    </div>



                    {/* ADDRESS */}

                    <div className="address-details">

                      <p>
                        {address.address}
                      </p>


                      <p>
                        {address.city},{" "}
                        {address.state} -{" "}
                        <strong>
                          {address.pincode}
                        </strong>
                      </p>


                      <p className="address-phone">
                        ☎ {address.phone}
                      </p>

                    </div>



                    {/* ACTIONS */}

                    <div className="address-actions">

                      <button
                        className="edit-address"
                        onClick={() =>
                          handleEdit(
                            address
                          )
                        }
                      >
                        ✎ Edit
                      </button>


                      <button
                        className="delete-address"
                        onClick={() =>
                          handleDelete(
                            address.id
                          )
                        }
                      >
                        🗑 Delete
                      </button>


                      {!address.isDefault && (

                        <button
                          className="default-address-btn"
                          onClick={() =>
                            handleSetDefault(
                              address.id
                            )
                          }
                        >
                          ✓ Set Default
                        </button>
                      )}

                    </div>

                  </div>
                )
              )}

            </div>
          )}

      </div>

    </div>
  );
}

