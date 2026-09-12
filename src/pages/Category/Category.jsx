import { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";

import { db } from "../../../backend/firebase";

import "./Categotry.css";

function Category() {
  const { categoryName } = useParams();

  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // =====================================================
  // GET IMAGE
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
  // GET OLD PRICE
  // =====================================================

  const getOldPrice = (product) => {
    return (
      product.oldPrice ??
      product.originalPrice ??
      null
    );
  };

  // =====================================================
  // GET CREATED DATE
  // =====================================================

  const getDateValue = (date) => {
    if (!date) {
      return 0;
    }

    // Firebase Timestamp
    if (date.toDate) {
      return date.toDate().getTime();
    }

    // Firebase timestamp object
    if (date.seconds) {
      return date.seconds * 1000;
    }

    // Normal date
    const parsedDate = new Date(date).getTime();

    return isNaN(parsedDate) ? 0 : parsedDate;
  };

  // =====================================================
  // FETCH PRODUCTS
  // =====================================================

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);

        const productsRef = collection(
          db,
          "products"
        );

        let snapshot;

        // =================================================
        // FOR YOU
        // Recently added products
        // =================================================

        const isForYou =
          !categoryName ||
          categoryName.toLowerCase() === "for-you" ||
          categoryName.toLowerCase() === "for you";

        if (isForYou) {
          try {
            // Latest products using createdAt
            const q = query(
              productsRef,
              orderBy("createdAt", "desc"),
              limit(20)
            );

            snapshot = await getDocs(q);
          } catch (error) {
            console.warn(
              "createdAt orderBy failed. Fetching all products instead.",
              error
            );

            // Fallback
            snapshot = await getDocs(productsRef);
          }
        }

        // =================================================
        // PARTICULAR CATEGORY
        // =================================================

        else {
          const q = query(
            productsRef,
            where(
              "category",
              "==",
              categoryName
            )
          );

          snapshot = await getDocs(q);
        }

        // =================================================
        // CONVERT FIRESTORE DATA
        // =================================================

        let productList =
          snapshot.docs.map((productDoc) => ({
            id: productDoc.id,
            ...productDoc.data(),
          }));

        // =================================================
        // SORT LATEST FIRST
        // =================================================

        productList.sort((a, b) => {
          const dateA = getDateValue(
            a.createdAt
          );

          const dateB = getDateValue(
            b.createdAt
          );

          return dateB - dateA;
        });

        // For You → only latest 20
        if (isForYou) {
          productList =
            productList.slice(0, 20);
        }

        console.log(
          "Category:",
          categoryName
        );

        console.log(
          "Products:",
          productList
        );

        setProducts(productList);
      } catch (error) {
        console.error(
          "Category products fetch error:",
          error
        );

        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [categoryName]);

  // =====================================================
  // PRODUCT CLICK
  // =====================================================

  const handleProductClick = (productId) => {
    if (!productId) {
      return;
    }

    navigate(`/product/${productId}`);
  };

  // =====================================================
  // PAGE TITLE
  // =====================================================

  const isForYou =
    !categoryName ||
    categoryName.toLowerCase() === "for-you" ||
    categoryName.toLowerCase() === "for you";

  const pageTitle = isForYou
    ? "For You"
    : categoryName;

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="category-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="category-header">

        <div>
          <span className="category-label">
            {isForYou
              ? "RECOMMENDED"
              : "CATEGORY"}
          </span>

          <h1>{pageTitle}</h1>
        </div>

        {!loadingProducts && (
          <span className="product-count">
            {products.length} Products
          </span>
        )}

      </div>

      {/* =================================================
          LOADING
      ================================================= */}

      {loadingProducts && (
        <div className="products-loading">
          <div className="loading-spinner"></div>

          <p>
            Loading products...
          </p>
        </div>
      )}

      {/* =================================================
          NO PRODUCTS
      ================================================= */}

      {!loadingProducts &&
        products.length === 0 && (
          <div className="no-products">

            <div className="no-products-icon">
              📦
            </div>

            <h2>
              No Products Available
            </h2>

            <p>
              There are no products available
              in <strong>{pageTitle}</strong>.
            </p>

            <button
              onClick={() =>
                navigate("/")
              }
            >
              Continue Shopping
            </button>

          </div>
        )}

      {/* =================================================
          PRODUCT GRID
      ================================================= */}

      {!loadingProducts &&
        products.length > 0 && (

          <div className="category-product-grid">

            {products.map((product) => {

              const image =
                getProductImage(product);

              const name =
                getProductName(product);

              const price =
                getProductPrice(product);

              const oldPrice =
                getOldPrice(product);

              return (
                <article
                  className="category-product-card"
                  key={product.id}
                  onClick={() =>
                    handleProductClick(
                      product.id
                    )
                  }
                >

                  {/* =====================================
                      IMAGE
                  ===================================== */}

                  <div className="category-product-image">

                    {image ? (
                      <img
                        src={image}
                        alt={name}
                        onError={(e) => {
                          e.currentTarget.style.display =
                            "none";

                          const parent =
                            e.currentTarget
                              .parentElement;

                          if (
                            parent &&
                            !parent.querySelector(
                              ".category-image-error"
                            )
                          ) {
                            const errorDiv =
                              document.createElement(
                                "div"
                              );

                            errorDiv.className =
                              "category-image-error";

                            errorDiv.textContent =
                              "📦";

                            parent.appendChild(
                              errorDiv
                            );
                          }
                        }}
                      />
                    ) : (
                      <div className="category-no-image">
                        📦
                      </div>
                    )}

                  </div>

                  {/* =====================================
                      PRODUCT INFO
                  ===================================== */}

                  <div className="category-product-info">

                    <h3>
                      {name}
                    </h3>

                    {/* BRAND */}

                    {product.brand && (
                      <p className="category-brand">
                        {product.brand}
                      </p>
                    )}

                    {/* DESCRIPTION */}

                    {product.description && (
                      <p className="category-description">
                        {product.description}
                      </p>
                    )}

                    {/* RATING */}

                    {product.rating !==
                      undefined && (
                      <div className="category-rating">

                        <span>
                          ★{" "}
                          {Number(
                            product.rating || 0
                          ).toFixed(1)}
                        </span>

                        <small>
                          (
                          {product.reviewCount ||
                            0}
                          )
                        </small>

                      </div>
                    )}

                    {/* PRICE */}

                    <div className="category-price-row">

                      <strong>
                        ₹
                        {Number(
                          price
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>

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

                    </div>

                    {/* CATEGORY */}

                    {product.category && (
                      <span className="product-category">
                        {product.category}
                      </span>
                    )}

                    {/* VIEW PRODUCT */}

                    <button
                      className="view-product-button"
                      onClick={(e) => {
                        e.stopPropagation();

                        handleProductClick(
                          product.id
                        );
                      }}
                    >
                      View Product →
                    </button>

                  </div>

                </article>
              );
            })}

          </div>
        )}

    </div>
  );
}

export default Category;