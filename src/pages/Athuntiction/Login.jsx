import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom"
import {
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../../../backend/firebase";

import "./Login.css";

function Login() {
  const navigate = useNavigate();
  // const location = useLocation();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handlePhoneChange = (e) => {
    const value = e.target.value
      .replace(/\D/g, "")
      .slice(0, 10);

    setPhone(value);
  };
const handleGoogleSignIn = async () => {
  setLoading(true);
  setMessage("");

  try {
    // Google Provider
    const provider = new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: "select_account",
    });

    // Google Login
    const result = await signInWithPopup(
      auth,
      provider
    );

    const user = result.user;



    // ==================================
    // FIRESTORE USER DOCUMENT
    // users/{uid}
    // ==================================

    const userRef = doc(
      db,
      "users",
      user.uid
    );


    // Get existing user
    const userSnapshot = await getDoc(
      userRef
    );


    // ==================================
    // NEW USER
    // ==================================

    if (!userSnapshot.exists()) {

      await setDoc(userRef, {
        uid: user.uid,

        name:
          user.displayName || "",

        email:
          user.email || "",

        photoURL:
          user.photoURL || "",

        phoneNumber:
          phone || "",

        provider: "google",

        // New users are normal users
        role: "user",
        createdAt:
          serverTimestamp(),

        lastLoginAt:
          serverTimestamp(),
      });


    } else {

      // ==================================
      // EXISTING USER
      // ==================================

      const existingData =
        userSnapshot.data();

      await setDoc(
        userRef,
        {
          uid: user.uid,

          name:
            user.displayName ||
            existingData.name ||
            "",

          email:
            user.email ||
            existingData.email ||
            "",

          photoURL:
            user.photoURL ||
            existingData.photoURL ||
            "",

          ...(phone
            ? {
                phoneNumber: phone,
              }
            : {}),

          provider: "google",

          lastLoginAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );
    }


    // ==================================
    // GET USER DATA AGAIN
    // ==================================

    const latestSnapshot =
      await getDoc(userRef);

    const latestData =
      latestSnapshot.data();


    // ==================================
    // GET ROLE
    // ==================================

    const role =
      latestData?.role || "user";




    // ==================================
    // ADMIN
    // ==================================

    if (role === "admin") {

      setMessage(
        "Admin login successful!"
      );

      navigate(
        "/admin",
        {
          replace: true,
        }
      );

      return;
    }


    // ==================================
    // NORMAL USER
    // ==================================

    setMessage(
      "Login successful!"
    );

    navigate(
      "/",
      {
        replace: true,
      }
    );

  } catch (error) {

    console.error(
      "Google Login Error:",
      error
    );

    setMessage(
      error.message ||
      "Google sign in failed."
    );

  } finally {

    setLoading(false);

  }
};

  return (
    <div className="auth-page">

      <div className="auth-card">

        <div className="auth-logo">
          JS
        </div>

        <p className="auth-eyebrow">
          FASHION
        </p>

        <h1>
          Sign in to your account
        </h1>

        <p className="auth-description">
          Continue with Google to create or
          access your shopping account.
        </p>


        {/* PHONE NUMBER */}

        <div className="phone-section">

          <label>
            Phone number
            <span> Please Enter The Mobile Number You Currently Use.</span>
          </label>

          <div className="phone-input">

            <span>
              🇮🇳 +91
            </span>

            <input
              type="tel"
              placeholder="Enter phone number"
              value={phone}
              onChange={handlePhoneChange}
              maxLength={10}
              required
            />

          </div>

          <small>
            Phone verification is not required.
          </small>

        </div>


        {/* GOOGLE */}

        <button
          className="google-button"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >

          {loading ? (
            <>
              <span className="loader"></span>
              Signing in...
            </>
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}

        </button>


        {message && (
          <div className="auth-message">
            {message}
          </div>
        )}


        <div className="security">
          🔒
        </div>

      </div>

    </div>
  );
}


// Google SVG

function GoogleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#4285F4"
        d="M21.35 12.23c0-.79-.07-1.55-.23-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42z"
      />

      <path
        fill="#34A853"
        d="M12 21.7c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.74 9.74 0 0 0 12 21.7z"
      />

      <path
        fill="#FBBC05"
        d="M6.53 13.79A5.85 5.85 0 0 1 6.22 12c0-.62.11-1.22.31-1.79V7.68H3.28A9.73 9.73 0 0 0 2.25 12c0 1.57.38 3.05 1.03 4.32l3.25-2.53z"
      />

      <path
        fill="#EA4335"
        d="M12 6.18c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.28 14.63 2.3 12 2.3a9.74 9.74 0 0 0-8.72 5.38l3.25 2.53C7.3 7.9 9.46 6.18 12 6.18z"
      />
    </svg>
  );
}

export default Login;
