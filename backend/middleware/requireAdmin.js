// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: middleware/requireAdmin.js
// JWT ADMINISTRATOR AUTHENTICATION
// NEON POSTGRESQL
// ============================================================

"use strict";


const jwt =
  require("jsonwebtoken");


const Admin =
  require("../models/Admin");


// ============================================================
// AUTHENTICATION SETTINGS
// ============================================================

const JWT_ALGORITHM =
  "HS256";


const JWT_ISSUER =
  process.env.JWT_ISSUER ||
  "multi-maniacs-customs";


const JWT_AUDIENCE =
  process.env.JWT_AUDIENCE ||
  "multi-maniacs-customs-admin";


// ============================================================
// GET JWT SECRET
// ============================================================

function getJwtSecret() {

  const jwtSecret =
    process.env.JWT_SECRET;


  if (!jwtSecret) {

    const error =
      new Error(
        "JWT_SECRET is not configured on the server."
      );


    error.statusCode =
      500;


    error.code =
      "JWT_SECRET_MISSING";


    throw error;
  }


  if (

    process.env.NODE_ENV ===
      "production" &&

    jwtSecret.length < 32

  ) {

    const error =
      new Error(
        "JWT_SECRET must contain at least 32 characters in production."
      );


    error.statusCode =
      500;


    error.code =
      "JWT_SECRET_TOO_SHORT";


    throw error;
  }


  return jwtSecret;
}


// ============================================================
// READ BEARER TOKEN
// ============================================================

function getBearerToken(
  request
) {

  const authorizationHeader =
    request.headers.authorization;


  if (

    !authorizationHeader ||

    typeof authorizationHeader !==
      "string"

  ) {

    return "";
  }


  const authorizationParts =
    authorizationHeader
      .trim()
      .split(/\s+/);


  if (

    authorizationParts.length !==
      2 ||

    authorizationParts[0]
      .toLowerCase() !==
      "bearer"

  ) {

    return "";
  }


  return authorizationParts[1];
}


// ============================================================
// GET ADMINISTRATOR ID FROM TOKEN
// ============================================================

function getAdminIdFromToken(
  decodedToken
) {

  if (

    !decodedToken ||

    typeof decodedToken !==
      "object"

  ) {

    return "";
  }


  return String(

    decodedToken.adminId ||

    decodedToken.id ||

    decodedToken.sub ||

    ""

  ).trim();
}


// ============================================================
// VERIFY JWT
// ============================================================

function verifyAdminToken(
  token
) {

  return jwt.verify(

    token,

    getJwtSecret(),

    {

      algorithms: [

        JWT_ALGORITHM

      ],

      issuer:
        JWT_ISSUER,

      audience:
        JWT_AUDIENCE

    }

  );
}
// ============================================================
// SEND AUTHENTICATION ERROR
// ============================================================

function sendAuthenticationError(
  response,
  statusCode,
  message,
  errorCode
) {

  return response
    .status(statusCode)
    .json({

      error:
        message,


      code:
        errorCode

    });
}


// ============================================================
// REQUIRE AUTHENTICATED ADMINISTRATOR
// ============================================================

async function requireAdmin(
  request,
  response,
  next
) {

  try {

    const token =
      getBearerToken(
        request
      );


    if (!token) {

      return sendAuthenticationError(

        response,

        401,

        "Administrator authentication is required.",

        "ADMIN_TOKEN_REQUIRED"

      );
    }


    let decodedToken;


    try {

      decodedToken =
        verifyAdminToken(
          token
        );


    } catch (error) {


      if (

        error.name ===
        "TokenExpiredError"

      ) {

        return sendAuthenticationError(

          response,

          401,

          "The administrator session expired. Please log in again.",

          "ADMIN_TOKEN_EXPIRED"

        );
      }



      if (

        error.name ===
        "NotBeforeError"

      ) {

        return sendAuthenticationError(

          response,

          401,

          "The administrator session is not active yet.",

          "ADMIN_TOKEN_NOT_ACTIVE"

        );
      }



      if (

        error.name ===
        "JsonWebTokenError"

      ) {

        return sendAuthenticationError(

          response,

          401,

          "The administrator session is invalid. Please log in again.",

          "ADMIN_TOKEN_INVALID"

        );
      }


      throw error;
    }


    const adminId =
      getAdminIdFromToken(
        decodedToken
      );


    if (!adminId) {

      return sendAuthenticationError(

        response,

        401,

        "The administrator session does not contain a valid account ID.",

        "ADMIN_ID_MISSING"

      );
    }


    const admin =
      await Admin.getAdminById(

        adminId,

        false

      );


    if (!admin) {

      return sendAuthenticationError(

        response,

        401,

        "The administrator account could not be found.",

        "ADMIN_NOT_FOUND"

      );
    }


    if (!admin.active) {

      return sendAuthenticationError(

        response,

        403,

        "This administrator account is inactive.",

        "ADMIN_ACCOUNT_INACTIVE"

      );
    }


    /*
     * The administrator is loaded from Neon rather than trusted
     * entirely from the JWT. This ensures role or account-status
     * changes take effect without waiting for the token to expire.
     */


    request.admin =
      admin;


    request.adminToken =
      token;


    request.adminTokenPayload =
      decodedToken;


    request.adminId =
      admin.id;


    return next();


  } catch (error) {


    console.error(

      "Administrator authentication error:",

      error

    );


    if (

      error.code ===
        "JWT_SECRET_MISSING" ||

      error.code ===
        "JWT_SECRET_TOO_SHORT"

    ) {

      return sendAuthenticationError(

        response,

        500,

        "Administrator authentication is not configured correctly.",

        error.code

      );
    }


    return sendAuthenticationError(

      response,

      500,

      "The administrator session could not be verified.",

      "ADMIN_AUTHENTICATION_FAILED"

    );
  }
}
// ============================================================
// EXPORT MIDDLEWARE AND HELPERS
// ============================================================
//
// IMPORTANT:
// The default export MUST remain the middleware function itself.
//
// This allows:
// const requireAdmin = require("../middleware/requireAdmin");
//
// to return:
// function requireAdmin(request, response, next)
//
// instead of:
// { requireAdmin: function... }
//
// Express requires middleware functions, not objects.
// ============================================================


module.exports =
  requireAdmin;


module.exports.requireAdmin =
  requireAdmin;


module.exports.getBearerToken =
  getBearerToken;


module.exports.verifyAdminToken =
  verifyAdminToken;


module.exports.getAdminIdFromToken =
  getAdminIdFromToken;


module.exports.JWT_ALGORITHM =
  JWT_ALGORITHM;


module.exports.JWT_ISSUER =
  JWT_ISSUER;


module.exports.JWT_AUDIENCE =
  JWT_AUDIENCE;