// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: routes/ClientIntakeRoutes.js
// CLIENT INTAKE ROUTES
// NEON POSTGRESQL + CLOUDINARY + NODEMAILER
// ============================================================

"use strict";

const express =
  require("express");

const multer =
  require("multer");

const nodemailer =
  require("nodemailer");

const cloudinary =
  require("cloudinary").v2;

const ClientIntake =
  require("../models/ClientIntake");

const requireAdmin =
  require("../middleware/requireAdmin");

const router =
  express.Router();

// ============================================================
// CONSTANTS
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
            "Only JPG, PNG, WEBP, and GIF images are allowed."
          );

        error.statusCode = 400;

        callback(
          error,
          false
        );
      }
  });

// ============================================================
// TEXT HELPERS
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

function getRequestValue(
  requestBody,
  camelCaseName,
  snakeCaseName
) {
  if (
    requestBody &&
    requestBody[
      camelCaseName
    ] !== undefined
  ) {
    return requestBody[
      camelCaseName
    ];
  }

  if (
    requestBody &&
    snakeCaseName &&
    requestBody[
      snakeCaseName
    ] !== undefined
  ) {
    return requestBody[
      snakeCaseName
    ];
  }

  return "";
}

// ============================================================
// CLOUDINARY STATUS
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
// ERROR HANDLING
// ============================================================

function sendIntakeError(
  response,
  error,
  fallbackMessage
) {
  console.error(
    fallbackMessage,
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
            "The uploaded image must be 10 MB or smaller."
        });
    }

    return response
      .status(400)
      .json({
        error:
          "The image upload could not be processed."
      });
  }

  if (
    error.code === "22P02"
  ) {
    return response
      .status(400)
      .json({
        error:
          "The client intake ID is invalid."
      });
  }

  if (
    error.code === "23514"
  ) {
    return response
      .status(400)
      .json({
        error:
          "One or more client intake values are invalid."
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
          ? fallbackMessage
          : (
              error.message ||
              fallbackMessage
            ),

      validationErrors:
        error.validationErrors ||
        undefined
    });
}

// ============================================================
// MULTER MIDDLEWARE WRAPPER
// ============================================================

function receiveIntakeImage(
  request,
  response,
  next
) {
  upload.single("image")(
    request,
    response,
    function (error) {
      if (error) {
        sendIntakeError(
          response,
          error,
          "The intake image could not be uploaded."
        );

        return;
      }

      next();
    }
  );
}

// ============================================================
// UPLOAD IMAGE TO CLOUDINARY
// ============================================================

function uploadImageToCloudinary(
  imageFile
) {
  return new Promise(
    function (
      resolve,
      reject
    ) {
      if (!imageFile) {
        resolve({
          imageUrl:
            "",

          imagePublicId:
            ""
        });

        return;
      }

      if (
        !isCloudinaryConfigured()
      ) {
        const error =
          new Error(
            "Image uploads are temporarily unavailable because Cloudinary is not configured."
          );

        error.statusCode = 503;

        reject(error);

        return;
      }

      const uploadStream =
        cloudinary.uploader
          .upload_stream(
            {
              folder:
                "multi-maniacs-customs/client-intakes",

              resource_type:
                "image",

              use_filename:
                true,

              unique_filename:
                true,

              overwrite:
                false
            },
            function (
              error,
              result
            ) {
              if (error) {
                reject(error);

                return;
              }

              resolve({
                imageUrl:
                  result.secure_url ||
                  result.url ||
                  "",

                imagePublicId:
                  result.public_id ||
                  ""
              });
            }
          );

      uploadStream.end(
        imageFile.buffer
      );
    }
  );
}

// ============================================================
// DELETE CLOUDINARY IMAGE
// ============================================================

async function deleteCloudinaryImage(
  imagePublicId
) {
  if (
    !imagePublicId ||
    !isCloudinaryConfigured()
  ) {
    return;
  }

  try {
    await cloudinary.uploader
      .destroy(
        imagePublicId,
        {
          resource_type:
            "image"
        }
      );
  } catch (error) {
    console.error(
      "Cloudinary intake image could not be deleted:",
      error
    );
  }
}

// ============================================================
// EMAIL CONFIGURATION
// ============================================================

function isEmailConfigured() {
  return Boolean(
    process.env
      .INTAKE_EMAIL_USER &&
    process.env
      .INTAKE_EMAIL_PASS
  );
}

function createEmailTransporter() {
  if (!isEmailConfigured()) {
    return null;
  }

  return nodemailer
    .createTransport({
      service:
        "gmail",

      auth: {
        user:
          process.env
            .INTAKE_EMAIL_USER,

        pass:
          process.env
            .INTAKE_EMAIL_PASS
      }
    });
}

// ============================================================
// SEND INTAKE NOTIFICATION
// ============================================================

async function sendIntakeNotification(
  intake
) {
  const transporter =
    createEmailTransporter();

  if (!transporter) {
    console.warn(
      "Client intake email notification was skipped because email credentials are not configured."
    );

    return;
  }

  const notificationEmail =
    process.env
      .INTAKE_NOTIFICATION_EMAIL ||
    process.env
      .INTAKE_EMAIL_USER;

  const messageLines = [
    "A new Multi-Maniacs Customs client intake was submitted.",
    "",
    "Intake ID: " +
      intake.id,
    "Name: " +
      intake.name,
    "Phone: " +
      (
        intake.phone ||
        "Not provided"
      ),
    "Email: " +
      intake.email,
    "Preferred Contact: " +
      (
        intake.contactMethod ||
        "Not provided"
      ),
    "Project Type: " +
      intake.projectType,
    "Budget: " +
      (
        intake.budget ||
        "Not provided"
      ),
    "Timeline: " +
      (
        intake.timeline ||
        "Not provided"
      ),
    "Location: " +
      (
        intake.location ||
        "Not provided"
      ),
    "Status: " +
      intake.status,
    "",
    "Project Description:",
    intake.description,
    "",
    "Uploaded Image: " +
      (
        intake.imageUrl ||
        "No image provided"
      )
  ];

  await transporter.sendMail({
    from:
      process.env
        .INTAKE_EMAIL_USER,

    to:
      notificationEmail,

    replyTo:
      intake.email ||
      undefined,

    subject:
      "New MMC Client Intake - " +
      intake.name,

    text:
      messageLines.join(
        "\n"
      )
  });
}

// ============================================================
// CREATE CLIENT INTAKE HANDLER
// ============================================================

async function createClientIntakeHandler(
  request,
  response
) {
  let uploadedImage = {
    imageUrl:
      "",

    imagePublicId:
      ""
  };

  try {
    const requestBody =
      request.body || {};

    uploadedImage =
      await uploadImageToCloudinary(
        request.file
      );

    const intake =
      await ClientIntake
        .createClientIntake({
          name:
            cleanText(
              requestBody.name,
              150
            ),

          phone:
            cleanText(
              requestBody.phone,
              30
            ),

          email:
            cleanText(
              requestBody.email,
              254
            ),

          contactMethod:
            getRequestValue(
              requestBody,
              "contactMethod",
              "contact_method"
            ),

          projectType:
            getRequestValue(
              requestBody,
              "projectType",
              "project_type"
            ),

          description:
            cleanText(
              requestBody.description,
              5000
            ),

          budget:
            cleanText(
              requestBody.budget,
              100
            ),

          timeline:
            cleanText(
              requestBody.timeline,
              150
            ),

          location:
            cleanText(
              requestBody.location,
              250
            ),

          imageUrl:
            uploadedImage
              .imageUrl,

          imagePublicId:
            uploadedImage
              .imagePublicId,

          status:
            "new"
        });

    try {
      await sendIntakeNotification(
        intake
      );
    } catch (emailError) {
      console.error(
        "The intake was saved, but the email notification failed:",
        emailError
      );
    }

    return response
      .status(201)
      .json({
        message:
          "Client intake submitted successfully.",

        intakeId:
          intake.id
      });
  } catch (error) {
    if (
      uploadedImage &&
      uploadedImage.imagePublicId
    ) {
      await deleteCloudinaryImage(
        uploadedImage
          .imagePublicId
      );
    }

    return sendIntakeError(
      response,
      error,
      "The client intake could not be submitted."
    );
  }
}

// ============================================================
// PUBLIC: SUBMIT CLIENT INTAKE
//
// POST /client-intakes
// ============================================================

router.post(
  "/",
  receiveIntakeImage,
  createClientIntakeHandler
);

// ============================================================
// PUBLIC: SUBMIT CLIENT INTAKE
// LEGACY ROUTE SUPPORT
//
// POST /client-intakes/submit
// ============================================================

router.post(
  "/submit",
  receiveIntakeImage,
  createClientIntakeHandler
);

// ============================================================
// ADMIN: GET ALL CLIENT INTAKES
// LEGACY ROUTE SUPPORT
//
// GET /client-intakes/all
//
// Optional query parameters:
// ?search=TEXT
// ?status=new
// ============================================================

router.get(
  "/all",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const search =
        cleanText(
          request.query.search,
          250
        );

      const status =
        cleanText(
          request.query.status,
          30
        );

      let intakes;

      if (search) {
        intakes =
          await ClientIntake
            .searchClientIntakes(
              search
            );
      } else if (
        status &&
        status !== "all"
      ) {
        intakes =
          await ClientIntake
            .getClientIntakesByStatus(
              status
            );
      } else {
        intakes =
          await ClientIntake
            .getAllClientIntakes();
      }

      return response.json({
        intakes:
          intakes
      });
    } catch (error) {
      return sendIntakeError(
        response,
        error,
        "Client intakes could not be loaded."
      );
    }
  }
);

// ============================================================
// ADMIN: GET ALL CLIENT INTAKES
//
// GET /client-intakes/admin/all
// ============================================================

router.get(
  "/admin/all",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const search =
        cleanText(
          request.query.search,
          250
        );

      const status =
        cleanText(
          request.query.status,
          30
        );

      let intakes;

      if (search) {
        intakes =
          await ClientIntake
            .searchClientIntakes(
              search
            );
      } else if (
        status &&
        status !== "all"
      ) {
        intakes =
          await ClientIntake
            .getClientIntakesByStatus(
              status
            );
      } else {
        intakes =
          await ClientIntake
            .getAllClientIntakes();
      }

      return response.json({
        intakes:
          intakes
      });
    } catch (error) {
      return sendIntakeError(
        response,
        error,
        "Client intakes could not be loaded."
      );
    }
  }
);

// ============================================================
// ADMIN: GET CLIENT INTAKE SUMMARY
//
// GET /client-intakes/admin/summary
// ============================================================

router.get(
  "/admin/summary",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const total =
        await ClientIntake
          .countClientIntakes();

      const statuses =
        await ClientIntake
          .countClientIntakesByStatus();

      return response.json({
        summary: {
          total:
            total,

          statuses:
            statuses
        }
      });
    } catch (error) {
      return sendIntakeError(
        response,
        error,
        "Client intake totals could not be loaded."
      );
    }
  }
);

// ============================================================
// ADMIN: SEARCH CLIENT INTAKES
//
// GET /client-intakes/admin/search?q=TEXT
// ============================================================

router.get(
  "/admin/search",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const search =
        cleanText(
          request.query.q,
          250
        );

      const intakes =
        await ClientIntake
          .searchClientIntakes(
            search
          );

      return response.json({
        intakes:
          intakes
      });
    } catch (error) {
      return sendIntakeError(
        response,
        error,
        "Client intakes could not be searched."
      );
    }
  }
);

// ============================================================
// ADMIN: GET CLIENT INTAKES BY STATUS
//
// GET /client-intakes/admin/status/:status
// ============================================================

router.get(
  "/admin/status/:status",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const status =
        cleanText(
          request.params.status,
          30
        );

      if (
        !ClientIntake
          .ALLOWED_STATUSES
          .includes(status)
      ) {
        return response
          .status(400)
          .json({
            error:
              "The selected client intake status is invalid."
          });
      }

      const intakes =
        await ClientIntake
          .getClientIntakesByStatus(
            status
          );

      return response.json({
        intakes:
          intakes
      });
    } catch (error) {
      return sendIntakeError(
        response,
        error,
        "Client intakes could not be loaded."
      );
    }
  }
);

// ============================================================
// ADMIN: GET CLIENT INTAKE BY ID
//
// GET /client-intakes/:id
// ============================================================

router.get(
  "/:id",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const intake =
        await ClientIntake
          .getClientIntakeById(
            request.params.id
          );

      if (!intake) {
        return response
          .status(404)
          .json({
            error:
              "Client intake not found."
          });
      }

      return response.json({
        intake:
          intake
      });
    } catch (error) {
      return sendIntakeError(
        response,
        error,
        "The client intake could not be loaded."
      );
    }
  }
);

// ============================================================
// ADMIN: UPDATE CLIENT INTAKE STATUS
//
// PATCH /client-intakes/:id/status
//
// Body:
// {
//   "status": "contacted"
// }
// ============================================================

router.patch(
  "/:id/status",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const status =
        cleanText(
          request.body.status,
          30
        )
          .toLowerCase()
          .replace(
            /[ -]+/g,
            "_"
          );

      if (!status) {
        return response
          .status(400)
          .json({
            error:
              "Client intake status is required."
          });
      }

      if (
        !ClientIntake
          .ALLOWED_STATUSES
          .includes(status)
      ) {
        return response
          .status(400)
          .json({
            error:
              "The selected client intake status is invalid."
          });
      }

      const intake =
        await ClientIntake
          .updateClientIntakeStatus(
            request.params.id,
            status
          );

      if (!intake) {
        return response
          .status(404)
          .json({
            error:
              "Client intake not found."
          });
      }

      return response.json({
        message:
          "Client intake status updated successfully.",

        intake:
          intake
      });
    } catch (error) {
      return sendIntakeError(
        response,
        error,
        "The client intake status could not be updated."
      );
    }
  }
);

// ============================================================
// ADMIN: UPDATE COMPLETE CLIENT INTAKE
//
// PUT /client-intakes/:id
// ============================================================

router.put(
  "/:id",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      if (
        request.body.status !==
          undefined
      ) {
        const requestedStatus =
          cleanText(
            request.body.status,
            30
          )
            .toLowerCase()
            .replace(
              /[ -]+/g,
              "_"
            );

        if (
          !ClientIntake
            .ALLOWED_STATUSES
            .includes(
              requestedStatus
            )
        ) {
          return response
            .status(400)
            .json({
              error:
                "The selected client intake status is invalid."
            });
        }

        request.body.status =
          requestedStatus;
      }

      const intake =
        await ClientIntake
          .updateClientIntake(
            request.params.id,
            request.body
          );

      if (!intake) {
        return response
          .status(404)
          .json({
            error:
              "Client intake not found."
          });
      }

      return response.json({
        message:
          "Client intake updated successfully.",

        intake:
          intake
      });
    } catch (error) {
      return sendIntakeError(
        response,
        error,
        "The client intake could not be updated."
      );
    }
  }
);

// ============================================================
// ADMIN: DELETE CLIENT INTAKE
//
// DELETE /client-intakes/:id
// ============================================================

router.delete(
  "/:id",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const intake =
        await ClientIntake
          .deleteClientIntake(
            request.params.id
          );

      if (!intake) {
        return response
          .status(404)
          .json({
            error:
              "Client intake not found."
          });
      }

      if (
        intake.imagePublicId
      ) {
        await deleteCloudinaryImage(
          intake.imagePublicId
        );
      }

      return response.json({
        message:
          "Client intake deleted successfully.",

        intake:
          intake
      });
    } catch (error) {
      return sendIntakeError(
        response,
        error,
        "The client intake could not be deleted."
      );
    }
  }
);

// ============================================================
// EXPORT CLIENT INTAKE ROUTER
// ============================================================

module.exports = router;