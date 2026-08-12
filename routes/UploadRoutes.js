// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: routes/UploadRoutes.js
// ADMIN IMAGE UPLOAD ROUTES
// MULTER MEMORY STORAGE + CLOUDINARY
// ============================================================

"use strict";

const express =
  require("express");

const multer =
  require("multer");

const cloudinary =
  require("cloudinary").v2;

const requireAdmin =
  require("../middleware/requireAdmin");

const router =
  express.Router();

// ============================================================
// UPLOAD SETTINGS
// ============================================================

const MAX_IMAGE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
];

// ============================================================
// CLOUDINARY CONFIGURATION
// ============================================================

cloudinary.config({
  cloud_name:
    process.env
      .CLOUDINARY_CLOUD_NAME,

  api_key:
    process.env
      .CLOUDINARY_API_KEY,

  api_secret:
    process.env
      .CLOUDINARY_API_SECRET,

  secure:
    true
});

// ============================================================
// CLOUDINARY CONFIGURATION CHECK
// ============================================================

function isCloudinaryConfigured() {
  return Boolean(
    process.env
      .CLOUDINARY_CLOUD_NAME &&
    process.env
      .CLOUDINARY_API_KEY &&
    process.env
      .CLOUDINARY_API_SECRET
  );
}

// ============================================================
// MULTER CONFIGURATION
//
// Memory storage is used because Vercel does not provide
// dependable permanent local file storage.
// ============================================================

const upload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      files:
        1,

      fileSize:
        MAX_IMAGE_SIZE
    },

    fileFilter:
      function (
        request,
        file,
        callback
      ) {
        if (
          ALLOWED_IMAGE_TYPES.includes(
            file.mimetype
          )
        ) {
          callback(
            null,
            true
          );

          return;
        }

        const error =
          new Error(
            "Only JPG, JPEG, PNG, WEBP, and GIF images are allowed."
          );

        error.statusCode = 400;
        error.code =
          "INVALID_IMAGE_TYPE";

        callback(
          error,
          false
        );
      }
  });

// ============================================================
// TEXT CLEANING
// ============================================================

function cleanText(
  value,
  maximumLength
) {
  return String(value || "")
    .trim()
    .slice(
      0,
      maximumLength
    );
}

// ============================================================
// SAFE CLOUDINARY FOLDER
// ============================================================

function getUploadFolder(request) {
  const requestedFolder =
    cleanText(
      request.body.folder,
      100
    )
      .toLowerCase()
      .replace(
        /[^a-z0-9/_-]+/g,
        "-"
      )
      .replace(
        /^\/+|\/+$/g,
        ""
      );

  if (!requestedFolder) {
    return (
      "multi-maniacs-customs/products"
    );
  }

  return (
    "multi-maniacs-customs/" +
    requestedFolder
  );
}

// ============================================================
// ERROR HANDLER
// ============================================================

function sendUploadError(
  response,
  error
) {
  console.error(
    "Image upload route error:",
    error
  );

  if (
    error instanceof
    multer.MulterError
  ) {
    if (
      error.code ===
      "LIMIT_FILE_SIZE"
    ) {
      return response
        .status(400)
        .json({
          error:
            "The image must be 10 MB or smaller."
        });
    }

    if (
      error.code ===
      "LIMIT_FILE_COUNT"
    ) {
      return response
        .status(400)
        .json({
          error:
            "Only one image may be uploaded at a time."
        });
    }

    return response
      .status(400)
      .json({
        error:
          "The image upload could not be processed."
      });
  }

  const statusCode =
    Number(
      error.statusCode
    ) || 500;

  return response
    .status(statusCode)
    .json({
      error:
        statusCode >= 500
          ? "The image could not be uploaded."
          : (
              error.message ||
              "The image could not be uploaded."
            )
    });
}

// ============================================================
// MULTER MIDDLEWARE WRAPPER
// ============================================================

function receiveImage(
  request,
  response,
  next
) {
  upload.single("image")(
    request,
    response,
    function (error) {
      if (error) {
        sendUploadError(
          response,
          error
        );

        return;
      }

      next();
    }
  );
}

// ============================================================
// UPLOAD BUFFER TO CLOUDINARY
// ============================================================

function uploadImageToCloudinary(
  imageFile,
  folder
) {
  return new Promise(
    function (
      resolve,
      reject
    ) {
      if (!imageFile) {
        const error =
          new Error(
            'Select an image using the field name "image".'
          );

        error.statusCode = 400;

        reject(error);

        return;
      }

      if (
        !isCloudinaryConfigured()
      ) {
        const error =
          new Error(
            "Cloudinary is not configured on the server."
          );

        error.statusCode = 503;

        reject(error);

        return;
      }

      const originalFilename =
        cleanText(
          imageFile.originalname,
          200
        );

      const uploadStream =
        cloudinary.uploader
          .upload_stream(
            {
              folder:
                folder,

              resource_type:
                "image",

              use_filename:
                true,

              unique_filename:
                true,

              overwrite:
                false,

              filename_override:
                originalFilename,

              transformation: [
                {
                  quality:
                    "auto"
                },

                {
                  fetch_format:
                    "auto"
                }
              ]
            },
            function (
              error,
              result
            ) {
              if (error) {
                reject(error);

                return;
              }

              resolve(result);
            }
          );

      uploadStream.end(
        imageFile.buffer
      );
    }
  );
}

// ============================================================
// IMAGE UPLOAD HANDLER
// ============================================================

async function uploadImageHandler(
  request,
  response
) {
  try {
    if (!request.file) {
      return response
        .status(400)
        .json({
          error:
            'Select an image using the field name "image".'
        });
    }

    const folder =
      getUploadFolder(
        request
      );

    const result =
      await uploadImageToCloudinary(
        request.file,
        folder
      );

    const imageUrl =
      result.secure_url ||
      result.url ||
      "";

    if (!imageUrl) {
      throw new Error(
        "Cloudinary did not return an image URL."
      );
    }

    return response
      .status(201)
      .json({
        message:
          "Image uploaded successfully.",

        url:
          imageUrl,

        secure_url:
          imageUrl,

        publicId:
          result.public_id ||
          "",

        public_id:
          result.public_id ||
          "",

        width:
          Number(
            result.width || 0
          ),

        height:
          Number(
            result.height || 0
          ),

        format:
          String(
            result.format || ""
          ),

        bytes:
          Number(
            result.bytes || 0
          ),

        originalFilename:
          request.file
            .originalname,

        folder:
          folder
      });
  } catch (error) {
    return sendUploadError(
      response,
      error
    );
  }
}

// ============================================================
// ADMIN: UPLOAD IMAGE
//
// POST /upload/image
//
// Multipart field name:
// image
// ============================================================

router.post(
  "/image",
  requireAdmin,
  receiveImage,
  uploadImageHandler
);

// ============================================================
// ADMIN: LEGACY IMAGE UPLOAD ROUTE
//
// POST /upload
//
// This keeps older frontend code working.
// ============================================================

router.post(
  "/",
  requireAdmin,
  receiveImage,
  uploadImageHandler
);

// ============================================================
// ADMIN: DELETE CLOUDINARY IMAGE
//
// DELETE /upload/image
//
// Body:
// {
//   "publicId": "multi-maniacs-customs/products/example"
// }
// ============================================================

router.delete(
  "/image",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      if (
        !isCloudinaryConfigured()
      ) {
        return response
          .status(503)
          .json({
            error:
              "Cloudinary is not configured on the server."
          });
      }

      const publicId =
        cleanText(
          request.body.publicId ||
          request.body.public_id,
          500
        );

      if (!publicId) {
        return response
          .status(400)
          .json({
            error:
              "Cloudinary public ID is required."
          });
      }

      const allowedPrefix =
        "multi-maniacs-customs/";

      if (
        !publicId.startsWith(
          allowedPrefix
        )
      ) {
        return response
          .status(403)
          .json({
            error:
              "This image cannot be deleted through this route."
          });
      }

      const result =
        await cloudinary.uploader
          .destroy(
            publicId,
            {
              resource_type:
                "image",

              invalidate:
                true
            }
          );

      if (
        result.result !== "ok" &&
        result.result !==
          "not found"
      ) {
        throw new Error(
          "Cloudinary could not delete the image."
        );
      }

      return response.json({
        message:
          result.result ===
            "not found"
            ? "The image was already unavailable."
            : "Image deleted successfully.",

        publicId:
          publicId,

        result:
          result.result
      });
    } catch (error) {
      return sendUploadError(
        response,
        error
      );
    }
  }
);

// ============================================================
// ADMIN: CLOUDINARY STATUS
//
// GET /upload/status
//
// Returns configuration status only.
// Secret credentials are never returned.
// ============================================================

router.get(
  "/status",
  requireAdmin,
  function (
    request,
    response
  ) {
    return response.json({
      configured:
        isCloudinaryConfigured(),

      maximumImageSize:
        MAX_IMAGE_SIZE,

      allowedImageTypes:
        ALLOWED_IMAGE_TYPES
    });
  }
);

// ============================================================
// EXPORT UPLOAD ROUTER
// ============================================================

module.exports = router;