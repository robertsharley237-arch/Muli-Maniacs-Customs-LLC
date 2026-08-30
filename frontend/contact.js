// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: contact.js
// CONTACT FORM
//
// Frontend: Vercel
// Backend: Express on Vercel
// Database: Neon PostgreSQL
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  var REQUEST_TIMEOUT_MILLISECONDS =
    15000;

  var MINIMUM_SUBMISSION_DELAY =
    3000;

  var lastSubmissionTime =
    0;

  var submissionInProgress =
    false;

  // ==========================================================
  // ELEMENT HELPERS
  // ==========================================================

  function getElement(
    elementId
  ) {
    return document.getElementById(
      elementId
    );
  }

  function getValue(
    elementId
  ) {
    var element =
      getElement(
        elementId
      );

    if (!element) {
      return "";
    }

    return String(
      element.value ||
      ""
    ).trim();
  }

  // ==========================================================
  // BACKEND URL
  // ==========================================================

  function removeTrailingSlashes(
    value
  ) {
    return String(value || "")
      .trim()
      .replace(
        /\/+$/,
        ""
      );
  }

  function getBackendUrl() {
    if (
      typeof window.MMC_BACKEND_URL ===
        "string" &&
      window.MMC_BACKEND_URL.trim()
    ) {
      return removeTrailingSlashes(
        window.MMC_BACKEND_URL
      );
    }

    if (
      window.location.hostname ===
        "localhost" ||
      window.location.hostname ===
        "127.0.0.1"
    ) {
      return "http://localhost:10000";
    }

    return removeTrailingSlashes(
      window.location.origin
    );
  }

  var CONTACT_SUBMIT_URL =
    getBackendUrl() +
    "/contact/submit";

  // ==========================================================
  // MESSAGE NORMALIZATION
  // ==========================================================

  function normalizeMessage(
    value,
    fallbackMessage
  ) {
    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value.trim();
    }

    if (
      value &&
      typeof value ===
        "object"
    ) {
      if (
        typeof value.message ===
          "string" &&
        value.message.trim()
      ) {
        return value.message.trim();
      }

      if (
        value.error !==
        undefined
      ) {
        return normalizeMessage(
          value.error,
          fallbackMessage
        );
      }

      if (
        value.errors !==
        undefined
      ) {
        return normalizeMessage(
          value.errors,
          fallbackMessage
        );
      }
    }

    return fallbackMessage;
  }

  // ==========================================================
  // MESSAGE DISPLAY
  // ==========================================================

  function showContactMessage(
    message,
    messageType
  ) {
    var messageElement =
      getElement(
        "contact-message"
      );

    var normalizedMessage =
      String(message || "");

    if (!messageElement) {
      if (
        messageType ===
          "error" &&
        normalizedMessage
      ) {
        console.error(
          normalizedMessage
        );
      }

      return;
    }

    messageElement.textContent =
      normalizedMessage;

    messageElement.classList.remove(
      "contact-error",
      "contact-success",
      "contact-status"
    );

    messageElement.removeAttribute(
      "role"
    );

    if (!normalizedMessage) {
      return;
    }

    if (
      messageType ===
      "success"
    ) {
      messageElement.classList.add(
        "contact-success"
      );

      messageElement.setAttribute(
        "role",
        "status"
      );
    } else if (
      messageType ===
      "status"
    ) {
      messageElement.classList.add(
        "contact-status"
      );

      messageElement.setAttribute(
        "role",
        "status"
      );
    } else {
      messageElement.classList.add(
        "contact-error"
      );

      messageElement.setAttribute(
        "role",
        "alert"
      );
    }
  }

  function clearContactMessage() {
    showContactMessage(
      "",
      "status"
    );
  }

  // ==========================================================
  // SUBMIT BUTTON STATE
  // ==========================================================

  function setContactButtonLoading(
    isLoading
  ) {
    var submitButton =
      getElement(
        "contact-submit-button"
      );

    if (!submitButton) {
      return;
    }

    if (
      !submitButton.dataset
        .originalText
    ) {
      submitButton.dataset.originalText =
        submitButton.textContent
          .trim() ||
        "Send Message";
    }

    submitButton.disabled =
      Boolean(
        isLoading
      );

    submitButton.setAttribute(
      "aria-disabled",
      isLoading
        ? "true"
        : "false"
    );

    submitButton.setAttribute(
      "aria-busy",
      isLoading
        ? "true"
        : "false"
    );

    submitButton.textContent =
      isLoading
        ? "Sending Message..."
        : submitButton.dataset
            .originalText;
  }

  // ==========================================================
  // EMAIL VALIDATION
  // ==========================================================

  function isValidContactEmail(
    email
  ) {
    var emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(
      email
    );
  }

  // ==========================================================
  // PHONE VALIDATION
  // ==========================================================

  function isValidContactPhone(
    phone
  ) {
    if (!phone) {
      return true;
    }

    var digitsOnly =
      phone.replace(
        /\D/g,
        ""
      );

    return (
      digitsOnly.length >=
      10
    );
  }

  // ==========================================================
  // FORM VALIDATION
  // ==========================================================

  function validateContactForm() {
    var name =
      getValue(
        "contact-name"
      );

    var email =
      getValue(
        "contact-email"
      );

    var phone =
      getValue(
        "contact-phone"
      );

    var subject =
      getValue(
        "contact-subject"
      );

    var details =
      getValue(
        "contact-details"
      );

    if (
      name.length < 2
    ) {
      return "Please enter your full name.";
    }

    if (!email) {
      return "Please enter your email address.";
    }

    if (
      !isValidContactEmail(
        email
      )
    ) {
      return "Please enter a valid email address.";
    }

    if (
      !isValidContactPhone(
        phone
      )
    ) {
      return (
        "Please enter a valid phone number " +
        "with at least 10 digits."
      );
    }

    if (!subject) {
      return "Please select a message subject.";
    }

    if (
      details.length < 10
    ) {
      return (
        "Please enter at least 10 characters " +
        "in your message."
      );
    }

    if (
      details.length > 5000
    ) {
      return "Your message cannot exceed 5,000 characters.";
    }

    return "";
  }

  // ==========================================================
  // BUILD CONTACT REQUEST
  // ==========================================================

  function buildContactRequest() {
    return {
      name:
        getValue(
          "contact-name"
        ),

      email:
        getValue(
          "contact-email"
        ),

      phone:
        getValue(
          "contact-phone"
        ),

      subject:
        getValue(
          "contact-subject"
        ),

      details:
        getValue(
          "contact-details"
        )
    };
  }

  // ==========================================================
  // FETCH WITH TIMEOUT
  // ==========================================================

  async function fetchWithTimeout(
    url,
    options
  ) {
    var controller =
      new AbortController();

    var timeoutIdentifier =
      window.setTimeout(
        function () {
          controller.abort();
        },
        REQUEST_TIMEOUT_MILLISECONDS
      );

    try {
      return await fetch(
        url,
        Object.assign(
          {},
          options || {},
          {
            signal:
              controller.signal
          }
        )
      );
    } finally {
      window.clearTimeout(
        timeoutIdentifier
      );
    }
  }

  // ==========================================================
  // READ SERVER RESPONSE
  // ==========================================================

  async function readContactResponse(
    response
  ) {
    var responseText =
      "";

    try {
      responseText =
        await response.text();
    } catch (error) {
      return {
        error:
          "The server response could not be read."
      };
    }

    if (!responseText) {
      return {};
    }

    try {
      return JSON.parse(
        responseText
      );
    } catch (error) {
      return {
        error:
          responseText
      };
    }
  }

  // ==========================================================
  // RESET CONTACT FORM
  // ==========================================================

  function resetContactForm() {
    var contactForm =
      getElement(
        "contact-form"
      );

    if (contactForm) {
      contactForm.reset();
    }
  }

  // ==========================================================
  // SUBMIT CONTACT FORM
  // ==========================================================

  async function submitContactForm(
    event
  ) {
    if (event) {
      event.preventDefault();
    }

    if (submissionInProgress) {
      return;
    }

    clearContactMessage();

    var validationError =
      validateContactForm();

    if (validationError) {
      showContactMessage(
        validationError,
        "error"
      );

      return;
    }

    var currentTime =
      Date.now();

    if (
      currentTime -
      lastSubmissionTime <
      MINIMUM_SUBMISSION_DELAY
    ) {
      showContactMessage(
        "Please wait a few seconds before submitting again.",
        "error"
      );

      return;
    }

    submissionInProgress =
      true;

    lastSubmissionTime =
      currentTime;

    setContactButtonLoading(
      true
    );

    showContactMessage(
      "Sending your message...",
      "status"
    );

    try {
      var response =
        await fetchWithTimeout(
          CONTACT_SUBMIT_URL,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json"
            },

            body:
              JSON.stringify(
                buildContactRequest()
              )
          }
        );

      var responseData =
        await readContactResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          normalizeMessage(
            responseData.error ||
            responseData.message ||
            responseData,
            "Your message could not be sent."
          )
        );
      }

      resetContactForm();

      showContactMessage(
        normalizeMessage(
          responseData.message,
          (
            "Your message was sent successfully. " +
            "Multi-Maniacs Customs will respond " +
            "as soon as possible."
          )
        ),
        "success"
      );
    } catch (error) {
      console.error(
        "Contact form submission failed.",
        error
      );

      var errorMessage;

      if (
        error &&
        error.name ===
          "AbortError"
      ) {
        errorMessage =
          "The request took too long. Please try again.";
      } else if (
        error instanceof
        TypeError
      ) {
        errorMessage =
          "The contact server could not be reached. " +
          "Check the backend URL and try again.";
      } else {
        errorMessage =
          normalizeMessage(
            error,
            (
              "Your message could not be sent. " +
              "Please try again or contact MMC directly."
            )
          );
      }

      showContactMessage(
        errorMessage,
        "error"
      );
    } finally {
      submissionInProgress =
        false;

      setContactButtonLoading(
        false
      );
    }
  }

  // ==========================================================
  // PAGE INITIALIZATION
  // ==========================================================

  function initializeContactForm() {
    var contactForm =
      getElement(
        "contact-form"
      );

    if (!contactForm) {
      console.error(
        "The contact form could not be found."
      );

      return;
    }

    contactForm.addEventListener(
      "submit",
      submitContactForm
    );

    console.log(
      "MMC contact form initialized."
    );
  }

  // ==========================================================
  // STARTUP
  // ==========================================================

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeContactForm
    );
  } else {
    initializeContactForm();
  }

  // ==========================================================
  // GLOBAL SUPPORT
  // ==========================================================

  window.submitContactForm =
    submitContactForm;

  window.resetContactForm =
    resetContactForm;
}());