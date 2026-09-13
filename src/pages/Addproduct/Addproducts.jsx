import { useEffect, useState } from "react";
import { auth, db } from "../../../backend/firebase";
import "./Addproducts.css";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "https://js-fashion-2.onrender.com"
).replace(/\/$/, "");

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    brand: "",
    description: "",
    price: "",
    category: "",
    stock: "",
    images: [],
  });

  const [loading, setLoading] = useState(false);


  // =========================
  // GET TOKEN
  // =========================

  const getToken = async () => {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Not logged in");
    }

    return await user.getIdToken();
  };

  // =========================
  // FETCH PRODUCTS
  // =========================

  // const fetchProducts = async () => {
  //   try {
  //     const token = await getToken();

  //     const response = await fetch(
  //       "http://localhost:5000/add-pro",
  //       {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //         },
  //       }
  //     );

  //     const data = await response.json();

  //     if (!response.ok) {
  //       throw new Error(
  //         data.message || "Failed to fetch products"
  //       );
  //     }

  //     setProducts(data);
  //   } catch (error) {
  //     console.error("Fetch products error:", error);
  //   }
  // };

  const fetchProducts = async () => {
  try {
    const token = await getToken();

    const response = await fetch(
      `${API_BASE_URL}/api/add-pro`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to fetch products"
      );
    }

    // Firebase/backend returned products
    setProducts(data);

  } catch (error) {
    console.error("Fetch products error:", error);
  }
};

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchProducts();
      }
    });

    return unsubscribe;
  }, []);

  // =========================
  // INPUT CHANGE
  // =========================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================
  // MULTIPLE IMAGE CHANGE
  // =========================

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);

    if (files.length > 4) {
      alert("You can upload maximum 4 images");
      e.target.value = "";
      return;
    }

    setForm((prev) => ({
      ...prev,
      images: files,
    }));
  };

  // =========================
  // ADD / UPDATE
  // =========================

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const token = await getToken();

      const formData = new FormData();

      formData.append("name", form.name);
      formData.append("brand", form.brand);
      formData.append("description", form.description);
      formData.append("price", form.price);
      formData.append("category", form.category);
      formData.append("stock", form.stock);

      // Add multiple images
      form.images.forEach((image) => {
        formData.append("images", image);
      });

      const url = editingId
        ? `${API_BASE_URL}/api/add-pro/${editingId}`
        : `${API_BASE_URL}/api/add-pro`;

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Something went wrong"
        );
      }

      const savedProductId =
        editingId || data.productId;

      if (savedProductId) {
        await updateDoc(
          doc(db, "products", savedProductId),
          {
            brand: form.brand.trim(),
            updatedAt: serverTimestamp(),
          }
        );
      }

      alert(
        editingId
          ? "Product updated successfully"
          : "Product added successfully"
      );

      resetForm();
      await fetchProducts();

    } catch (error) {
      console.error("Product error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // EDIT
  // =========================

  const editProduct = (product) => {
    setEditingId(product.id);

    setForm({
      name: product.name || "",
      brand: product.brand || "",
      description: product.description || "",
      price: product.price || "",
      category: product.category || "",
      stock: product.stock || "",
      images: [],
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================
  // DELETE
  // =========================

  const deleteProduct = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const token = await getToken();

      const response = await fetch(
        `${API_BASE_URL}/api/add-pro/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete product"
        );
      }

      alert("Product deleted successfully");

      fetchProducts();

    } catch (error) {
      console.error("Delete error:", error);
      alert(error.message);
    }
  };

  // =========================
  // RESET
  // =========================

  const resetForm = () => {
    setEditingId(null);

    setForm({
      name: "",
      description: "",
      price: "",
      category: "",
      stock: "",
      images: [],
    });

    // Reset file input
    const fileInput = document.getElementById(
      "product-images"
    );

    if (fileInput) {
      fileInput.value = "";
    }
  };

  return (
    <div className="admin-container">

      {/* HEADER */}

      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Manage your products</p>
        </div>

        <button onClick={()=>{window.location.reload();}}>
          Refresh
        </button>
      </div>


      {/* PRODUCT FORM */}

      <div className="product-form-card">

        <h2>
          {editingId
            ? "Update Product"
            : "Add New Product"}
        </h2>

        <form onSubmit={handleSubmit}>

          {/* NAME */}

          <input
            type="text"
            name="name"
            placeholder="Product name"
            value={form.name}
            onChange={handleChange}
            required
          />

          {/* BRAND */}

          <input
            type="text"
            name="brand"
            placeholder="Brand"
            value={form.brand}
            onChange={handleChange}
            required
          />


          {/* DESCRIPTION */}

          <textarea
            name="description"
            placeholder="Product description"
            value={form.description}
            onChange={handleChange}
          />


          {/* PRICE */}

          <input
            type="number"
            name="price"
            placeholder="Price"
            value={form.price}
            onChange={handleChange}
            required
          />


          {/* CATEGORY */}

          <input
            type="text"
            name="category"
            placeholder="Category"
            value={form.category}
            onChange={handleChange}
            required
          />


          {/* STOCK */}

          <input
            type="number"
            name="stock"
            placeholder="Stock"
            value={form.stock}
            onChange={handleChange}
          />


          {/* MULTIPLE IMAGES */}

          <label>
            Product Images
          </label>

          <input
            id="product-images"
            type="file"
            name="images"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            required={!editingId}
          />

          <small>
            Select maximum 4 images
          </small>


          {/* SELECTED IMAGE PREVIEW */}

          {form.images.length > 0 && (
            <div className="selected-images">

              {form.images.map((image, index) => (
                <div
                  key={index}
                  className="selected-image"
                >
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`preview-${index}`}
                  />

                  <span>
                    Image {index + 1}
                  </span>
                </div>
              ))}

            </div>
          )}


          {/* BUTTONS */}

          <div className="form-buttons">

            <button
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : editingId
                ? "Update Product"
                : "Add Product"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}

          </div>

        </form>
      </div>


      {/* PRODUCTS */}

      <div className="products-section">

        <h2>
          Products ({products.length})
        </h2>

        <div className="products-grid">

          {products.map((product) => (

            <div
              className="product-card"
              key={product.id}
            >

              {/* PRODUCT IMAGES */}

              <div className="product-images">

                {(product.images || []).map(
                  (image, index) => (

                    <img
                      key={index}
                      src={image.url}
                      alt={`${product.name}-${index + 1}`}
                    />

                  )
                )}

              </div>


              {/* PRODUCT INFO */}

              <div className="product-info">

                <h3>
                  {product.name}
                </h3>

                {product.brand && (
                  <span>
                    Brand: {product.brand}
                  </span>
                )}

                <p>
                  {product.description}
                </p>

                <strong>
                  ₹{product.price}
                </strong>

                <span>
                  Category: {product.category}
                </span>

                <span>
                  Stock: {product.stock}
                </span>


                {/* ACTIONS */}

                <div className="product-actions">

                  <button
                    onClick={() =>
                      editProduct(product)
                    }
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      deleteProduct(product.id)
                    }
                  >
                    Delete
                  </button>

                </div>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}