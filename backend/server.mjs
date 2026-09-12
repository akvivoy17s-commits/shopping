import express from "express";
import cors from "cors";
import multer from "multer";
import sharp from "sharp";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { db, auth } from "./firebaseAdmin.js";
import path from "path";

// =====================================================
// ENV
// =====================================================

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

console.log(
  "ENV FILE:",
  path.resolve(process.cwd(), ".env")
);

console.log(
  "cloud_name:",
  process.env.CLOUDINARY_CLOUD_NAME
);

// =====================================================
// EXPRESS APP
// =====================================================

const app = express();

app.use(cors());
app.use(express.json());

const frontendDirectory = path.resolve(
  process.cwd(),
  "dist/client"
);

app.use(express.static(frontendDirectory));

// =====================================================
// CLOUDINARY CONFIG
// =====================================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// =====================================================
// MULTER
// =====================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

// =====================================================
// PROFILE IMAGE UPLOAD
// =====================================================

app.post(
  "/upload-profile",
  upload.single("profileImage"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image selected",
        });
      }

      console.log(
        "Profile image received:",
        req.file.originalname
      );

      // =================================================
      // SHARP
      // =================================================

      const compressedImage = await sharp(req.file.buffer)
        .resize(500, 500, {
          fit: "cover",
          position: "centre",
        })
        .webp({
          quality: 75,
        })
        .toBuffer();

      console.log(
        "Original size:",
        req.file.size,
        "bytes"
      );

      console.log(
        "Compressed size:",
        compressedImage.length,
        "bytes"
      );

      // =================================================
      // CLOUDINARY
      // =================================================

      const result = await new Promise(
        (resolve, reject) => {
          const stream =
            cloudinary.uploader.upload_stream(
              {
                folder: "rs-shopping/profile",
                resource_type: "image",
                format: "webp",
              },
              (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  resolve(result);
                }
              }
            );

          stream.end(compressedImage);
        }
      );

      console.log(
        "Cloudinary URL:",
        result.secure_url
      );

      return res.status(200).json({
        success: true,
        message:
          "Profile image uploaded successfully",
        imageUrl: result.secure_url,
        publicId: result.public_id,
      });
    } catch (error) {
      console.error(
        "PROFILE IMAGE UPLOAD ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Profile image upload failed",
        error: error.message,
      });
    }
  }
);

// =====================================================
// ADMIN AUTH MIDDLEWARE
// =====================================================

const verifyAdmin = async (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token =
      authHeader.split("Bearer ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Invalid token",
      });
    }

    const decodedToken =
      await auth.verifyIdToken(token);

    const userDoc =
      await db
        .collection("users")
        .doc(decodedToken.uid)
        .get();

    if (!userDoc.exists) {
      return res.status(403).json({
        message: "User not found",
      });
    }

    const userData =
      userDoc.data();

    if (userData.role !== "admin") {
      return res.status(403).json({
        message: "Admin access only",
      });
    }

    req.user = decodedToken;

    next();
  } catch (error) {
    console.error(
      "ADMIN AUTH ERROR:",
      error
    );

    return res.status(401).json({
      message:
        "Invalid authentication token",
    });
  }
};

// =====================================================
// CLOUDINARY PRODUCT UPLOAD
// =====================================================

const uploadToCloudinary = (
  buffer
) => {
  return new Promise(
    (resolve, reject) => {
      const stream =
        cloudinary.uploader.upload_stream(
          {
            folder:
              "ecommerce/products",
            resource_type:
              "image",
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

      stream.end(buffer);
    }
  );
};

// =====================================================
// ADD PRODUCT
// =====================================================

app.post(
  "/add-pro",
  verifyAdmin,
  upload.array(
    "images",
    4
  ),
  async (req, res) => {
    try {
      const {
        name,
        brand,
        description,
        price,
        category,
        stock,
      } = req.body;

      if (
        !name ||
        !brand ||
        !price ||
        !category
      ) {
        return res.status(400).json({
          message:
            "Name, brand, price and category are required",
        });
      }

      if (
        !req.files ||
        req.files.length === 0
      ) {
        return res.status(400).json({
          message:
            "At least one product image is required",
        });
      }

      if (
        req.files.length > 4
      ) {
        return res.status(400).json({
          message:
            "Maximum 4 images are allowed",
        });
      }

      const imageUrls = [];
      const cloudinaryPublicIds = [];

      // =============================================
      // UPLOAD IMAGES
      // =============================================

      for (
        const file of req.files
      ) {
        const compressedImage =
          await sharp(
            file.buffer
          )
            .resize({
              width: 1200,
              height: 1200,
              fit: "inside",
              withoutEnlargement:
                true,
            })
            .webp({
              quality: 80,
            })
            .toBuffer();

        const cloudinaryResult =
          await uploadToCloudinary(
            compressedImage
          );

        imageUrls.push(
          cloudinaryResult.secure_url
        );

        cloudinaryPublicIds.push(
          cloudinaryResult.public_id
        );
      }

      // =============================================
      // FIRESTORE DATA
      // =============================================

      const productData = {
        name,
        brand:
          brand || "",
        description:
          description || "",
        price:
          Number(price),
        category,
        stock:
          Number(stock || 0),
        imageUrls,
        cloudinaryPublicIds,
        createdAt:
          new Date(),
        updatedAt:
          new Date(),
      };

      const productRef =
        await db
          .collection("products")
          .add(productData);

      return res.status(201).json({
        message:
          "Product added successfully",
        productId:
          productRef.id,
        product: {
          id:
            productRef.id,
          ...productData,
        },
      });
    } catch (error) {
      console.error(
        "ADD PRODUCT ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to add product",
        error:
          error.message,
      });
    }
  }
);

// =====================================================
// GET ADMIN PRODUCTS
// =====================================================

app.get(
  "/add-pro",
  verifyAdmin,
  async (req, res) => {
    try {
      const snapshot =
        await db
          .collection("products")
          .orderBy(
            "createdAt",
            "desc"
          )
          .get();

      const products =
        snapshot.docs.map(
          (doc) => ({
            id:
              doc.id,
            ...doc.data(),
          })
        );

      res.json(
        products
      );
    } catch (error) {
      console.error(
        "GET PRODUCTS ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch products",
      });
    }
  }
);

// =====================================================
// UPDATE PRODUCT
// =====================================================

app.put(
  "/add-pro/:id",
  verifyAdmin,
  upload.array(
    "images",
    4
  ),
  async (req, res) => {
    try {
      const productId =
        req.params.id;

      const productRef =
        db
          .collection("products")
          .doc(productId);

      const productSnapshot =
        await productRef.get();

      if (
        !productSnapshot.exists
      ) {
        return res.status(404).json({
          message:
            "Product not found",
        });
      }

      const oldProduct =
        productSnapshot.data();

      const {
        name,
        brand,
        description,
        price,
        category,
        stock,
      } = req.body;

      if (
        !name ||
        !brand ||
        !price ||
        !category
      ) {
        return res.status(400).json({
          message:
            "Name, brand, price and category are required",
        });
      }

      const updateData = {
        name,
        brand:
          brand || "",
        description:
          description || "",
        price:
          Number(price),
        category,
        stock:
          Number(stock || 0),
        updatedAt:
          new Date(),
      };

      // =============================================
      // NEW IMAGES
      // =============================================

      if (
        req.files &&
        req.files.length > 0
      ) {
        if (
          req.files.length > 4
        ) {
          return res.status(400).json({
            message:
              "Maximum 4 images are allowed",
          });
        }

        const imageUrls = [];
        const cloudinaryPublicIds = [];

        for (
          const file of req.files
        ) {
          const compressedImage =
            await sharp(
              file.buffer
            )
              .resize({
                width: 1200,
                height: 1200,
                fit: "inside",
                withoutEnlargement:
                  true,
              })
              .webp({
                quality: 80,
              })
              .toBuffer();

          const cloudinaryResult =
            await uploadToCloudinary(
              compressedImage
            );

          imageUrls.push(
            cloudinaryResult.secure_url
          );

          cloudinaryPublicIds.push(
            cloudinaryResult.public_id
          );
        }

        updateData.imageUrls =
          imageUrls;

        updateData.cloudinaryPublicIds =
          cloudinaryPublicIds;

        // ===========================================
        // DELETE OLD IMAGES
        // ===========================================

        if (
          oldProduct.cloudinaryPublicIds &&
          Array.isArray(
            oldProduct.cloudinaryPublicIds
          )
        ) {
          for (
            const publicId of
            oldProduct.cloudinaryPublicIds
          ) {
            try {
              await cloudinary
                .uploader
                .destroy(
                  publicId
                );
            } catch (
              error
            ) {
              console.error(
                "Failed to delete old image:",
                error.message
              );
            }
          }
        }

        // ===========================================
        // OLD SINGLE IMAGE SUPPORT
        // ===========================================

        if (
          oldProduct.cloudinaryPublicId
        ) {
          try {
            await cloudinary
              .uploader
              .destroy(
                oldProduct.cloudinaryPublicId
              );
          } catch (
            error
          ) {
            console.error(
              "Failed to delete old image:",
              error.message
            );
          }
        }
      }

      await productRef.update(
        updateData
      );

      res.json({
        message:
          "Product updated successfully",
      });
    } catch (error) {
      console.error(
        "UPDATE PRODUCT ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update product",
        error:
          error.message,
      });
    }
  }
);

// =====================================================
// DELETE PRODUCT
// =====================================================

app.delete(
  "/add-pro/:id",
  verifyAdmin,
  async (req, res) => {
    try {
      const productId =
        req.params.id;

      const productRef =
        db
          .collection("products")
          .doc(productId);

      const productSnapshot =
        await productRef.get();

      if (
        !productSnapshot.exists
      ) {
        return res.status(404).json({
          message:
            "Product not found",
        });
      }

      const product =
        productSnapshot.data();

      // =============================================
      // DELETE CLOUDINARY IMAGES
      // =============================================

      if (
        product.cloudinaryPublicIds &&
        Array.isArray(
          product.cloudinaryPublicIds
        )
      ) {
        for (
          const publicId of
          product.cloudinaryPublicIds
        ) {
          try {
            await cloudinary
              .uploader
              .destroy(
                publicId
              );
          } catch (
            error
          ) {
            console.error(
              "Cloudinary delete error:",
              error.message
            );
          }
        }
      }

      // =============================================
      // OLD SINGLE IMAGE
      // =============================================

      if (
        product.cloudinaryPublicId
      ) {
        try {
          await cloudinary
            .uploader
            .destroy(
              product.cloudinaryPublicId
            );
        } catch (
          error
        ) {
          console.error(
            "Cloudinary delete error:",
            error.message
          );
        }
      }

      // =============================================
      // DELETE FIRESTORE
      // =============================================

      await productRef.delete();

      // Remove this product from every user's cart.
      const cartSnapshot = await db
        .collectionGroup("cart")
        .where("productId", "==", productId)
        .get();

      if (!cartSnapshot.empty) {
        let batch = db.batch();
        let operationCount = 0;

        for (const cartDoc of cartSnapshot.docs) {
          batch.delete(cartDoc.ref);
          operationCount += 1;

          if (operationCount === 500) {
            await batch.commit();
            batch = db.batch();
            operationCount = 0;
          }
        }

        if (operationCount > 0) {
          await batch.commit();
        }
      }

      res.json({
        message:
          "Product deleted successfully",
      });
    } catch (error) {
      console.error(
        "DELETE PRODUCT ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to delete product",
        error:
          error.message,
      });
    }
  }
);

// =====================================================
// PUBLIC GET PRODUCTS
// =====================================================

app.get(
  "/products",
  async (req, res) => {
    try {
      const snapshot =
        await db
          .collection("products")
          .orderBy(
            "createdAt",
            "desc"
          )
          .get();

      const products =
        snapshot.docs.map(
          (doc) => {
            const data =
              doc.data();

            return {
              id:
                doc.id,

              name:
                data.name || "",

              description:
                data.description || "",

              price:
                data.price || 0,

              category:
                data.category || "",

              stock:
                data.stock || 0,

              // First image
              image:
                data.imageUrls?.[0] || "",

              // All images
              imageUrls:
                data.imageUrls || [],

              rating:
                data.rating || 4.7,

              reviews:
                data.reviews || 0,
            };
          }
        );

      res.status(200).json(
        products
      );
    } catch (error) {
      console.error(
        "PUBLIC PRODUCTS ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch products",
        error:
          error.message,
      });
    }
  }
);

// =====================================================
// SERVER
// =====================================================

const PORT =
  process.env.PORT || 5000;

app.use((req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.includes(".")) {
    return next();
  }

  return res.sendFile(
    path.join(frontendDirectory, "index.html"),
    (error) => {
      if (error) {
        next(error);
      }
    }
  );
});

app.listen(
  PORT,
  () => {
    console.log(
      "================================="
    );

    console.log(
      `🚀 Server running on http://localhost:${PORT}`
    );

    console.log(
      "================================="
    );
  }
);
