import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  addDoc,
  getDoc,
  getDocs,
  setDoc, deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db, auth } from "../../../backend/firebase";
import "./PoductDetails.css";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
const [isWishlisted, setIsWishlisted] = useState(false);
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);

  const [selectedImage, setSelectedImage] = useState(0);
  const [showImagePreview, setShowImagePreview] =
    useState(false);
  const [quantity, setQuantity] = useState(1);

  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showReviewForm, setShowReviewForm] =
    useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewFormError, setReviewFormError] =
    useState("");


  useEffect(() => {
  const checkWishlist = async () => {
    const user = auth.currentUser;

    if (!user || !id) {
      setIsWishlisted(false);
      return;
    }

    try {
      const wishlistRef = doc(
        db,
        "users",
        user.uid,
        "wishlist",
        id
      );

      const wishlistSnap = await getDoc(wishlistRef);

      setIsWishlisted(wishlistSnap.exists());
    } catch (error) {
      console.error("Wishlist check error:", error);
    }
  };

  checkWishlist();
}, [id]);

  // =====================================================
  // REAL-TIME REVIEWS
  // =====================================================

  useEffect(() => {
    if (!id) {
      setReviews([]);
      return undefined;
    }

    const reviewsQuery = query(
      collection(db, "reviews"),
      where("productId", "==", id)
    );

    const unsubscribe = onSnapshot(
      reviewsQuery,
      (snapshot) => {
        setReviews(
          snapshot.docs.map((reviewDoc) => ({
            id: reviewDoc.id,
            ...reviewDoc.data(),
          }))
        );
      },
      (error) => {
        console.error("Reviews error:", error);
      }
    );

    return () => unsubscribe();
  }, [id]);

  // =====================================================
  // CHECK DELIVERED PURCHASE
  // =====================================================

  useEffect(() => {
    if (!id) {
      setCanReview(false);
      return undefined;
    }

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          setCurrentUserId(null);
          setCanReview(false);
          return;
        }

        setCurrentUserId(user.uid);

        try {
          const ordersSnapshot = await getDocs(
            query(
              collection(db, "orders"),
              where("userId", "==", user.uid)
            )
          );

          const hasDeliveredProduct =
            ordersSnapshot.docs.some((orderDoc) => {
              const order = orderDoc.data();
              const orderStatuses = [
                order.status,
                order.orderStatus,
              ].map((value) =>
                String(value || "")
                  .toLowerCase()
                  .trim()
                  .replace(/[\s-]+/g, "_")
              );

              const wasDelivered = orderStatuses.some(
                (status) =>
                  status === "delivered" ||
                  status === "completed" ||
                  status === "order_delivered"
              );

              if (!wasDelivered) {
                return false;
              }

              const items = Array.isArray(order.items)
                ? order.items
                : Array.isArray(order.orderItems)
                  ? order.orderItems
                  : [];

              return items.some(
                (item) =>
                  String(
                    item.productId ||
                      item.productID ||
                      item.product_id ||
                      item.id ||
                      ""
                  ) === String(id)
              );
            });

          setCanReview(hasDeliveredProduct);
        } catch (error) {
          console.error(
            "Delivered purchase check error:",
            error
          );
          setCanReview(false);
        }
      }
    );

    return () => unsubscribeAuth();
  }, [id]);
  // =====================================================
  // REAL-TIME PRODUCT DATA
  // =====================================================

useEffect(() => {
  if (!id) {
    console.error("❌ Product ID missing");
    setLoading(false);
    return;
  }

  console.log("🔎 Product ID:", id);

  const productRef = doc(db, "products", id);

  const unsubscribeProduct = onSnapshot(
    productRef,
    (productSnap) => {
      if (productSnap.exists()) {
        const data = productSnap.data();

        console.log("✅ Product found:", data);

        setProduct({
          id: productSnap.id,
          ...data,
        });
      } else {
        console.error("❌ Product not found:", id);
        setProduct(null);
      }

      setLoading(false);
    },
    (error) => {
      console.error("❌ Product error:", error);
      setProduct(null);
      setLoading(false);
    }
  );

  return () => unsubscribeProduct();
}, [id]);

// const handleWishlist = async () => {
//   try {
//     const user = auth.currentUser;

//     if (!user) {
//       alert("Please login first");
//       navigate("/login");
//       return;
//     }

//     if (!product?.id) {
//       console.error("❌ Product ID missing");
//       return;
//     }

//     const wishlistRef = doc(
//       db,
//       "users",
//       user.uid,
//       "wishlist",
//       product.id
//     );

//     const wishlistSnap = await getDoc(wishlistRef);

//     if (wishlistSnap.exists()) {
//       // ❤️ Already wishlist → Remove
//       await deleteDoc(wishlistRef);

//       alert("Removed from wishlist");
//     } else {
//       // ♡ Not wishlist → Add
//       await setDoc(wishlistRef, {
//         productId: product.id,
//         name: product.name || "",
//         price: Number(product.price || 0),
//         image: product.imageUrls?.[0] || "",
//         brand: product.brand || "",
//         category: product.category || "",
//         addedAt: serverTimestamp(),
//       });

//       alert("Added to wishlist ❤️");
//     }
//   } catch (error) {
//     console.error("❌ Wishlist error:", error);
//     alert("Failed to update wishlist");
//   }
// };
  

const handleWishlist = async () => {
  try {
    const user = auth.currentUser;

    if (!user) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    if (!product?.id) {
      console.error("Product ID missing");
      return;
    }

    const wishlistRef = doc(
      db,
      "users",
      user.uid,
      "wishlist",
      product.id
    );

    if (isWishlisted) {
      // ❤️ Already liked → Remove
      await deleteDoc(wishlistRef);

      setIsWishlisted(false);

      console.log("Removed from wishlist");
    } else {
      // ♡ Not liked → Add
      await setDoc(wishlistRef, {
        productId: product.id,
        name: product.name || "",
        price: Number(product.price || 0),
        image: product.imageUrls?.[0] || "",
        brand: product.brand || "",
        category: product.category || "",
        addedAt: serverTimestamp(),
      });

      setIsWishlisted(true);

      console.log("Added to wishlist");
    }
  } catch (error) {
    console.error("Wishlist error:", error);
    alert("Failed to update wishlist");
  }
};

  // =====================================================
  // PRODUCT NOT FOUND
  // =====================================================

  if (!product) {
    return (
      <div className="product-not-found">
        <h2>Product not found</h2>

        <button onClick={() => navigate("/")}>
          Go Back
        </button>
      </div>
    );
  }

  // =====================================================
  // PRODUCT DATA
  // =====================================================

  const images =
    product.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls
      : [];

  const advantages = product.advantages || [
    "Premium quality product",
    "Fast delivery",
    "Easy returns",
    "Secure payment",
  ];

  const productBrand =
    product.brand ||
    product.brandName ||
    product.manufacturer ||
    "Brand not available";

  // =====================================================
  // CALCULATE REAL-TIME REVIEW SUMMARY
  // =====================================================

  const reviewCount = reviews.length;

  const totalRating = reviews.reduce(
    (total, review) => total + Number(review.rating || 0),
    0
  );

  const averageRating =
  reviews.length > 0
    ? Number((totalRating / reviews.length).toFixed(1))
    : 0;

  const currentUserReview = currentUserId
    ? reviews.find(
        (review) => review.userId === currentUserId
      )
    : null;

  // Rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter(
      (review) => Number(review.rating) === star
    ).length;

    const percentage =
      reviewCount > 0
        ? Math.round((count / reviewCount) * 100)
        : 0;

    return {
      star,
      count,
      percentage,
    };
  });

  // =====================================================
  // BUY NOW
  // =====================================================

  const handleBuyNow = () => {
  console.log("🛒 Buy Now clicked");
  console.log("Product:", product);
  console.log("Product ID:", product?.id);

  if (!product?.id) {
    console.error("❌ Product ID missing");
    return;
  }

  navigate(`/buy/${product.id}`, {
    state: {
      quantity: quantity,
    },
  });
};

  // =====================================================
  // ADD REVIEW
  // =====================================================

  const handleWriteReview = () => {
    if (!auth.currentUser) {
      alert("Please login to write a review.");
      navigate("/login");
      return;
    }

    if (!canReview) {
      alert(
        "Only customers who received this product can write a review."
      );
      return;
    }

    if (currentUserReview) {
      alert(
        "You already reviewed this product. Delete your existing review before writing another one."
      );
      return;
    }

    setReviewFormError("");
    setShowReviewForm(true);
  };

  const handleSubmitReview = async (event) => {
    event.preventDefault();

    if (!reviewRating) {
      setReviewFormError("Please select a rating.");
      return;
    }

    if (!reviewText.trim()) {
      setReviewFormError("Please share your experience.");
      return;
    }

    try {
      setReviewLoading(true);

      const user = auth.currentUser;

      const reviewRef = doc(
        db,
        "reviews",
        `${product.id}_${user.uid}`
      );

      await setDoc(reviewRef, {
        productId: product.id,

        userId: user.uid,

        userName:
          user.displayName ||
          user.email?.split("@")[0] ||
          "User",

        userEmail: user.email || "",

        rating: reviewRating,

        review: reviewText.trim(),

        verifiedPurchase: true,

        createdAt: serverTimestamp(),
      });

      setReviewRating(0);
      setReviewText("");
      setReviewFormError("");
      setShowReviewForm(false);
    } catch (error) {
      console.error("Review error:", error);
      setReviewFormError("Failed to add review. Please try again.");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!currentUserReview?.id) {
      return;
    }

    const confirmed = window.confirm(
      "Delete your review? You can write a new review after deleting it."
    );

    if (!confirmed) {
      return;
    }

    try {
      setReviewLoading(true);

      await deleteDoc(
        doc(db, "reviews", currentUserReview.id)
      );

      alert("Review deleted successfully.");
    } catch (error) {
      console.error("Delete review error:", error);
      alert("Failed to delete review.");
    } finally {
      setReviewLoading(false);
    }
  };

  // =====================================================
  // ADD TO CART
  // =====================================================


  const handleAddToCart = async () => {
  if (!auth.currentUser) {
    alert("Please login to add products to cart.");
    navigate("/login");
    return;
  }

  try {
    const user = auth.currentUser;

    const cartRef = collection(
      db,
      "users",
      user.uid,
      "cart"
    );

    // Check whether product already exists in cart
    const cartQuery = query(
      cartRef,
      where("productId", "==", product.id)
    );

    const cartSnapshot = await getDocs(cartQuery);

    if (!cartSnapshot.empty) {
      // Product already exists → increase quantity
      const cartDoc = cartSnapshot.docs[0];

      const existingQuantity =
        Number(cartDoc.data().quantity || 0);

      await updateDoc(cartDoc.ref, {
        quantity: existingQuantity + quantity,
        updatedAt: serverTimestamp(),
      });

      alert(
        `${product.name} quantity updated in cart!`
      );
    } else {
      // New product → create cart item
      await addDoc(cartRef, {
        productId: product.id,

        name: product.name || "",

        price: Number(product.price || 0),

        image:
          product.imageUrls?.[0] || "",

        quantity: quantity,

        brand: product.brand || "",

        category: product.category || "",

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp(),
      });

      alert(
        `${quantity} ${product.name} added to cart!`
      );
    }
  } catch (error) {
    console.error("❌ Cart error:", error);
    alert("Failed to add product to cart.");
  }
};

  // =====================================================
  // RETURN UI
  // =====================================================

  return (
    <div className="product-page">

      {/* =================================================
          BREADCRUMB
      ================================================= */}

      <div className="breadcrumb">

        <span
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          Home
        </span>

        &nbsp;›&nbsp;

        <span>
          {product.category || "Products"}
        </span>

        &nbsp;›&nbsp;

        <strong>
          {product.name}
        </strong>

      </div>


      {/* =================================================
          PRODUCT SECTION
      ================================================= */}

      <main className="product-container">

        {/* ================= LEFT ================= */}

        <section className="product-gallery">

          <div className="thumbnail-list">

            {images.map((image, index) => (

              <button
                key={image}
                className={
                  selectedImage === index
                    ? "thumbnail active"
                    : "thumbnail"
                }
                onClick={() =>
                  setSelectedImage(index)
                }
              >

                <img
                  src={image}
                  alt={`${product.name} ${index + 1}`}
                />

              </button>

            ))}

          </div>


          <div className="main-product-image">

            <button
  className={`wishlist ${isWishlisted ? "liked" : ""}`}
  onClick={(e) => {
    e.stopPropagation();
    handleWishlist();
  }}
>
  {isWishlisted ? "♥" : "♡"}
</button>

            {images.length > 0 ? (

              <img
                src={images[selectedImage]}
                alt={product.name || "Product"}
                className="main-product-image-clickable"
                onClick={() =>
                  setShowImagePreview(true)
                }
              />

            ) : (

              <div className="no-product-image">
                📦
              </div>

            )}

          </div>

        </section>


        {/* ================= RIGHT ================= */}

        <section className="product-info">

          {/* BRAND */}

          <div className="brand-label">
            Brand: {productBrand}
          </div>


          {/* NAME */}

          <h1>
            {product.name}
          </h1>


          {/* DESCRIPTION */}

          <p className="short-description">
            {product.description ||
              "No description available for this product."}
          </p>


          {/* RATING */}

          <div className="rating-row">

            <span className="rating">
              {averageRating.toFixed(1)} ★
            </span>

            <span className="rating-text">
              {reviewCount} Ratings & Reviews
            </span>

            <span className="verified">
              ✓ Verified
            </span>

          </div>


          {/* PRICE */}

          <div className="price-section">

            <span className="current-price">
              ₹
              {Number(product.price || 0).toLocaleString(
                "en-IN"
              )}
            </span>

            {product.oldPrice && (

              <span className="old-price">
                ₹
                {Number(product.oldPrice).toLocaleString(
                  "en-IN"
                )}
              </span>

            )}

            {product.discount && (

              <span className="discount">
                {product.discount}% off
              </span>

            )}

          </div>


          <p className="tax-text">
            Inclusive of all taxes
          </p>

          {/* PRODUCT INFO */}

          <div className="detail-block">

            <h3>
              Product Information
            </h3>

            <div className="size-info">

              <div>

                <span>Category</span>

                <strong>
                  {product.category || "Fashion"}
                </strong>
              </div>


              <div>
                <span>Brand</span>

                <strong>
                  {productBrand}
                </strong>
              </div>


              <div>
                <span>Availability</span>

                <strong>
                  {Number(product.stock || 0) > 0
                    ? "In Stock"
                    : "Out of Stock"}
                </strong>
              </div>

            </div>

          </div>


          {/* DELIVERY */}

          <div className="delivery">

            <h3>
              Delivery
            </h3>

            <div className="delivery-input">

              <span>⌖</span>

              <input
                placeholder="Enter delivery pincode"
                maxLength="6"
              />

              <button>
                Check
              </button>

            </div>


            <div className="delivery-result">

              <span className="delivery-icon">
                ✓
              </span>

              <div>

                <strong>
                  Delivery by{" "}
                  {product.delivery || "2-3 days"}
                </strong>

                <p>
                  Free delivery available
                </p>

              </div>

            </div>

          </div>


          {/* ADVANTAGES */}

          <div className="advantages">

            <h3>
              Product Advantages
            </h3>

            <ul>

              {advantages.map((item, index) => (

                <li key={index}>

                  <span>✓</span>

                  {item}

                </li>

              ))}

            </ul>

          </div>


          {/* QUANTITY + BUTTONS */}

          <div className="purchase-section">

            <div className="quantity">

              <button
                onClick={() =>
                  setQuantity(
                    Math.max(1, quantity - 1)
                  )
                }
              >
                −
              </button>

              <span>
                {quantity}
              </span>

              <button
                onClick={() =>
                  setQuantity(quantity + 1)
                }
              >
                +
              </button>

            </div>


            <button
              className="add-cart"
              onClick={handleAddToCart}
              disabled={Number(product.stock || 0) <= 0}
            >
              🛒 Add to Cart
            </button>


            <button
              className="buy-now"
              onClick={handleBuyNow}
              disabled={Number(product.stock || 0) <= 0}
            >
              Buy Now
            </button>

          </div>


          {/* TRUST */}

          <div className="trust-row">

            <div>
              <span>🛡</span>
              <strong>1 Year Warranty</strong>
            </div>

            <div>
              <span>↻</span>
              <strong>7 Days Replacement</strong>
            </div>

            <div>
              <span>🚚</span>
              <strong>Free Delivery</strong>
            </div>

          </div>

        </section>

      </main>


      {showImagePreview && images.length > 0 && (
        <div
          className="image-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Product image preview"
          onClick={() => setShowImagePreview(false)}
        >
          <button
            type="button"
            className="image-preview-close"
            aria-label="Close image preview"
            onClick={() => setShowImagePreview(false)}
          >
            ×
          </button>

          {images.length > 1 && (
            <button
              type="button"
              className="image-preview-arrow image-preview-prev"
              aria-label="Previous product image"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedImage(
                  (selectedImage - 1 + images.length) %
                    images.length
                );
              }}
            >
              ‹
            </button>
          )}

          <img
            className="image-preview-image"
            src={images[selectedImage]}
            alt={product.name || "Product preview"}
            onClick={(event) => event.stopPropagation()}
          />

          {images.length > 1 && (
            <button
              type="button"
              className="image-preview-arrow image-preview-next"
              aria-label="Next product image"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedImage(
                  (selectedImage + 1) % images.length
                );
              }}
            >
              ›
            </button>
          )}

          <span className="image-preview-count">
            {selectedImage + 1} / {images.length}
          </span>
        </div>
      )}

        {/* =================================================
          DESCRIPTION
        ================================================= */}

      <section className="description-card">

        <div className="description-header">

          <h2>
            Product Details
          </h2>

        </div>


        <div className="description-content">

          <div>

            <h3>
              About this product
            </h3>

            <p>
              {product.description ||
                "No description available for this product."}
            </p>

          </div>

        </div>

      </section>


      {/* =================================================
          REVIEWS
      ================================================= */}

      <section className="reviews-card">

        <div className="reviews-title">

          <h2>
            Ratings & Reviews
          </h2>

          {canReview && !currentUserReview && (
            <button
              onClick={handleWriteReview}
              disabled={reviewLoading}
            >
              {reviewLoading
                ? "Adding..."
                : "Write a Review"}
            </button>
          )}

        </div>

        {showReviewForm && (
          <form
            className="review-form"
            onSubmit={handleSubmitReview}
          >
            <div className="review-form-header">
              <div>
                <h3>Share your experience</h3>
                <p>Your feedback helps other customers shop with confidence.</p>
              </div>

              <button
                type="button"
                className="review-form-close"
                onClick={() => setShowReviewForm(false)}
                aria-label="Close review form"
              >
                ×
              </button>
            </div>

            <label className="review-form-label">
              Your rating
              <span className="review-stars" role="radiogroup" aria-label="Product rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={
                      star <= reviewRating
                        ? "review-star selected"
                        : "review-star"
                    }
                    onClick={() => setReviewRating(star)}
                    role="radio"
                    aria-checked={reviewRating === star}
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  >
                    ★
                  </button>
                ))}
              </span>
            </label>

            <label
              className="review-form-label"
              htmlFor="product-review-text"
            >
              Your review
              <textarea
                id="product-review-text"
                value={reviewText}
                onChange={(event) => {
                  setReviewText(event.target.value);
                  setReviewFormError("");
                }}
                placeholder="Tell us what you liked about this product..."
                maxLength={500}
                rows={4}
              />
              <span className="review-character-count">
                {reviewText.length}/500
              </span>
            </label>

            {reviewFormError && (
              <p className="review-form-error">
                {reviewFormError}
              </p>
            )}

            <div className="review-form-actions">
              <button
                type="button"
                className="review-cancel-button"
                onClick={() => setShowReviewForm(false)}
                disabled={reviewLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="review-submit-button"
                disabled={reviewLoading}
              >
                {reviewLoading ? "Publishing..." : "Publish review"}
              </button>
            </div>
          </form>
        )}


        {/* REVIEW SUMMARY */}

        <div className="reviews-summary">

          <div className="overall-rating">

            <strong>
              {averageRating.toFixed(1)}
            </strong>

            <span>
              {"★".repeat(
                Math.round(averageRating)
              )}
            </span>

            <p>
              {reviewCount} Ratings
            </p>

          </div>


          {/* RATING BARS */}

          <div className="rating-bars">

            {ratingDistribution.map(
              ({ star, percentage }) => (

                <div key={star}>

                  <span>
                    {star} ★
                  </span>

                  <div>
                    <i
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                  <small>
                    {percentage}%
                  </small>

                </div>

              )
            )}

          </div>

        </div>


        {/* =================================================
            REAL-TIME REVIEWS
        ================================================= */}

        {/* {reviews.length === 0 ? (

          <div className="no-reviews">

            <h3>
              No reviews yet
            </h3>

            <p>
              Be the first person to review this product.
            </p>

          </div>

        ) : (

          reviews.map((review) => (

            <div
              className="review"
              key={review.id}
            >

              <div className="review-rating">
                {review.rating} ★
              </div>


              <h3>
                {review.title ||
                  "Customer Review"}
              </h3>


              <p>
                {review.review}
              </p>


              <div className="review-user">

                <span>
                  {(
                    review.userName || "U"
                  )
                    .substring(0, 2)
                    .toUpperCase()}
                </span>

                {review.userName || "User"}

                {review.verifiedPurchase && (
                  <> · Verified Purchase</>
                )}

              </div>

            </div>

          ))

        )} */}

{reviews.length > 0 ? (
  reviews.map((review) => (
    <div className="review" key={review.id}>

      {/* Rating */}
      <div className="review-rating">
        {Number(review.rating || 0)} ★
      </div>

      {/* Review */}
      <h3>
        {review.title || "Customer Review"}
      </h3>

      <p>
        {review.review || "No review text"}
      </p>

      {/* User */}
      <div className="review-user">

        <span>
          {(review.userName || "U")
            .substring(0, 2)
            .toUpperCase()}
        </span>

        <strong>
          {review.userName || "User"}
        </strong>

        {review.verifiedPurchase === true && (
          <span>
            · Verified Purchase
          </span>
        )}

      </div>

      {review.userId === currentUserId && (
        <button
          type="button"
          onClick={handleDeleteReview}
          disabled={reviewLoading}
          style={{
            marginTop: "10px",
            padding: "6px 10px",
            border: "1px solid #c6573c",
            borderRadius: "6px",
            background: "white",
            color: "#c6573c",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          {reviewLoading ? "Deleting..." : "Delete Review"}
        </button>
      )}

    </div>
  ))
) : (
  <div className="no-reviews">
    <h3>No reviews yet</h3>
    <p>Be the first person to review this product.</p>
  </div>
)}

      </section>

    </div>
  );
}

export default ProductDetails;