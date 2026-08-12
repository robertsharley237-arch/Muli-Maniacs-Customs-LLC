// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// CLIENT INTAKE FORM
//
// Hosting: Vercel
// Database: Neon PostgreSQL
// Uploads: Multer + Cloudinary
// ============================================================

(() => {
  "use strict";

  const CLIENT_INTAKE_BACKEND_URL =
    window.MMC_BACKEND_URL ||
    window.location.origin;

  const CLIENT_INTAKE_API =
    `${CLIENT_INTAKE_BACKEND_URL}/intake/submit`;

  const CLIENT_INTAKE_MAX_IMAGE_SIZE =
    10 * 1024 * 1024;

  const CLIENT_INTAKE_ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
  ];

  let clientIntakePreviewUrl = null;

  // ==========================================================
  // ELEMENT HELPERS
  // ==========================================================

  function getIntakeElement(elementId) {
    return document.getElementById(
      elementId
    );
  }

  function getIntakeValue(elementId) {
    const element =
      getIntakeElement(elementId);

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

  function showIntakeMessage(
    message,
    messageType = "information"
  ) {
    const messageElement =
      getIntakeElement(
        "intake-message"
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
      "intake-error",
      "intake-success",
      "intake-information"
    );

    if (messageType === "error") {
      messageElement.classList.add(
        "intake-error"
      );
    } else if (
      messageType === "success"
    ) {
      messageElement.classList.add(
        "intake-success"
      );
    } else {
      messageElement.classList.add(
        "intake-information"
      );
    }
  }

  function clearIntakeMessage() {
    const messageElement =
      getIntakeElement(
        "intake-message"
      );

    if (!messageElement) {
      return;
    }

    messageElement.textContent = "";

    messageElement.classList.remove(
      "intake-error",
      "intake-success",
      "intake-information"
    );
  }

  // ==========================================================
  // SUBMIT BUTTON
  // ==========================================================

  function setIntakeSubmitLoading(
    isLoading
  ) {
    const submitButton =
      getIntakeElement(
        "submit-intake-button"
      );

    if (!submitButton) {
      return;
    }

    submitButton.disabled =
      isLoading;

    submitButton.textContent =
      isLoading
        ? "Submitting Request..."
        : "Submit Project Request";
  }

  // ==========================================================
  // IMAGE HELPERS
  // ==========================================================

  function getIntakeImage() {
    const imageInput =
      getIntakeElement(
        "reference-image"
      );

    if (
      !imageInput ||
      !imageInput.files ||
      imageInput.files.length === 0
    ) {
      return null;
    }

    return imageInput.files[0];
  }

  function validateIntakeImage(file) {
    if (!file) {
      return "";
    }

    if (
      !CLIENT_INTAKE_ALLOWED_IMAGE_TYPES.includes(
        file.type
      )
    ) {
      return (
        "Please upload a JPG, PNG, " +
        "WEBP, or GIF image."
      );
    }

    if (
      file.size >
      CLIENT_INTAKE_MAX_IMAGE_SIZE
    ) {
      return (
        "The reference image must be " +
        "10 MB or smaller."
      );
    }

    return "";
  }

  function revokeIntakePreviewUrl() {
    if (!clientIntakePreviewUrl) {
      return;
    }

    URL.revokeObjectURL(
      clientIntakePreviewUrl
    );

    clientIntakePreviewUrl = null;
  }

  function clearIntakeImagePreview() {
    const previewContainer =
      getIntakeElement(
        "reference-image-preview-container"
      );

    const previewImage =
      getIntakeElement(
        "reference-image-preview"
      );

    revokeIntakePreviewUrl();

    if (previewContainer) {
      previewContainer.hidden = true;
    }

    if (previewImage) {
      previewImage.removeAttribute(
        "src"
      );

      previewImage.alt =
        "Selected project reference preview";
    }
  }

  function updateIntakeImagePreview() {
    clearIntakeMessage();

    const imageFile =
      getIntakeImage();

    if (!imageFile) {
      clearIntakeImagePreview();
      return;
    }

    const imageError =
      validateIntakeImage(
        imageFile
      );

    if (imageError) {
      const imageInput =
        getIntakeElement(
          "reference-image"
        );

      if (imageInput) {
        imageInput.value = "";
      }

      clearIntakeImagePreview();

      showIntakeMessage(
        imageError,
        "error"
      );

      return;
    }

    const previewContainer =
      getIntakeElement(
        "reference-image-preview-container"
      );

    const previewImage =
      getIntakeElement(
        "reference-image-preview"
      );

    if (
      !previewContainer ||
      !previewImage
    ) {
      return;
    }

    revokeIntakePreviewUrl();

    clientIntakePreviewUrl =
      URL.createObjectURL(
        imageFile
      );

    previewImage.src =
      clientIntakePreviewUrl;

    previewImage.alt =
      `Reference preview: ${imageFile.name}`;

    previewContainer.hidden = false;

    previewImage.onerror = () => {
      clearIntakeImagePreview();

      showIntakeMessage(
        "The selected image could not be previewed.",
        "error"
      );
    };
  }

  // ==========================================================
  // CONTACT METHOD
  // ==========================================================

  function updateIntakeContactRequirements() {
    const contactMethod =
      getIntakeValue(
        "contact-method"
      );

    const phoneInput =
      getIntakeElement(
        "client-phone"
      );

    const emailInput =
      getIntakeElement(
        "client-email"
      );

    if (phoneInput) {
      phoneInput.required =
        contactMethod === "Phone" ||
        contactMethod === "Text";
    }

    if (emailInput) {
      emailInput.required =
        contactMethod === "Email";
    }
  }

  // ==========================================================
  // VALIDATION
  // ==========================================================

  function isValidIntakeEmail(email) {
    if (!email) {
      return true;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(
      email
    );
  }

  function validateClientIntake() {
    const name =
      getIntakeValue(
        "client-name"
      );

    const phone =
      getIntakeValue(
        "client-phone"
      );

    const email =
      getIntakeValue(
        "client-email"
      );

    const contactMethod =
      getIntakeValue(
        "contact-method"
      );

    const projectType =
      getIntakeValue(
        "project-type"
      );

    const description =
      getIntakeValue(
        "project-description"
      );

    const confirmation =
      getIntakeElement(
        "intake-confirmation"
      );

    const imageFile =
      getIntakeImage();

    if (name.length < 2) {
      return (
        "Please enter your full name."
      );
    }

    if (!contactMethod) {
      return (
        "Please select your preferred " +
        "contact method."
      );
    }

    if (
      contactMethod === "Email" &&
      !email
    ) {
      return (
        "Please enter an email address " +
        "for email contact."
      );
    }

    if (
      (
        contactMethod === "Phone" ||
        contactMethod === "Text"
      ) &&
      !phone
    ) {
      return (
        "Please enter a phone number " +
        "for phone or text contact."
      );
    }

    if (!isValidIntakeEmail(email)) {
      return (
        "Please enter a valid email address."
      );
    }

    if (projectType.length < 2) {
      return (
        "Please enter the type of " +
        "custom project you need."
      );
    }

    if (description.length < 10) {
      return (
        "Please provide at least 10 " +
        "characters describing your project."
      );
    }

    if (
      !confirmation ||
      !confirmation.checked
    ) {
      return (
        "Please confirm that the provided " +
        "information is accurate."
      );
    }

    const imageError =
      validateIntakeImage(
        imageFile
      );

    if (imageError) {
      return imageError;
    }

    return "";
  }

  // ==========================================================
  // CREATE FORM DATA
  // ==========================================================

  function buildClientIntakeFormData() {
    const formData =
      new FormData();

    const imageFile =
      getIntakeImage();

    formData.append(
      "name",
      getIntakeValue(
        "client-name"
      )
    );

    formData.append(
      "phone",
      getIntakeValue(
        "client-phone"
      )
    );

    formData.append(
      "email",
      getIntakeValue(
        "client-email"
      )
    );

    formData.append(
      "contactMethod",
      getIntakeValue(
        "contact-method"
      )
    );

    formData.append(
      "projectType",
      getIntakeValue(
        "project-type"
      )
    );

    formData.append(
      "description",
      getIntakeValue(
        "project-description"
      )
    );

    formData.append(
      "budget",
      getIntakeValue(
        "project-budget"
      )
    );

    formData.append(
      "timeline",
      getIntakeValue(
        "project-timeline"
      )
    );

    formData.append(
      "location",
      getIntakeValue(
        "client-location"
      )
    );

    if (imageFile) {
      formData.append(
        "image",
        imageFile
      );
    }

    return formData;
  }

  // ==========================================================
  // SERVER RESPONSE
  // ==========================================================

  async function readClientIntakeResponse(
    response
  ) {
    let data;

    try {
      data =
        await response.json();
    } catch (error) {
      data = {
        error:
          "The server returned an " +
          "unexpected response."
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
  // SUBMIT FORM
  // ==========================================================

  async function submitClientIntake(
    event
  ) {
    if (event) {
      event.preventDefault();
    }

    clearIntakeMessage();

    const validationError =
      validateClientIntake();

    if (validationError) {
      showIntakeMessage(
        validationError,
        "error"
      );

      return;
    }

    try {
      setIntakeSubmitLoading(true);

      showIntakeMessage(
        "Submitting your project request...",
        "information"
      );

      const response = await fetch(
        CLIENT_INTAKE_API,
        {
          method: "POST",
          body:
            buildClientIntakeFormData()
        }
      );

      const data =
        await readClientIntakeResponse(
          response
        );

      showIntakeMessage(
        data.message ||
        (
          "Your project request was submitted " +
          "successfully. Multi-Maniacs Customs " +
          "will review the details and contact you."
        ),
        "success"
      );

      resetClientIntakeForm();
    } catch (error) {
      console.error(
        "Client intake submission failed:",
        error
      );

      showIntakeMessage(
        error.message ||
        (
          "Your project request could not " +
          "be submitted. Please try again."
        ),
        "error"
      );
    } finally {
      setIntakeSubmitLoading(false);
    }
  }

  // ==========================================================
  // RESET FORM
  // ==========================================================

  function resetClientIntakeForm() {
    const intakeForm =
      getIntakeElement(
        "client-intake-form"
      );

    if (intakeForm) {
      intakeForm.reset();
    }

    clearIntakeImagePreview();

    updateIntakeContactRequirements();
  }

  // ==========================================================
  // PAGE STARTUP
  // ==========================================================

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      const intakeForm =
        getIntakeElement(
          "client-intake-form"
        );

      const imageInput =
        getIntakeElement(
          "reference-image"
        );

      const contactMethod =
        getIntakeElement(
          "contact-method"
        );

      if (intakeForm) {
        intakeForm.addEventListener(
          "submit",
          submitClientIntake
        );
      }

      if (imageInput) {
        imageInput.addEventListener(
          "change",
          updateIntakeImagePreview
        );
      }

      if (contactMethod) {
        contactMethod.addEventListener(
          "change",
          updateIntakeContactRequirements
        );
      }

      updateIntakeContactRequirements();
    }
  );

  window.addEventListener(
    "beforeunload",
    revokeIntakePreviewUrl
  );

  // ==========================================================
  // OPTIONAL INLINE HTML SUPPORT
  // ==========================================================

  window.submitClientIntake =
    submitClientIntake;

  window.resetClientIntakeForm =
    resetClientIntakeForm;
})();