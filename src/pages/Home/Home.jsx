import { useEffect, useRef, useState } from "react";
import "./Home.css";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../../backend/firebase";

import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

// =====================================================
// CATEGORIES
// =====================================================

const categories = [
  { icon: "🛍️", name: "For You" },
  { icon: "👕", name: "Fashion" },
  { icon: "📱", name: "Mobiles" },
  { icon: "💻", name: "Electronics" },
  { icon: "💄", name: "Beauty" },
  { icon: "💎", name: "Jewels" },
  { icon: "💡", name: "Home" },
  { icon: "📺", name: "Appliances" },
  { icon: "🧸", name: "Toys, Baby & Kids" },
  { icon: "🍱", name: "Food & Household" },
  { icon: "🏍️", name: "Auto Accessories" },
  { icon: "🏏", name: "Sports & Fitness" },
  { icon: "🛋️", name: "Furniture" },
  { icon: "📚", name: "Books" },
  { icon: "🛵", name: "2 Wheelers" },
];

// =====================================================
// HOME COMPONENT
// =====================================================

function Home() {
  const navigate = useNavigate();

  // =====================================================
  // STATES
  // =====================================================

  const [wishlist, setWishlist] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);



  const [products, setProducts] = useState([]);
  const [reviewSummaries, setReviewSummaries] =
    useState({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingMoreProducts, setLoadingMoreProducts] =
    useState(false);
  const [hasMoreProducts, setHasMoreProducts] =
    useState(true);
  const loadMoreRef = useRef(null);

  // Default category = For You
  const [selectedCategory, setSelectedCategory] = useState("For You");

  // =====================================================
  // NORMALIZE CATEGORY
  // =====================================================

  const normalizeCategory = (value) => {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  };

  // =====================================================
  // GET PRODUCT IMAGE
  // =====================================================

  const getProductImage = (product) => {
    if (
      Array.isArray(product?.imageUrls) &&
      product.imageUrls.length > 0
    ) {
      return product.imageUrls[0];
    }

    if (
      Array.isArray(product?.images) &&
      product.images.length > 0
    ) {
      return product.images[0];
    }

    if (product?.imageUrl) {
      return product.imageUrl;
    }

    if (product?.image) {
      return product.image;
    }

    return "";
  };

  // =====================================================
  // GET PRODUCT NAME
  // =====================================================

  const getProductName = (product) => {
    return (
      product?.name ||
      product?.title ||
      "Unnamed Product"
    );
  };

  // =====================================================
  // GET PRODUCT PRICE
  // =====================================================

  const getProductPrice = (product) => {
    return (
      product?.price ??
      product?.sellingPrice ??
      product?.salePrice ??
      0
    );
  };

  // =====================================================
  // GET OLD PRICE
  // =====================================================

  const getOldPrice = (product) => {
    return (
      product?.oldPrice ??
      product?.originalPrice ??
      null
    );
  };

  // =====================================================
  // FETCH PRODUCTS IN SMALL BATCHES
  // =====================================================

  useEffect(() => {
    let mounted = true;
    let lastVisibleProduct = null;
    let hasMore = true;
    let requestInFlight = false;
    let isFirstRequest = true;

    const fetchProducts = async () => {
      if (!mounted || requestInFlight || !hasMore) {
        return;
      }

      requestInFlight = true;

      try {
        if (isFirstRequest) {
          setLoadingProducts(true);
        } else {
          setLoadingMoreProducts(true);
        }

        const productsRef = collection(db, "products");
        const pageSize = isFirstRequest ? 10 : 4;
        const productsQuery = lastVisibleProduct
          ? query(
              productsRef,
              orderBy("createdAt", "desc"),
              startAfter(lastVisibleProduct),
              limit(pageSize)
            )
          : query(
              productsRef,
              orderBy("createdAt", "desc"),
              limit(pageSize)
            );

        const snapshot = await getDocs(productsQuery);

        if (!mounted) {
          return;
        }

        const productList = snapshot.docs.map(
          (productDoc) => ({
            id: productDoc.id,
            ...productDoc.data(),
          })
        );

        lastVisibleProduct =
          snapshot.docs[snapshot.docs.length - 1] ||
          lastVisibleProduct;
        hasMore = snapshot.docs.length === pageSize;

        setProducts((previousProducts) => [
          ...previousProducts,
          ...productList,
        ]);
        setHasMoreProducts(hasMore);
        isFirstRequest = false;
      } catch (error) {
        console.error(
          "Failed to fetch products:",
          error
        );

        if (mounted) {
          if (isFirstRequest) {
            setProducts([]);
          }
          hasMore = false;
          setHasMoreProducts(false);
        }
      } finally {
        if (mounted) {
          setLoadingProducts(false);
          setLoadingMoreProducts(false);
        }
        requestInFlight = false;
      }
    };

    fetchProducts();

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchProducts();
        }
      },
      { rootMargin: "300px" }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, []);

  // =====================================================
  // REAL-TIME PRODUCT REVIEW SUMMARIES
  // =====================================================

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "reviews"),
      (snapshot) => {
        const summaries = {};

        snapshot.docs.forEach((reviewDoc) => {
          const review = reviewDoc.data();
          const productId = review.productId;

          if (!productId) {
            return;
          }

          if (!summaries[productId]) {
            summaries[productId] = {
              totalRating: 0,
              reviewCount: 0,
            };
          }

          summaries[productId].totalRating += Number(
            review.rating || 0
          );
          summaries[productId].reviewCount += 1;
        });

        Object.values(summaries).forEach((summary) => {
          summary.averageRating = Number(
            (
              summary.totalRating /
              summary.reviewCount
            ).toFixed(1)
          );
        });

        setReviewSummaries(summaries);
      },
      (error) => {
        console.error(
          "Product reviews listener error:",
          error
        );
        setReviewSummaries({});
      }
    );

    return () => unsubscribe();
  }, []);

  // =====================================================
  // DISPLAY PRODUCTS
  //
  // FOR YOU:
  // Latest 20 admin-added products
  //
  // CATEGORY:
  // Only selected category products
  // =====================================================

  const displayedProducts =
    selectedCategory === "For You"
      ? products.slice(0, 20)
      : products.filter((product) => {
          return (
            normalizeCategory(product.category) ===
            normalizeCategory(selectedCategory)
          );
        });

  // =====================================================
  // FETCH WISHLIST
  // =====================================================

  useEffect(() => {
    let unsubscribe = null;

    const setupWishlistListener = () => {
      const user = auth.currentUser;

      if (!user) {
        setWishlist([]);
        return;
      }

      const wishlistRef = collection(
        db,
        "users",
        user.uid,
        "wishlist"
      );

      unsubscribe = onSnapshot(
        wishlistRef,
        (snapshot) => {
          const wishlistIds = snapshot.docs.map(
            (wishlistDoc) => wishlistDoc.id
          );

          setWishlist(wishlistIds);
        },
        (error) => {
          console.error(
            "Wishlist listener error:",
            error
          );
        }
      );
    };

    setupWishlistListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);


  // =====================================================
  // WISHLIST
  // =====================================================

  const handleWishlist = async (
    event,
    productId
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const user = auth.currentUser;

    if (!user) {
      alert(
        "Please login to use wishlist"
      );

      navigate("/login");
      return;
    }

    if (!productId) {
      console.error(
        "Product ID is missing"
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

      // REMOVE
      if (wishlist.includes(productId)) {
        await deleteDoc(wishlistRef);

        setWishlist((previous) =>
          previous.filter(
            (id) => id !== productId
          )
        );

        return;
      }

      // ADD
      await setDoc(wishlistRef, {
        productId,
        liked: true,
        createdAt: serverTimestamp(),
      });

      setWishlist((previous) => [
        ...previous,
        productId,
      ]);
    } catch (error) {
      console.error(
        "Wishlist Error:",
        error
      );

      alert(
        error?.message ||
          "Failed to update wishlist"
      );
    }
  };

  // =====================================================
  // ADD TO CART
  // =====================================================

  const addToCart = async (
    event,
    product
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const user = auth.currentUser;

    if (!user) {
      alert(
        "Please login to add products to cart"
      );

      navigate("/login");
      return;
    }

    if (!product?.id) {
      console.error(
        "Product ID is missing"
      );
      return;
    }

    try {
      const cartProductRef = doc(
        db,
        "users",
        user.uid,
        "cart",
        product.id
      );

      const cartSnapshot = await getDoc(
        cartProductRef
      );

      if (cartSnapshot.exists()) {
        const existingData =
          cartSnapshot.data();

        await setDoc(
          cartProductRef,
          {
            ...existingData,
            quantity:
              Number(
                existingData.quantity || 1
              ) + 1,
            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );
      } else {
        await setDoc(cartProductRef, {
          productId: product.id,
          name: getProductName(product),
          price: getProductPrice(product),
          image: getProductImage(product),
          category:
            product.category || "",
          quantity: 1,
          createdAt: serverTimestamp(),
        });
      }

    } catch (error) {
      console.error(
        "Add to cart error:",
        error
      );

      alert(
        error?.message ||
          "Failed to add product to cart"
      );
    }
  };

  // =====================================================
  // ACCOUNT
  // =====================================================

  const handleAccount = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        navigate("/login");
        return;
      }

      const userRef = doc(
        db,
        "users",
        user.uid
      );

      const userSnap = await getDoc(
        userRef
      );

      if (!userSnap.exists()) {
        navigate("/profile");
        return;
      }

      const userData = userSnap.data();

      const role = String(
        userData.role || ""
      )
        .toLowerCase()
        .trim();

      if (
        role === "admin" ||
        role === "superadmin" ||
        role === "super admin"
      ) {
        navigate("/admin");
      } else {
        navigate("/profile");
      }
    } catch (error) {
      console.error(
        "Account navigation error:",
        error
      );

      navigate("/profile");
    }
  };

  // =====================================================
  // CATEGORY CLICK
  // =====================================================

  const handleCategoryClick = (
    categoryName
  ) => {
    setSelectedCategory(categoryName);

    setTimeout(() => {
      document
        .querySelector(".product-grid")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredProducts =
    products.filter((product) => {
      const search = searchTerm
        .toLowerCase()
        .trim();

      if (!search) {
        return false;
      }

      const name = String(
        product.name ||
          product.title ||
          ""
      ).toLowerCase();

      const category = String(
        product.category || ""
      ).toLowerCase();

      const description = String(
        product.description || ""
      ).toLowerCase();

      const brand = String(
        product.brand || ""
      ).toLowerCase();

      return (
        name.includes(search) ||
        category.includes(search) ||
        description.includes(search) ||
        brand.includes(search)
      );
    });

  // =====================================================
  // PRODUCT CLICK
  // =====================================================

  const handleProductClick = (
    productId
  ) => {
    if (!productId) {
      return;
    }

    navigate(
      `/product/${productId}`
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="home-page">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="navbar">
        <div className="nav-container">

          {/* BRAND */}

          <div
            className="brand"
            onClick={() => {
              setSelectedCategory("For You");
              navigate("/");
            }}
            style={{
              cursor: "pointer",
            }}
          >
            <div className="brand-logo">
              JS
            </div>

            <div>
              <div className="brand-name">
                Fashion
              </div>

              <div className="brand-tagline">
                Shop. Discover. Enjoy.
              </div>
            </div>
          </div>

          {/* SEARCH */}

          <div className="search-wrapper">

            <div className="search-box">

              <span className="search-icon">
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search for products, brands and more"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(
                    event.target.value
                  );

                  setShowSearchResults(true);
                }}
                onFocus={() => {
                  if (
                    searchTerm.trim()
                  ) {
                    setShowSearchResults(
                      true
                    );
                  }
                }}
              />

              {searchTerm && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() => {
                    setSearchTerm("");
                    setShowSearchResults(
                      false
                    );
                  }}
                >
                  ×
                </button>
              )}

              <button
                type="button"
                className="search-button"
                onClick={() =>
                  setShowSearchResults(
                    true
                  )
                }
              >
                Search
              </button>
            </div>

            {/* SEARCH RESULTS */}

            {showSearchResults &&
              searchTerm.trim() && (
                <div className="search-results">

                  {filteredProducts
                    .slice(0, 6)
                    .map((product) => {
                      const image =
                        getProductImage(
                          product
                        );

                      const name =
                        getProductName(
                          product
                        );

                      const price =
                        getProductPrice(
                          product
                        );

                      return (
                        <div
                          className="search-result-item"
                          key={product.id}
                          onClick={() => {
                            setSearchTerm(
                              name
                            );

                            setShowSearchResults(
                              false
                            );

                            handleProductClick(
                              product.id
                            );
                          }}
                        >

                          <div className="search-result-image">
                            {image ? (
                              <img
                                src={image}
                                alt={name}
                                onError={(
                                  event
                                ) => {
                                  event.currentTarget.style.display =
                                    "none";
                                }}
                              />
                            ) : (
                              <div className="search-no-image">
                                📦
                              </div>
                            )}
                          </div>

                          <div className="search-result-info">
                            <strong>
                              {name}
                            </strong>

                            <small>
                              {product.category ||
                                "Product"}
                            </small>
                          </div>

                          <div className="search-result-price">
                            ₹
                            {Number(
                              price
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </div>

                        </div>
                      );
                    })}

                  {filteredProducts.length ===
                    0 && (
                    <div className="no-search-results">

                      <span>
                        ⌕
                      </span>

                      <strong>
                        No products found
                      </strong>

                      <small>
                        Try searching with another name
                      </small>

                    </div>
                  )}

                </div>
              )}
          </div>

          {/* NAV ACTIONS */}

          <div className="nav-actions">

            <button
              className="account-button"
              onClick={
                handleAccount
              }
            >
              <span className="action-icon">
                ♙
              </span>

              <span>
                Account
              </span>
            </button>

            <button
              className="nav-action"
              onClick={() =>
                navigate("/wish")
              }
            >
              <span className="action-icon">
                ♡
              </span>

              <span>
                Wishlist
              </span>
            </button>

            <button
              className="nav-action cart-action"
              onClick={() =>
                navigate("/cart")
              }
            >
              <span className="action-icon">
                🛒
              </span>

              <span>
                Cart
              </span>

              
        </button>
            
          </div>

        </div>
      </header>

      {/* =====================================================
          CATEGORY BAR
      ===================================================== */}

      <section className="category-section">
        <div className="category-container">

          {categories.map(
            (category) => (
              <button
                className={`category-item ${
                  selectedCategory ===
                  category.name
                    ? "active"
                    : ""
                }`}
                key={category.name}
                onClick={() =>
                  handleCategoryClick(
                    category.name
                  )
                }
              >
                <div className="category-icon">
                  {category.icon}
                </div>

                <span>
                  {category.name}
                </span>
              </button>
            )
          )}

        </div>
      </section>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main>

        {/* ===================================================
            HERO
        =================================================== */}

        <section className="hero-section">

          <div className="hero-content">

            <div className="hero-text">

              <span className="hero-label">
                ✦ RS EXCLUSIVE
              </span>

              <h1>
                Everything you love.
                <br />

                <span>
                  All in one place.
                </span>
              </h1>

              <p>
                Discover thousands of
                products at amazing
                prices. Fast delivery,
                secure payments and a
                shopping experience built
                for you.
              </p>

              <div className="hero-buttons">

                <button
                  className="primary-button"
                  onClick={() => {
                    document
                      .querySelector(
                        ".product-grid"
                      )
                      ?.scrollIntoView({
                        behavior:
                          "smooth",
                      });
                  }}
                >
                  Shop Now

                  <span>
                    →
                  </span>
                </button>

                <button
                  className="secondary-button"
                  onClick={() => {
                    document
                      .querySelector(
                        ".explore-section"
                      )
                      ?.scrollIntoView({
                        behavior:
                          "smooth",
                      });
                  }}
                >
                  Explore Deals
                </button>

              </div>

            </div>

            {/* HERO VISUAL */}

            <div className="hero-visual">

              <div className="hero-circle circle-one">
              </div>

              <div className="hero-circle circle-two">
              </div>

              <div className="floating-card card-top">

                <span>
                  ⚡
                </span>

                <div>
                  <strong>
                    Flash Sale
                  </strong>

                  <small>
                    Up to 70% OFF
                  </small>
                </div>

              </div>

              <div className="product-display">

                <div className="display-glow">
                </div>

                <div className="display-product">
                  📱
                </div>

              </div>

              <div className="floating-card card-bottom">

                <span>
                  🚚
                </span>

                <div>
                  <strong>
                    Fast Delivery
                  </strong>

                  <small>
                    Across India
                  </small>
                </div>

              </div>

            </div>

          </div>

        </section>

        {/* ===================================================
            PRODUCT SECTION
        =================================================== */}

        <section className="products-section">

          <div className="section-heading">

            <div>
              <span className="section-label">
                {selectedCategory ===
                "For You"
                  ? "RECOMMENDED"
                  : "CATEGORY"}
              </span>

              <h2>
                {selectedCategory}
              </h2>
            </div>

            {!loadingProducts && (
              <span className="product-count">
                {displayedProducts.length} Products
              </span>
            )}

          </div>

          {/* PRODUCT GRID */}

          <div className="product-grid">

            {/* LOADING */}

            {loadingProducts ? (
              <div className="products-loading">
                Loading products...
              </div>
            ) : displayedProducts.length ===
              0 ? (
              <div className="no-products">

                <div className="no-products-icon">
                  📦
                </div>

                <h3>
                  No Products Available
                </h3>

                <p>
                  No products available
                  in{" "}
                  <strong>
                    {selectedCategory}
                  </strong>
                </p>

              </div>
            ) : (
              displayedProducts.map(
                (product) => {

                  const image =
                    getProductImage(
                      product
                    );

                  const name =
                    getProductName(
                      product
                    );

                  const price =
                    getProductPrice(
                      product
                    );

                  const oldPrice =
                    getOldPrice(
                      product
                    );

                  const reviewSummary =
                    reviewSummaries[product.id];

                  const discountText =
                    product.discount === undefined ||
                    product.discount === null ||
                    product.discount === ""
                      ? ""
                      : String(product.discount).includes("%")
                        ? String(product.discount)
                        : `${product.discount}% OFF`;

                  const bankOffer =
                    product.bankOffer ||
                    product.bankOfferText ||
                    product.offerText ||
                    "";

                  const isAdvertised =
                    product.isAd === true ||
                    product.ad === true ||
                    product.adLabel;

                  return (
                    <article
                      className="product-card"
                      key={product.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`View ${name}`}
                      onClick={() =>
                        handleProductClick(
                          product.id
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();
                          handleProductClick(
                            product.id
                          );
                        }
                      }}
                    >

                      {/* IMAGE */}

                      <div className="product-image">

                        {/* WISHLIST */}

                        <button
                          type="button"
                          className={`wishlist-button ${
                            wishlist.includes(
                              product.id
                            )
                              ? "liked"
                              : ""
                          }`}
                          onClick={(
                            event
                          ) =>
                            handleWishlist(
                              event,
                              product.id
                            )
                          }
                        >
                          {wishlist.includes(
                            product.id
                          )
                            ? "♥"
                            : "♡"}
                        </button>

                        {isAdvertised && (
                          <span className="ad-tag">
                            {product.adLabel || "AD"}
                          </span>
                        )}

                        {reviewSummary && (
                          <span className="rating-badge">
                            {Number(
                              reviewSummary.averageRating
                            ).toFixed(1)}
                            <b>★</b>
                          </span>
                        )}

                        {image ? (
                          <img
                            src={image}
                            alt={name}
                            onError={(
                              event
                            ) => {
                              event.currentTarget.style.display =
                                "none";

                              const parent =
                                event
                                  .currentTarget
                                  .parentElement;

                              if (
                                parent &&
                                !parent.querySelector(
                                  ".image-error"
                                )
                              ) {
                                const errorDiv =
                                  document.createElement(
                                    "div"
                                  );

                                errorDiv.className =
                                  "image-error";

                                errorDiv.textContent =
                                  "📦";

                                parent.appendChild(
                                  errorDiv
                                );
                              }
                            }}
                          />
                        ) : (
                          <div className="no-image">
                            📦
                          </div>
                        )}

                      </div>

                      {/* PRODUCT INFO */}

                      <div className="product-info">

                        <h3>
                          {name}
                        </h3>

                        {discountText && (
                          <strong className="discount-text">
                            {discountText}
                          </strong>
                        )}

                        <div className="price-row">

                          {oldPrice &&
                            Number(oldPrice) >
                              Number(price) && (
                            <del>
                              ₹
                              {Number(
                                oldPrice
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </del>
                          )}

                          <strong>
                            ₹
                            {Number(price).toLocaleString(
                              "en-IN"
                            )}
                          </strong>

                        </div>

                        {bankOffer && (
                          <strong className="bank-offer">
                            {bankOffer}
                          </strong>
                        )}

                      </div>

                    </article>
                  );
                }
              )
            )}

          </div>

          {hasMoreProducts && (
            <div
              ref={loadMoreRef}
              className="products-load-more"
              aria-live="polite"
            >
              {loadingMoreProducts
                ? "Loading more products..."
                : "Scroll for more products"}
            </div>
          )}

        </section>

        {/* ===================================================
            FEATURES
        =================================================== */}

        <section className="service-section">

          <div className="service-card">

            <div className="service-icon">
              🚚
            </div>

            <div>
              <strong>
                Free Delivery
              </strong>

              <span>
                On orders above ₹499
              </span>
            </div>

          </div>

          <div className="service-card">

            <div className="service-icon">
              🔒
            </div>

            <div>
              <strong>
                Secure Payments
              </strong>

              <span>
                100% protected checkout
              </span>
            </div>

          </div>

          <div className="service-card">

            <div className="service-icon">
              ↩️
            </div>

            <div>
              <strong>
                Easy Returns
              </strong>

              <span>
                Simple return process
              </span>
            </div>

          </div>

          <div className="service-card">

            <div className="service-icon">
              ☎️
            </div>

            <div>
              <strong>
                24/7 Support
              </strong>

              <span>
                We're here to help
              </span>
            </div>

          </div>

        </section>

        {/* ===================================================
            EXPLORE CATEGORIES
        =================================================== */}

        <section className="explore-section">

          <div className="section-heading">

            <div>

              <span className="section-label">
                EXPLORE
              </span>

              <h2>
                Shop by category
              </h2>

            </div>

          </div>

          <div className="explore-grid">

            {categories
              .slice(0, 6)
              .map(
                (category) => (
                  <div
                    className={`explore-card ${
                      selectedCategory ===
                      category.name
                        ? "active"
                        : ""
                    }`}
                    key={
                      category.name
                    }
                    onClick={() =>
                      handleCategoryClick(
                        category.name
                      )
                    }
                  >

                    <div className="explore-icon">
                      {category.icon}
                    </div>

                    <h3>
                      {category.name}
                    </h3>

                    <span>
                      Explore →
                    </span>

                  </div>
                )
              )}

          </div>

        </section>

      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="footer">

        <div className="footer-main">

          {/* BRAND */}

          <div className="footer-brand">

            <div className="brand">

              <div className="brand-logo">
                N
              </div>

              <div>

                <div className="brand-name">
                  RS
                </div>

                <div className="brand-tagline">
                  Shop. Discover. Enjoy.
                </div>

              </div>

            </div>

            <p>
              Your trusted destination
              for everything you love,
              delivered right to your
              doorstep.
            </p>

          </div>

          {/* COMPANY */}

          <div className="footer-column">

            <h4>
              Company
            </h4>

            <a href="#about">
              About Us
            </a>

            <a href="#careers">
              Careers
            </a>

            <a href="#contact">
              Contact
            </a>

            <a href="#press">
              Press
            </a>

          </div>

          {/* HELP */}

          <div className="footer-column">

            <h4>
              Help
            </h4>

            <a href="#payments">
              Payments
            </a>

            <a href="#shipping">
              Shipping
            </a>

            <a href="#returns">
              Returns
            </a>

            <a href="#faq">
              FAQ
            </a>

          </div>

          {/* LEGAL */}

          <div className="footer-column">

            <h4>
              Legal
            </h4>

            <a href="#privacy">
              Privacy
            </a>

            <a href="#terms">
              Terms
            </a>

            <a href="#security">
              Security
            </a>

            <a href="#sitemap">
              Sitemap
            </a>

          </div>

        </div>

        <div className="footer-bottom">

          <span>
            © 2026 JS.
            All rights reserved.
          </span>

          <span>
            Made for better shopping.
          </span>

        </div>

      </footer>

    </div>
  );
}

export default Home;