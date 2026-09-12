// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";

// import {
//   collection,
//   doc,
//   onSnapshot,
//   deleteDoc,
// } from "firebase/firestore";

// import { auth, db } from "../../../backend/firebase";

// import "./Wishlist.css";

// function Wishlist() {
//   const navigate = useNavigate();

//   const [wishlistItems, setWishlistItems] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const user = auth.currentUser;

//     if (!user) {
//       setWishlistItems([]);
//       setLoading(false);
//       return;
//     }

//     const wishlistRef = collection(
//       db,
//       "users",
//       user.uid,
//       "wishlist"
//     );

//     const unsubscribe = onSnapshot(
//       wishlistRef,
//       (snapshot) => {
//         const items = snapshot.docs.map((wishlistDoc) => ({
//           id: wishlistDoc.id,
//           ...wishlistDoc.data(),
//         }));

//         setWishlistItems(items);
//         setLoading(false);
//       },
//       (error) => {
//         console.error("Wishlist error:", error);
//         setLoading(false);
//       }
//     );

//     return () => unsubscribe();
//   }, []);

//   const removeFromWishlist = async (productId) => {
//     const user = auth.currentUser;

//     if (!user) return;

//     try {
//       await deleteDoc(
//         doc(
//           db,
//           "users",
//           user.uid,
//           "wishlist",
//           productId
//         )
//       );
//     } catch (error) {
//       console.error("Remove wishlist error:", error);
//     }
//   };

//   const openProduct = (productId) => {
//     navigate(`/product/${productId}`);
//   };

//   if (loading) {
//     return (
//       <div className="wishlist-page">
//         <h2>Wishlist</h2>
//         <p className="wishlist-loading">
//           Loading wishlist...
//         </p>
//       </div>
//     );
//   }

//   return (
//     <div className="wishlist-page">

//       <div className="wishlist-header">
//         <h1>My Wishlist ❤️</h1>

//         <span>
//           {wishlistItems.length} item
//           {wishlistItems.length !== 1 ? "s" : ""}
//         </span>
//       </div>

//       {wishlistItems.length === 0 ? (
//         <div className="empty-wishlist">
//           <div className="empty-icon">♡</div>

//           <h2>Your wishlist is empty</h2>

//           <p>
//             Add products you love to your wishlist.
//           </p>

//           <button
//             onClick={() => navigate("/products")}
//           >
//             Continue Shopping
//           </button>
//         </div>
//       ) : (
//         <div className="wishlist-grid">

//           {wishlistItems.map((item) => (
//             <div
//               className="wishlist-card"
//               key={item.id}
//             >

//               <div
//                 className="wishlist-image"
//                 onClick={() => openProduct(item.id)}
//               >
//                 <img
//                   src={
//                     item.image ||
//                     item.imageUrl ||
//                     item.images?.[0] ||
//                     "/placeholder.png"
//                   }
//                   alt={item.name}
//                 />

//                 <button
//                   className="remove-wishlist"
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     removeFromWishlist(item.id);
//                   }}
//                 >
//                   ♥
//                 </button>
//               </div>

//               <div className="wishlist-details">

//                 <h3
//                   onClick={() => openProduct(item.id)}
//                 >
//                   {item.name}
//                 </h3>

//                 <p className="wishlist-price">
//                   ₹{Number(item.price || 0).toLocaleString("en-IN")}
//                 </p>

//                 {item.category && (
//                   <p className="wishlist-category">
//                     {item.category}
//                   </p>
//                 )}

//                 <button
//                   className="view-product-btn"
//                   onClick={() => openProduct(item.id)}
//                 >
//                   View Product
//                 </button>

//               </div>

//             </div>
//           ))}

//         </div>
//       )}

//     </div>
//   );
// }

// export default Wishlist;

import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  collection,
  doc,
  onSnapshot,
  deleteDoc,
  getDoc,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "../../../backend/firebase";

import "./Wishlist.css";

function Wishlist() {
  const navigate = useNavigate();

  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // =====================================================
  // GET PRODUCT IMAGE
  // =====================================================

  const getProductImage = (product) => {
    if (
      Array.isArray(product.imageUrls) &&
      product.imageUrls.length > 0
    ) {
      return product.imageUrls[0];
    }

    if (
      Array.isArray(product.images) &&
      product.images.length > 0
    ) {
      return product.images[0];
    }

    if (product.imageUrl) {
      return product.imageUrl;
    }

    if (product.image) {
      return product.image;
    }

    return "";
  };

  // =====================================================
  // GET PRODUCT NAME
  // =====================================================

  const getProductName = (product) => {
    return (
      product.name ||
      product.title ||
      "Unnamed Product"
    );
  };

  // =====================================================
  // GET PRODUCT PRICE
  // =====================================================

  const getProductPrice = (product) => {
    return (
      product.price ??
      product.sellingPrice ??
      product.salePrice ??
      0
    );
  };

  // =====================================================
  // FETCH WISHLIST + PRODUCT DETAILS
  // =====================================================

  useEffect(() => {
    let unsubscribeWishlist = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        // ===============================================
        // USER NOT LOGGED IN
        // ===============================================

        if (!user) {
          setWishlistItems([]);
          setLoading(false);

          if (unsubscribeWishlist) {
            unsubscribeWishlist();
            unsubscribeWishlist = null;
          }

          return;
        }

        // ===============================================
        // WISHLIST REFERENCE
        // ===============================================

        const wishlistRef = collection(
          db,
          "users",
          user.uid,
          "wishlist"
        );

        // ===============================================
        // LISTEN TO WISHLIST
        // ===============================================

        unsubscribeWishlist = onSnapshot(
          wishlistRef,
          async (snapshot) => {
            try {
              setLoading(true);

              // =========================================
              // GET PRODUCT IDs
              // =========================================

              const productIds = snapshot.docs.map(
                (wishlistDoc) => {
                  const data = wishlistDoc.data();

                  return (
                    data.productId ||
                    wishlistDoc.id
                  );
                }
              );

              // =========================================
              // NO WISHLIST ITEMS
              // =========================================

              if (productIds.length === 0) {
                setWishlistItems([]);
                setLoading(false);
                return;
              }

              // =========================================
              // FETCH ACTUAL PRODUCTS
              // =========================================

              const productPromises =
                productIds.map(async (productId) => {
                  try {
                    const productRef = doc(
                      db,
                      "products",
                      productId
                    );

                    const productSnap =
                      await getDoc(productRef);

                    if (!productSnap.exists()) {
                      console.warn(
                        "Product not found:",
                        productId
                      );

                      return null;
                    }

                    return {
                      id: productSnap.id,
                      ...productSnap.data(),
                    };
                  } catch (error) {
                    console.error(
                      "Product fetch error:",
                      productId,
                      error
                    );

                    return null;
                  }
                });

              const products =
                await Promise.all(productPromises);

              // =========================================
              // REMOVE NULL PRODUCTS
              // =========================================

              const validProducts =
                products.filter(
                  (product) => product !== null
                );

              setWishlistItems(validProducts);
              setLoading(false);
            } catch (error) {
              console.error(
                "Wishlist loading error:",
                error
              );

              setWishlistItems([]);
              setLoading(false);
            }
          },
          (error) => {
            console.error(
              "Wishlist listener error:",
              error
            );

            setWishlistItems([]);
            setLoading(false);
          }
        );
      }
    );

    // ===============================================
    // CLEANUP
    // ===============================================

    return () => {
      unsubscribeAuth();

      if (unsubscribeWishlist) {
        unsubscribeWishlist();
      }
    };
  }, []);

  // =====================================================
  // REMOVE FROM WISHLIST
  // =====================================================

  const removeFromWishlist = async (productId) => {
    const user = auth.currentUser;

    if (!user) {
      navigate("/login");
      return;
    }

    if (!productId) {
      console.error(
        "Product ID missing while removing wishlist"
      );
      return;
    }

    try {
      const wishlistRef = doc(
        db,
        "users",
        user.uid,
        "wishlist",
        productId
      );

      await deleteDoc(wishlistRef);

    } catch (error) {
      console.error(
        "Remove wishlist error:",
        error
      );

      alert(
        error?.message ||
          "Failed to remove from wishlist"
      );
    }
  };

  // =====================================================
  // OPEN PRODUCT
  // =====================================================

  const openProduct = (productId) => {
    if (!productId) {
      console.error(
        "Product ID missing"
      );
      return;
    }

    navigate(`/product/${productId}`);
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="wishlist-page">
        <h2>Wishlist</h2>

        <p className="wishlist-loading">
          Loading wishlist...
        </p>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="wishlist-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="wishlist-header">

        <h1>
          My Wishlist ❤️
        </h1>

        <span>
          {wishlistItems.length} item
          {wishlistItems.length !== 1
            ? "s"
            : ""}
        </span>

      </div>

      {/* =================================================
          EMPTY WISHLIST
      ================================================= */}

      {wishlistItems.length === 0 ? (

        <div className="empty-wishlist">

          <div className="empty-icon">
            ♡
          </div>

          <h2>
            Your wishlist is empty
          </h2>

          <p>
            Add products you love to
            your wishlist.
          </p>

          <button
            onClick={() =>
              navigate("/")
            }
          >
            Continue Shopping
          </button>

        </div>

      ) : (

        /* =================================================
           WISHLIST GRID
        ================================================= */

        <div className="wishlist-grid">

          {wishlistItems.map((item) => {

            const image =
              getProductImage(item);

            const name =
              getProductName(item);

            const price =
              getProductPrice(item);

            return (

              <div
                className="wishlist-card"
                key={item.id}
              >

                {/* ========================================
                    PRODUCT IMAGE
                ======================================== */}

                <div
                  className="wishlist-image"
                  onClick={() =>
                    openProduct(item.id)
                  }
                >

                  {image ? (

                    <img
                      src={image}
                      alt={name}
                      onError={(e) => {
                        console.error(
                          "Wishlist image failed:",
                          image
                        );

                        e.currentTarget.style.display =
                          "none";
                      }}
                    />

                  ) : (

                    <div className="no-image">
                      📦
                    </div>

                  )}

                  {/* REMOVE BUTTON */}

                  <button
                    type="button"
                    className="remove-wishlist"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      removeFromWishlist(
                        item.id
                      );
                    }}
                  >
                    ♥
                  </button>

                </div>

                {/* ========================================
                    PRODUCT DETAILS
                ======================================== */}

                <div className="wishlist-details">

                  <h3
                    onClick={() =>
                      openProduct(item.id)
                    }
                  >
                    {name}
                  </h3>

                  {item.brand && (
                    <p className="wishlist-brand">
                      {item.brand}
                    </p>
                  )}

                  {/* PRICE */}

                  <p className="wishlist-price">
                    ₹
                    {Number(price).toLocaleString(
                      "en-IN"
                    )}
                  </p>

                  {/* CATEGORY */}

                  {item.category && (
                    <p className="wishlist-category">
                      {item.category}
                    </p>
                  )}

                  {/* VIEW PRODUCT */}

                  <button
                    type="button"
                    className="view-product-btn"
                    onClick={() =>
                      openProduct(item.id)
                    }
                  >
                    View Product
                  </button>

                </div>

              </div>

            );
          })}

        </div>

      )}

    </div>
  );
}

export default Wishlist;