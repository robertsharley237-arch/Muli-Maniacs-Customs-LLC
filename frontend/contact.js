// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// CONTACT FORM
//
// Hosting: Vercel
// Database: Neon PostgreSQL
// ============================================================

(() => {
  "use strict";

  const CONTACT_BACKEND_URL =
    window.MMC_BACKEND_URL ||
    window.location.origin;

  const CONTACT_SUBMIT_API =
    `${CONTACT_BACKEND_URL}/contact/submit`;

  // ==========================================================
  // ELEMENT HELPERS
  // ==========================================================

  function getContactElement(elementId) {
    return document.getElementById(
      elementId
    );
  }

  function getContactValue(elementId) {
    const element =
      getContactElement(elementId);

    if (!element) {
      return "";
    }

    return String(
      element.value || ""
    ).trim();
  }

  // ==========================================================
  // MESSAGE DISPLAY
  // ==========================================================

  function showContactMessage(
    message,
    messageType = "status"
  ) {
    const messageElement =
      getContactElement(
        "contact-message"
      );

    if (!messageElement) {
      if (messageType === "error") {
        alert(message);
      }

      return;
    }

    messageElement.textContent =
      message;

    messageElement.classList.remove(
      "contact-error",
      "contact-success",
      "contact-status"
    );

    if (messageType === "error") {
      messageElement.classList.add(
        "contact-error"
      );
    } else if (
      messageType === "success"
    ) {
      messageElement.classList.add(
        "contact-success"
      );
    } else {
      messageElement.classList.add(
        "contact-status"
      );
    }
  }

  function clearContactMessage() {
    const messageElement =
      getContactElement(
        "contact-message"
      );

    if (!messageElement) {
      return;
    }

    messageElement.textContent = "";

    messageElement.classList.remove(
      "contact-error",
      "contact-success",
      "contact-status"
    );
  }

  // ==========================================================
  // SUBMIT BUTTON STATUS
  // ==========================================================

  function setContactButtonLoading(
    isLoading
  ) {
    const submitButton =
      getContactElement(
        "contact-submit-button"
      );

    if (!submitButton) {
      return;
    }

    submitButton.disabled =
      isLoading;

    submitButton.textContent =
      isLoading
        ? "Sending Message..."
        : "Send Message";
  }

  // ==========================================================
  // EMAIL VALIDATION
  // ==========================================================

  function isValidContactEmail(email) {
    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(email);
  }

  // ==========================================================
  // PHONE VALIDATION
  // ==========================================================

  function isValidContactPhone(phone) {
    if (!phone) {
      return true;
    }

    const digitsOnly =
      phone.replace(/\D/g, "");

    return digitsOnly.length >= 10;
  }

  // ==========================================================
  // FORM VALIDATION
  // ==========================================================

  function validateContactForm() {
    const name =
      getContactValue(
        "contact-name"
      );

    const email =
      getContactValue(
        "contact-email"
      );

    const phone =
      getContactValue(
        "contact-phone"
      );

    const subject =
      getContactValue(
        "contact-subject"
      );

    const details =
      getContactValue(
        "contact-details"
      );

    if (name.length < 2) {
      return (
        "Please enter your full name."
      );
    }

    if (!email) {
      return (
        "Please enter your email address."
      );
    }

    if (
      !isValidContactEmail(email)
    ) {
      return (
        "Please enter a valid email address."
      );
    }

    if (
      phone &&
      !isValidContactPhone(phone)
    ) {
      return (
        "Please enter a valid phone number with at least 10 digits."
      );
    }

    if (!subject) {
      return (
        "Please select a message subject."
      );
    }

    if (details.length < 10) {
      return (
        "Please enter at least 10 characters in your message."
      );
    }

    if (details.length > 5000) {
      return (
        "Your message cannot exceed 5,000 characters."
      );
    }

    return "";
  }

  // ==========================================================
  // BUILD CONTACT REQUEST
  // ==========================================================

  function buildContactRequest() {
    return {
      name:
        getContactValue(
          "contact-name"
        ),

      email:
        getContactValue(
          "contact-email"
        ),

      phone:
        getContactValue(
          "contact-phone"
        ),

      subject:
        getContactValue(
          "contact-subject"
        ),

      details:
        getContactValue(
          "contact-details"
        )
    };
  }

  // ==========================================================
  // READ SERVER RESPONSE
  // ==========================================================

  async function readContactResponse(
    response
  ) {
    let data;

    try {
      data =
        await response.json();
    } catch (error) {
      data = {
        error:
          "The server returned an unexpected response."
      };
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        `Request failed with status ${response.status}.`
      );
    }

    return data;
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

    clearContactMessage();

    const validationError =
      validateContactForm();

    if (validationError) {
      showContactMessage(
        validationError,
        "error"
      );

      return;
    }

    try {
      setContactButtonLoading(true);

      showContactMessage(
        "Sending your message...",
        "status"
      );

      const response = await fetch(
        CONTACT_SUBMIT_API,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify(
            buildContactRequest()
          )
        }
      );

      const data =
        await readContactResponse(
          response
        );

      showContactMessage(
        data.message ||
        (
          "Your message was sent successfully. " +
          "Multi-Maniacs Customs will respond as soon as possible."
        ),
        "success"
      );

      resetContactForm();
    } catch (error) {
      console.error(
        "Contact form submission failed:",
        error
      );

      showContactMessage(
        error.message ||
        (
          "Your message could not be sent. " +
          "Please try again or contact us directly."
        ),
        "error"
      );
    } finally {
      setContactButtonLoading(false);
    }
  }

  // ==========================================================
  // RESET CONTACT FORM
  // ==========================================================

  function resetContactForm() {
    const contactForm =
      getContactElement(
        "contact-form"
      );

    if (contactForm) {
      contactForm.reset();
    }
  }

  // ==========================================================
  // PREVENT RAPID DUPLICATE SUBMISSIONS
  // ==========================================================

  let lastContactSubmissionTime = 0;

  function canSubmitContactForm() {
    const currentTime =
      Date.now();

    const minimumDelay =
      3000;

    if (
      currentTime -
      lastContactSubmissionTime <
      minimumDelay
    ) {
      return false;
    }

    lastContactSubmissionTime =
      currentTime;

    return true;
  }

  async function safelySubmitContactForm(
    event
  ) {
    if (event) {
      event.preventDefault();
    }

    if (!canSubmitContactForm()) {
      showContactMessage(
        "Please wait a few seconds before submitting again.",
        "error"
      );

      return;
    }

    await submitContactForm();
  }

  // ==========================================================
  // PAGE STARTUP
  // ==========================================================

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      const contactForm =
        getContactElement(
          "contact-form"
        );

      if (contactForm) {
        contactForm.addEventListener(
          "submit",
          safelySubmitContactForm
        );
      }
    }
  );

  // ==========================================================
  // OPTIONAL INLINE HTML SUPPORT
  // ==========================================================

  window.submitContactForm =
    safelySubmitContactForm;

  window.resetContactForm =
    resetContactForm;
})();