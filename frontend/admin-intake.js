// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// ADMIN CLIENT INTAKE MANAGEMENT
// ============================================================

(function () {// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: admin-intake.js
// ADMIN CLIENT INTAKE MANAGEMENT
//
// Hosting: Vercel
// Database: Neon PostgreSQL
// Authentication: JWT multi-admin system
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  var REQUEST_TIMEOUT_MS =
    15000;

  var adminIntakeRecords =
    [];

  var intakeRequestInProgress =
    false;

  // ==========================================================
  // ELEMENT HELPERS
  // ==========================================================

  function getIntakeElement(
    elementId
  ) {
    return document.getElementById(
      elementId
    );
  }

  function createElement(
    tagName,
    className,
    textContent
  ) {
    var element =
      document.createElement(
        tagName
      );

    if (className) {
      element.className =
        className;
    }

    if (
      textContent !== undefined &&
      textContent !== null
    ) {
      element.textContent =
        String(textContent);
    }

    return element;
  }

  function setText(
    elementId,
    value
  ) {
    var element =
      getIntakeElement(
        elementId
      );

    if (!element) {
      return;
    }

    element.textContent =
      value === undefined ||
      value === null
        ? ""
        : String(value);
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

  var BACKEND_URL =
    getBackendUrl();

  var ADMIN_INTAKE_API =
    BACKEND_URL +
    "/admin/intakes";

  var ADMIN_SESSION_API =
    BACKEND_URL +
    "/admin/me";

  // ==========================================================
  // ADMIN LOGIN HELPERS
  // ==========================================================

  function getAdminToken() {
    return String(
      localStorage.getItem(
        "adminToken"
      ) ||
      localStorage.getItem(
        "MMC_ADMIN_TOKEN"
      ) ||
      ""
    ).trim();
  }

  function getAdminHeaders(
    includeContentType
  ) {
    var headers = {
      Accept:
        "application/json",

      Authorization:
        "Bearer " +
        getAdminToken()
    };

    if (
      includeContentType !==
      false
    ) {
      headers["Content-Type"] =
        "application/json";
    }

    return headers;
  }

  function clearAdminSession() {
    localStorage.removeItem(
      "adminToken"
    );

    localStorage.removeItem(
      "MMC_ADMIN_TOKEN"
    );

    localStorage.removeItem(
      "adminUser"
    );
  }

  function redirectToAdminLogin() {
    clearAdminSession();

    window.location.replace(
      "admin-login.html?return=" +
      encodeURIComponent(
        "admin-intake.html"
      )
    );
  }

  function logoutAdmin() {
    redirectToAdminLogin();
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
        REQUEST_TIMEOUT_MS
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
  // SERVER RESPONSE
  // ==========================================================

  async function readResponse(
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

  function getErrorMessage(
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
        return getErrorMessage(
          value.error,
          fallbackMessage
        );
      }
    }

    return fallbackMessage;
  }

  function getRequestErrorMessage(
    error,
    fallbackMessage
  ) {
    if (
      error &&
      error.name ===
        "AbortError"
    ) {
      return (
        "The server request took too long. " +
        "Please try again."
      );
    }

    if (
      error instanceof
      TypeError
    ) {
      return (
        "The client intake server could not be reached. " +
        "Check the backend URL and try again."
      );
    }

    return getErrorMessage(
      error,
      fallbackMessage
    );
  }

  async function requestJson(
    url,
    options
  ) {
    var response =
      await fetchWithTimeout(
        url,
        options
      );

    var responseData =
      await readResponse(
        response
      );

    if (
      response.status ===
      401
    ) {
      redirectToAdminLogin();

      throw new Error(
        "Your administrator session expired."
      );
    }

    if (
      response.status ===
      403
    ) {
      throw new Error(
        getErrorMessage(
          responseData,
          "You do not have permission to manage client intake requests."
        )
      );
    }

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          responseData,
          (
            "The request failed with status " +
            response.status +
            "."
          )
        )
      );
    }

    return responseData;
  }

  // ==========================================================
  // ADMINISTRATOR INFORMATION
  // ==========================================================

  function formatAdminRole(
    role
  ) {
    return String(
      role ||
      "Administrator"
    )
      .replace(
        /_/g,
        " "
      )
      .replace(
        /\b\w/g,
        function (letter) {
          return letter.toUpperCase();
        }
      );
  }

  function displayAdminInformation(
    administrator
  ) {
    var username =
      String(
        administrator.username ||
        administrator.name ||
        administrator.email ||
        "Administrator"
      );

    var role =
      formatAdminRole(
        administrator.role
      );

    [
      "admin-username",
      "admin-header-username"
    ].forEach(
      function (elementId) {
        setText(
          elementId,
          username
        );
      }
    );

    [
      "admin-role",
      "admin-header-role"
    ].forEach(
      function (elementId) {
        setText(
          elementId,
          role
        );
      }
    );
  }

  // ==========================================================
  // VERIFY ADMIN SESSION
  // ==========================================================

  async function verifyAdminSession() {
    if (!getAdminToken()) {
      redirectToAdminLogin();

      return false;
    }

    try {
      var responseData =
        await requestJson(
          ADMIN_SESSION_API,
          {
            method:
              "GET",

            headers:
              getAdminHeaders(
                false
              )
          }
        );

      var administrator =
        responseData.admin ||
        responseData.user ||
        responseData;

      localStorage.setItem(
        "adminUser",
        JSON.stringify(
          administrator
        )
      );

      displayAdminInformation(
        administrator
      );

      return true;
    } catch (error) {
      console.error(
        "Administrator session verification failed.",
        error
      );

      showIntakeMessage(
        getRequestErrorMessage(
          error,
          "The administrator session could not be verified."
        ),
        "error"
      );

      return false;
    }
  }

  // ==========================================================
  // PAGE MESSAGES
  // ==========================================================

  function showIntakeMessage(
    message,
    messageType
  ) {
    var messageElement =
      getIntakeElement(
        "intakes-message"
      );

    if (!messageElement) {
      return;
    }

    messageElement.textContent =
      String(message || "");

    messageElement.classList.remove(
      "intakes-error",
      "intakes-success",
      "intakes-information"
    );

    messageElement.removeAttribute(
      "role"
    );

    if (!message) {
      return;
    }

    if (
      messageType ===
      "success"
    ) {
      messageElement.classList.add(
        "intakes-success"
      );

      messageElement.setAttribute(
        "role",
        "status"
      );
    } else if (
      messageType ===
      "information"
    ) {
      messageElement.classList.add(
        "intakes-information"
      );

      messageElement.setAttribute(
        "role",
        "status"
      );
    } else {
      messageElement.classList.add(
        "intakes-error"
      );

      messageElement.setAttribute(
        "role",
        "alert"
      );
    }
  }

  function clearIntakeMessage() {
    showIntakeMessage(
      "",
      "information"
    );
  }

  // ==========================================================
  // NORMALIZE INTAKE DATA
  // ==========================================================

  function normalizeStatus(
    status
  ) {
    var normalizedStatus =
      String(
        status ||
        "new"
      )
        .trim()
        .toLowerCase()
        .replace(
          /[ -]+/g,
          "_"
        );

    var allowedStatuses = [
      "new",
      "contacted",
      "in_review",
      "approved",
      "closed"
    ];

    if (
      allowedStatuses.indexOf(
        normalizedStatus
      ) ===
      -1
    ) {
      return "new";
    }

    return normalizedStatus;
  }

  function normalizeIntake(
    intake
  ) {
    var source =
      intake &&
      typeof intake ===
        "object"
        ? intake
        : {};

    return {
      id:
        String(
          source.id ||
          source._id ||
          ""
        ),

      name:
        String(
          source.name ||
          source.clientName ||
          source.client_name ||
          "Unnamed Client"
        ),

      phone:
        String(
          source.phone ||
          source.phoneNumber ||
          source.phone_number ||
          ""
        ),

      email:
        String(
          source.email ||
          ""
        ),

      contactMethod:
        String(
          source.contactMethod ||
          source.contact_method ||
          source.preferredContact ||
          source.preferred_contact ||
          ""
        ),

      projectType:
        String(
          source.projectType ||
          source.project_type ||
          source.serviceType ||
          source.service_type ||
          ""
        ),

      description:
        String(
          source.description ||
          source.projectDescription ||
          source.project_description ||
          source.details ||
          ""
        ),

      budget:
        String(
          source.budget ||
          source.budgetRange ||
          source.budget_range ||
          ""
        ),

      timeline:
        String(
          source.timeline ||
          source.requestedTimeline ||
          source.requested_timeline ||
          source.deadline ||
          ""
        ),

      location:
        String(
          source.location ||
          source.city ||
          source.address ||
          ""
        ),

      imageUrl:
        String(
          source.imageUrl ||
          source.image_url ||
          source.referenceImage ||
          source.reference_image ||
          source.referenceImageUrl ||
          source.reference_image_url ||
          ""
        ),

      status:
        normalizeStatus(
          source.status
        ),

      createdAt:
        source.createdAt ||
        source.created_at ||
        source.submittedAt ||
        source.submitted_at ||
        null
    };
  }

  function getIntakeList(
    responseData
  ) {
    if (
      Array.isArray(
        responseData
      )
    ) {
      return responseData;
    }

    if (
      responseData &&
      Array.isArray(
        responseData.intakes
      )
    ) {
      return responseData.intakes;
    }

    if (
      responseData &&
      responseData.data &&
      Array.isArray(
        responseData.data.intakes
      )
    ) {
      return responseData.data.intakes;
    }

    return [];
  }

  // ==========================================================
  // DISPLAY FORMATTING
  // ==========================================================

  function safeText(
    value
  ) {
    var text =
      String(value || "")
        .trim();

    return text ||
      "Not provided";
  }

  function formatStatus(
    status
  ) {
    return String(
      normalizeStatus(
        status
      )
    )
      .replace(
        /_/g,
        " "
      )
      .replace(
        /\b\w/g,
        function (letter) {
          return letter.toUpperCase();
        }
      );
  }

  function formatDate(
    value
  ) {
    if (!value) {
      return "Date unavailable";
    }

    var date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Date unavailable";
    }

    return new Intl.DateTimeFormat(
      "en-US",
      {
        year:
          "numeric",

        month:
          "short",

        day:
          "numeric",

        hour:
          "numeric",

        minute:
          "2-digit"
      }
    ).format(date);
  }

  // ==========================================================
  // CREATE INFORMATION ITEM
  // ==========================================================

  function createInformationItem(
    label,
    value,
    extraClass
  ) {
    var className =
      "intake-information-item";

    if (extraClass) {
      className +=
        " " +
        extraClass;
    }

    var container =
      createElement(
        "section",
        className
      );

    var heading =
      createElement(
        "h3",
        "",
        label
      );

    var paragraph =
      createElement(
        "p",
        "",
        safeText(value)
      );

    container.appendChild(
      heading
    );

    container.appendChild(
      paragraph
    );

    return container;
  }

  // ==========================================================
  // CREATE CONTACT INFORMATION
  // ==========================================================

  function createContactItem(
    label,
    contactType,
    value
  ) {
    var container =
      createElement(
        "section",
        "intake-information-item"
      );

    var heading =
      createElement(
        "h3",
        "",
        label
      );

    var paragraph =
      document.createElement(
        "p"
      );

    var cleanValue =
      String(value || "")
        .trim();

    container.appendChild(
      heading
    );

    if (!cleanValue) {
      paragraph.textContent =
        "Not provided";

      container.appendChild(
        paragraph
      );

      return container;
    }

    var link =
      document.createElement(
        "a"
      );

    if (
      contactType ===
      "email"
    ) {
      link.href =
        "mailto:" +
        cleanValue;
    } else {
      link.href =
        "tel:" +
        cleanValue.replace(
          /[^0-9+]/g,
          ""
        );
    }

    link.textContent =
      cleanValue;

    paragraph.appendChild(
      link
    );

    container.appendChild(
      paragraph
    );

    return container;
  }

  // ==========================================================
  // CREATE STATUS DROPDOWN
  // ==========================================================

  function createStatusSelect(
    intake
  ) {
    var statusSelect =
      document.createElement(
        "select"
      );

    statusSelect.setAttribute(
      "aria-label",
      (
        "Status for " +
        intake.name
      )
    );

    var statuses = [
      {
        value:
          "new",

        label:
          "New"
      },
      {
        value:
          "contacted",

        label:
          "Contacted"
      },
      {
        value:
          "in_review",

        label:
          "In Review"
      },
      {
        value:
          "approved",

        label:
          "Approved"
      },
      {
        value:
          "closed",

        label:
          "Closed"
      }
    ];

    statuses.forEach(
      function (status) {
        var option =
          document.createElement(
            "option"
          );

        option.value =
          status.value;

        option.textContent =
          status.label;

        statusSelect.appendChild(
          option
        );
      }
    );

    statusSelect.value =
      normalizeStatus(
        intake.status
      );

    return statusSelect;
  }

  // ==========================================================
  // CREATE REFERENCE IMAGE
  // ==========================================================

  function isValidWebAddress(
    value
  ) {
    try {
      var address =
        new URL(value);

      return (
        address.protocol ===
          "http:" ||
        address.protocol ===
          "https:"
      );
    } catch (error) {
      return false;
    }
  }

  function createReferenceSection(
    intake
  ) {
    var referenceSection =
      createElement(
        "aside",
        "intake-reference"
      );

    referenceSection.appendChild(
      createElement(
        "h3",
        "",
        "Reference Image"
      )
    );

    if (
      !intake.imageUrl ||
      !isValidWebAddress(
        intake.imageUrl
      )
    ) {
      referenceSection.appendChild(
        createElement(
          "p",
          "intake-reference-empty",
          "No reference image was submitted."
        )
      );

      return referenceSection;
    }

    var imageLink =
      document.createElement(
        "a"
      );

    imageLink.href =
      intake.imageUrl;

    imageLink.target =
      "_blank";

    imageLink.rel =
      "noopener noreferrer";

    imageLink.setAttribute(
      "aria-label",
      (
        "Open the reference image for " +
        intake.name
      )
    );

    var image =
      document.createElement(
        "img"
      );

    image.src =
      intake.imageUrl;

    image.alt =
      "Reference image submitted with the project request";

    image.className =
      "intake-reference-image";

    image.loading =
      "lazy";

    image.addEventListener(
      "error",
      function () {
        var errorMessage =
          createElement(
            "p",
            "intake-reference-empty",
            "The reference image could not be loaded."
          );

        imageLink.replaceWith(
          errorMessage
        );
      }
    );

    imageLink.appendChild(
      image
    );

    referenceSection.appendChild(
      imageLink
    );

    var directLink =
      document.createElement(
        "a"
      );

    directLink.className =
      "intake-reference-link";

    directLink.href =
      intake.imageUrl;

    directLink.target =
      "_blank";

    directLink.rel =
      "noopener noreferrer";

    directLink.textContent =
      "Open Full Reference Image";

    referenceSection.appendChild(
      directLink
    );

    return referenceSection;
  }

  // ==========================================================
  // CREATE INTAKE CARD
  // ==========================================================

  function createIntakeCard(
    intake
  ) {
    var card =
      createElement(
        "article",
        "intake-card"
      );

    card.setAttribute(
      "data-intake-id",
      intake.id
    );

    var cardHeader =
      createElement(
        "header",
        "intake-card-header"
      );

    var headingContainer =
      document.createElement(
        "div"
      );

    var heading =
      createElement(
        "h2",
        "",
        intake.name
      );

    var submittedDate =
      createElement(
        "p",
        "intake-submitted-date",
        (
          "Submitted: " +
          formatDate(
            intake.createdAt
          )
        )
      );

    var statusBadge =
      createElement(
        "span",
        (
          "intake-status status-" +
          intake.status.replace(
            /_/g,
            "-"
          )
        ),
        formatStatus(
          intake.status
        )
      );

    headingContainer.appendChild(
      heading
    );

    headingContainer.appendChild(
      submittedDate
    );

    cardHeader.appendChild(
      headingContainer
    );

    cardHeader.appendChild(
      statusBadge
    );

    var cardBody =
      createElement(
        "div",
        "intake-card-body"
      );

    var informationGrid =
      createElement(
        "div",
        "intake-information-grid"
      );

    informationGrid.appendChild(
      createContactItem(
        "Email",
        "email",
        intake.email
      )
    );

    informationGrid.appendChild(
      createContactItem(
        "Phone",
        "phone",
        intake.phone
      )
    );

    informationGrid.appendChild(
      createInformationItem(
        "Preferred Contact",
        intake.contactMethod
      )
    );

    informationGrid.appendChild(
      createInformationItem(
        "Project Type",
        intake.projectType
      )
    );

    informationGrid.appendChild(
      createInformationItem(
        "Budget",
        intake.budget
      )
    );

    informationGrid.appendChild(
      createInformationItem(
        "Timeline",
        intake.timeline
      )
    );

    informationGrid.appendChild(
      createInformationItem(
        "Location",
        intake.location
      )
    );

    informationGrid.appendChild(
      createInformationItem(
        "Project Description",
        intake.description,
        "intake-description"
      )
    );

    cardBody.appendChild(
      informationGrid
    );

    cardBody.appendChild(
      createReferenceSection(
        intake
      )
    );

    var cardActions =
      createElement(
        "footer",
        "intake-card-actions"
      );

    var statusLabel =
      createElement(
        "label",
        "",
        "Status:"
      );

    var statusSelect =
      createStatusSelect(
        intake
      );

    var statusSelectId =
      "intake-status-" +
      intake.id.replace(
        /[^a-zA-Z0-9_-]/g,
        "-"
      );

    statusSelect.id =
      statusSelectId;

    statusLabel.htmlFor =
      statusSelectId;

    var updateButton =
      createElement(
        "button",
        "intake-action-button",
        "Update Status"
      );

    updateButton.type =
      "button";

    updateButton.addEventListener(
      "click",
      function () {
        updateIntakeStatus(
          intake.id,
          statusSelect.value,
          updateButton
        );
      }
    );

    var deleteButton =
      createElement(
        "button",
        (
          "intake-action-button " +
          "delete-intake-button"
        ),
        "Delete Intake"
      );

    deleteButton.type =
      "button";

    deleteButton.addEventListener(
      "click",
      function () {
        deleteIntake(
          intake.id,
          intake.name,
          deleteButton
        );
      }
    );

    cardActions.appendChild(
      statusLabel
    );

    cardActions.appendChild(
      statusSelect
    );

    cardActions.appendChild(
      updateButton
    );

    cardActions.appendChild(
      deleteButton
    );

    card.appendChild(
      cardHeader
    );

    card.appendChild(
      cardBody
    );

    card.appendChild(
      cardActions
    );

    return card;
  }

  // ==========================================================
  // SEARCH AND FILTER
  // ==========================================================

  function intakeMatchesSearch(
    intake,
    searchText
  ) {
    if (!searchText) {
      return true;
    }

    var searchableText = [
      intake.name,
      intake.email,
      intake.phone,
      intake.contactMethod,
      intake.projectType,
      intake.description,
      intake.budget,
      intake.timeline,
      intake.location,
      intake.status
    ]
      .join(" ")
      .toLowerCase();

    return (
      searchableText.indexOf(
        searchText
      ) >=
      0
    );
  }

  function getFilteredIntakes() {
    var searchInput =
      getIntakeElement(
        "intake-search"
      );

    var statusFilter =
      getIntakeElement(
        "intake-status-filter"
      );

    var searchText =
      searchInput
        ? searchInput.value
            .trim()
            .toLowerCase()
        : "";

    var selectedStatus =
      statusFilter
        ? statusFilter.value
        : "all";

    return adminIntakeRecords.filter(
      function (intake) {
        var statusMatches =
          selectedStatus ===
            "all" ||
          intake.status ===
            selectedStatus;

        return (
          statusMatches &&
          intakeMatchesSearch(
            intake,
            searchText
          )
        );
      }
    );
  }

  // ==========================================================
  // RENDER INTAKE LIST
  // ==========================================================

  function renderIntakes() {
    var intakeList =
      getIntakeElement(
        "intake-list"
      );

    if (!intakeList) {
      return;
    }

    var filteredIntakes =
      getFilteredIntakes();

    intakeList.replaceChildren();

    intakeList.setAttribute(
      "aria-busy",
      "false"
    );

    if (
      filteredIntakes.length ===
      0
    ) {
      var emptyMessage;

      if (
        adminIntakeRecords.length ===
        0
      ) {
        emptyMessage =
          "No client intake requests have been submitted yet.";
      } else {
        emptyMessage =
          "No client intake requests match the selected search and status filters.";
      }

      intakeList.appendChild(
        createElement(
          "p",
          "intake-list-empty",
          emptyMessage
        )
      );

      return;
    }

    filteredIntakes.forEach(
      function (intake) {
        intakeList.appendChild(
          createIntakeCard(
            intake
          )
        );
      }
    );
  }

  // ==========================================================
  // SUMMARY COUNTS
  // ==========================================================

  function updateSummary() {
    var summary = {
      total:
        adminIntakeRecords.length,

      new:
        0,

      contacted:
        0,

      inReview:
        0,

      approved:
        0,

      closed:
        0
    };

    adminIntakeRecords.forEach(
      function (intake) {
        if (
          intake.status ===
          "new"
        ) {
          summary.new +=
            1;
        }

        if (
          intake.status ===
          "contacted"
        ) {
          summary.contacted +=
            1;
        }

        if (
          intake.status ===
          "in_review"
        ) {
          summary.inReview +=
            1;
        }

        if (
          intake.status ===
          "approved"
        ) {
          summary.approved +=
            1;
        }

        if (
          intake.status ===
          "closed"
        ) {
          summary.closed +=
            1;
        }
      }
    );

    setText(
      "total-intakes",
      summary.total
    );

    setText(
      "new-intakes",
      summary.new
    );

    setText(
      "contacted-intakes",
      summary.contacted
    );

    setText(
      "review-intakes",
      summary.inReview
    );

    setText(
      "approved-intakes",
      summary.approved
    );

    setText(
      "closed-intakes",
      summary.closed
    );
  }

  // ==========================================================
  // REFRESH BUTTON
  // ==========================================================

  function setRefreshButtonLoading(
    isLoading
  ) {
    var refreshButton =
      getIntakeElement(
        "refresh-intakes-button"
      );

    if (!refreshButton) {
      return;
    }

    refreshButton.disabled =
      Boolean(
        isLoading
      );

    refreshButton.setAttribute(
      "aria-busy",
      isLoading
        ? "true"
        : "false"
    );

    refreshButton.textContent =
      isLoading
        ? "Refreshing..."
        : "Refresh Intakes";
  }

  // ==========================================================
  // LOAD INTAKES
  // ==========================================================

  async function loadIntakes() {
    if (intakeRequestInProgress) {
      return false;
    }

    var intakeList =
      getIntakeElement(
        "intake-list"
      );

    intakeRequestInProgress =
      true;

    setRefreshButtonLoading(
      true
    );

    showIntakeMessage(
      "Loading client intake requests...",
      "information"
    );

    if (intakeList) {
      intakeList.setAttribute(
        "aria-busy",
        "true"
      );

      intakeList.replaceChildren(
        createElement(
          "p",
          "intake-list-loading",
          "Loading client intake requests..."
        )
      );
    }

    try {
      var responseData =
        await requestJson(
          ADMIN_INTAKE_API,
          {
            method:
              "GET",

            headers:
              getAdminHeaders(
                false
              )
          }
        );

      adminIntakeRecords =
        getIntakeList(
          responseData
        )
          .map(
            normalizeIntake
          )
          .filter(
            function (intake) {
              return Boolean(
                intake.id
              );
            }
          )
          .sort(
            function (
              firstIntake,
              secondIntake
            ) {
              var firstTime =
                new Date(
                  firstIntake.createdAt ||
                  0
                ).getTime();

              var secondTime =
                new Date(
                  secondIntake.createdAt ||
                  0
                ).getTime();

              if (
                !Number.isFinite(
                  firstTime
                )
              ) {
                firstTime =
                  0;
              }

              if (
                !Number.isFinite(
                  secondTime
                )
              ) {
                secondTime =
                  0;
              }

              return (
                secondTime -
                firstTime
              );
            }
          );

      updateSummary();
      renderIntakes();

      showIntakeMessage(
        adminIntakeRecords.length ===
          1
          ? "1 client intake request loaded."
          : (
              adminIntakeRecords.length +
              " client intake requests loaded."
            ),
        "success"
      );

      return true;
    } catch (error) {
      console.error(
        "Client intake requests could not be loaded.",
        error
      );

      adminIntakeRecords =
        [];

      updateSummary();

      if (intakeList) {
        intakeList.setAttribute(
          "aria-busy",
          "false"
        );

        intakeList.replaceChildren(
          createElement(
            "p",
            "intake-list-empty",
            "Client intake requests could not be loaded."
          )
        );
      }

      showIntakeMessage(
        getRequestErrorMessage(
          error,
          "Client intake requests could not be loaded."
        ),
        "error"
      );

      return false;
    } finally {
      intakeRequestInProgress =
        false;

      setRefreshButtonLoading(
        false
      );
    }
  }

  // ==========================================================
  // UPDATE STATUS
  // ==========================================================

  async function updateIntakeStatus(
    intakeId,
    newStatus,
    updateButton
  ) {
    var normalizedStatus =
      normalizeStatus(
        newStatus
      );

    var intake =
      adminIntakeRecords.find(
        function (record) {
          return (
            record.id ===
            intakeId
          );
        }
      );

    if (!intake) {
      showIntakeMessage(
        "The selected client intake request could not be found.",
        "error"
      );

      return;
    }

    var previousStatus =
      intake.status;

    if (
      previousStatus ===
      normalizedStatus
    ) {
      showIntakeMessage(
        "The client intake already has that status.",
        "information"
      );

      return;
    }

    if (updateButton) {
      updateButton.disabled =
        true;

      updateButton.setAttribute(
        "aria-busy",
        "true"
      );

      updateButton.textContent =
        "Updating...";
    }

    showIntakeMessage(
      "Updating client intake status...",
      "information"
    );

    try {
      var responseData =
        await requestJson(
          ADMIN_INTAKE_API +
          "/" +
          encodeURIComponent(
            intakeId
          ) +
          "/status",
          {
            method:
              "PATCH",

            headers:
              getAdminHeaders(
                true
              ),

            body:
              JSON.stringify({
                status:
                  normalizedStatus
              })
          }
        );

      intake.status =
        normalizedStatus;

      updateSummary();
      renderIntakes();

      showIntakeMessage(
        getErrorMessage(
          responseData.message,
          (
            "Client intake status updated to " +
            formatStatus(
              normalizedStatus
            ) +
            "."
          )
        ),
        "success"
      );
    } catch (error) {
      console.error(
        "Client intake status update failed.",
        error
      );

      intake.status =
        previousStatus;

      showIntakeMessage(
        getRequestErrorMessage(
          error,
          "The client intake status could not be updated."
        ),
        "error"
      );

      if (updateButton) {
        updateButton.disabled =
          false;

        updateButton.setAttribute(
          "aria-busy",
          "false"
        );

        updateButton.textContent =
          "Update Status";
      }
    }
  }

  // ==========================================================
  // DELETE INTAKE
  // ==========================================================

  async function deleteIntake(
    intakeId,
    clientName,
    deleteButton
  ) {
    var confirmed =
      window.confirm(
        (
          "Permanently delete the client " +
          "intake request from \"" +
          clientName +
          "\"?"
        )
      );

    if (!confirmed) {
      return;
    }

    if (deleteButton) {
      deleteButton.disabled =
        true;

      deleteButton.setAttribute(
        "aria-busy",
        "true"
      );

      deleteButton.textContent =
        "Deleting...";
    }

    showIntakeMessage(
      "Deleting client intake request...",
      "information"
    );

    try {
      var responseData =
        await requestJson(
          ADMIN_INTAKE_API +
          "/" +
          encodeURIComponent(
            intakeId
          ),
          {
            method:
              "DELETE",

            headers:
              getAdminHeaders(
                false
              )
          }
        );

      adminIntakeRecords =
        adminIntakeRecords.filter(
          function (intake) {
            return (
              intake.id !==
              intakeId
            );
          }
        );

      updateSummary();
      renderIntakes();

      showIntakeMessage(
        getErrorMessage(
          responseData.message,
          "Client intake request deleted successfully."
        ),
        "success"
      );
    } catch (error) {
      console.error(
        "Client intake deletion failed.",
        error
      );

      showIntakeMessage(
        getRequestErrorMessage(
          error,
          "The client intake request could not be deleted."
        ),
        "error"
      );

      if (deleteButton) {
        deleteButton.disabled =
          false;

        deleteButton.setAttribute(
          "aria-busy",
          "false"
        );

        deleteButton.textContent =
          "Delete Intake";
      }
    }
  }

  // ==========================================================
  // LOGOUT BUTTONS
  // ==========================================================

  function connectLogoutButtons() {
    [
      "admin-logout-button",
      "admin-navigation-logout-button"
    ].forEach(
      function (elementId) {
        var button =
          getIntakeElement(
            elementId
          );

        if (button) {
          button.addEventListener(
            "click",
            logoutAdmin
          );
        }
      }
    );
  }

  // ==========================================================
  // SEARCH AND FILTER CONTROLS
  // ==========================================================

  function connectFilterControls() {
    var searchInput =
      getIntakeElement(
        "intake-search"
      );

    var statusFilter =
      getIntakeElement(
        "intake-status-filter"
      );

    var refreshButton =
      getIntakeElement(
        "refresh-intakes-button"
      );

    if (searchInput) {
      searchInput.addEventListener(
        "input",
        renderIntakes
      );
    }

    if (statusFilter) {
      statusFilter.addEventListener(
        "change",
        renderIntakes
      );
    }

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        loadIntakes
      );
    }
  }

  // ==========================================================
  // PAGE STARTUP
  // ==========================================================

  async function initializePage() {
    connectLogoutButtons();
    connectFilterControls();

    var validSession =
      await verifyAdminSession();

    if (!validSession) {
      return;
    }

    updateSummary();

    await loadIntakes();

    console.log(
      "MMC Client Intake administration page initialized."
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializePage
    );
  } else {
    initializePage();
  }

  // ==========================================================
  // OPTIONAL INLINE SUPPORT
  // ==========================================================

  window.loadIntakes =
    loadIntakes;

  window.renderIntakes =
    renderIntakes;

  window.updateIntakeStatus =
    updateIntakeStatus;

  window.deleteIntake =
    deleteIntake;

  window.logoutAdmin =
    logoutAdmin;
}());
``
  "use strict";

  var ADMIN_INTAKE_BACKEND_URL =
    window.MMC_BACKEND_URL ||
    window.location.origin;

  var ADMIN_INTAKE_API =
    ADMIN_INTAKE_BACKEND_URL +
    "/admin/intakes";

  var adminIntakeRecords = [];

  // ==========================================================
  // ELEMENT HELPERS
  // ==========================================================

  function getIntakeElement(elementId) {
    return document.getElementById(
      elementId
    );
  }

  function createElement(
    tagName,
    className,
    textContent
  ) {
    var element =
      document.createElement(
        tagName
      );

    if (className) {
      element.className =
        className;
    }

    if (
      textContent !== undefined
    ) {
      element.textContent =
        textContent;
    }

    return element;
  }

  // ==========================================================
  // ADMIN LOGIN HELPERS
  // ==========================================================

  function getAdminToken() {
    return localStorage.getItem(
      "adminToken"
    );
  }

  function getAdminHeaders(
    includeContentType
  ) {
    var headers = {
      Authorization:
        "Bearer " +
        getAdminToken()
    };

    if (
      includeContentType !== false
    ) {
      headers["Content-Type"] =
        "application/json";
    }

    return headers;
  }

  function clearAdminSession() {
    localStorage.removeItem(
      "adminToken"
    );

    localStorage.removeItem(
      "adminUser"
    );

    localStorage.removeItem(
      "MMC_ADMIN_TOKEN"
    );
  }

  function redirectToAdminLogin() {
    clearAdminSession();

    window.location.href =
      "admin-login.html";
  }

  function logoutAdmin() {
    redirectToAdminLogin();
  }

  // ==========================================================
  // SERVER RESPONSE
  // ==========================================================

  async function readServerResponse(
    response
  ) {
    var data;

    try {
      data =
        await response.json();
    } catch (error) {
      data = {
        error:
          "The server returned an unexpected response."
      };
    }

    if (response.status === 401) {
      redirectToAdminLogin();

      throw new Error(
        data.error ||
        "Your administrator session expired."
      );
    }

    if (response.status === 403) {
      throw new Error(
        data.error ||
        "You do not have permission to manage client intake requests."
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        (
          "Request failed with status " +
          response.status +
          "."
        )
      );
    }

    return data;
  }

  // ==========================================================
  // VERIFY ADMIN SESSION
  // ==========================================================

  async function verifyAdminSession() {
    var token =
      getAdminToken();

    if (!token) {
      redirectToAdminLogin();
      return false;
    }

    try {
      var response = await fetch(
        ADMIN_INTAKE_BACKEND_URL +
        "/admin/me",
        {
          method: "GET",
          headers:
            getAdminHeaders(false)
        }
      );

      var data =
        await readServerResponse(
          response
        );

      var admin =
        data.admin || {};

      localStorage.setItem(
        "adminUser",
        JSON.stringify(admin)
      );

      displayAdminInformation(
        admin
      );

      return true;
    } catch (error) {
      console.error(
        "Admin session verification failed:",
        error
      );

      showIntakeMessage(
        error.message ||
        "The administrator session could not be verified.",
        "error"
      );

      return false;
    }
  }

  function displayAdminInformation(
    admin
  ) {
    var usernameElement =
      getIntakeElement(
        "admin-username"
      );

    var roleElement =
      getIntakeElement(
        "admin-role"
      );

    if (usernameElement) {
      usernameElement.textContent =
        admin.username || "";
    }

    if (roleElement) {
      roleElement.textContent =
        formatAdminRole(
          admin.role
        );
    }
  }

  function formatAdminRole(role) {
    return String(role || "")
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        function (letter) {
          return letter.toUpperCase();
        }
      );
  }

  // ==========================================================
  // PAGE MESSAGES
  // ==========================================================

  function showIntakeMessage(
    message,
    messageType
  ) {
    var messageElement =
      getIntakeElement(
        "intakes-message"
      );

    if (!messageElement) {
      if (messageType === "error") {
        alert(message);
      }

      return;
    }

    messageElement.textContent =
      message || "";

    messageElement.classList.remove(
      "intakes-error",
      "intakes-success",
      "intakes-information"
    );

    if (messageType === "error") {
      messageElement.classList.add(
        "intakes-error"
      );
    } else if (
      messageType === "success"
    ) {
      messageElement.classList.add(
        "intakes-success"
      );
    } else {
      messageElement.classList.add(
        "intakes-information"
      );
    }
  }

  function clearIntakeMessage() {
    showIntakeMessage(
      "",
      "information"
    );
  }

  // ==========================================================
  // NORMALIZE INTAKE DATA
  // ==========================================================

  function normalizeStatus(status) {
    var normalizedStatus =
      String(status || "new")
        .trim()
        .toLowerCase()
        .replace(/[ -]+/g, "_");

    var allowedStatuses = [
      "new",
      "contacted",
      "in_review",
      "approved",
      "closed"
    ];

    if (
      allowedStatuses.indexOf(
        normalizedStatus
      ) === -1
    ) {
      return "new";
    }

    return normalizedStatus;
  }

  function normalizeIntake(intake) {
    return {
      id: String(
        intake.id ||
        intake._id ||
        ""
      ),

      name: String(
        intake.name ||
        "Unnamed Client"
      ),

      phone: String(
        intake.phone || ""
      ),

      email: String(
        intake.email || ""
      ),

      contactMethod: String(
        intake.contactMethod ||
        intake.contact_method ||
        ""
      ),

      projectType: String(
        intake.projectType ||
        intake.project_type ||
        ""
      ),

      description: String(
        intake.description || ""
      ),

      budget: String(
        intake.budget || ""
      ),

      timeline: String(
        intake.timeline || ""
      ),

      location: String(
        intake.location || ""
      ),

      imageUrl: String(
        intake.imageUrl ||
        intake.image_url ||
        ""
      ),

      status:
        normalizeStatus(
          intake.status
        ),

      createdAt:
        intake.createdAt ||
        intake.created_at ||
        null
    };
  }

  // ==========================================================
  // DISPLAY FORMATTING
  // ==========================================================

  function safeText(value) {
    var text =
      String(value || "").trim();

    return text || "Not provided";
  }

  function formatStatus(status) {
    if (status === "in_review") {
      return "In Review";
    }

    return String(status || "new")
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        function (letter) {
          return letter.toUpperCase();
        }
      );
  }

  function formatDate(value) {
    if (!value) {
      return "Date unavailable";
    }

    var date =
      new Date(value);

    if (
      isNaN(date.getTime())
    ) {
      return "Date unavailable";
    }

    return date.toLocaleString();
  }

  // ==========================================================
  // CREATE INFORMATION ITEM
  // ==========================================================

  function createInformationItem(
    label,
    value,
    extraClass
  ) {
    var className =
      "intake-information-item";

    if (extraClass) {
      className +=
        " " + extraClass;
    }

    var container =
      createElement(
        "section",
        className
      );

    var heading =
      createElement(
        "h3",
        "",
        label
      );

    var paragraph =
      createElement(
        "p",
        "",
        safeText(value)
      );

    container.appendChild(
      heading
    );

    container.appendChild(
      paragraph
    );

    return container;
  }

  // ==========================================================
  // CREATE CONTACT INFORMATION
  // ==========================================================

  function createContactItem(
    label,
    contactType,
    value
  ) {
    var container =
      createElement(
        "section",
        "intake-information-item"
      );

    var heading =
      createElement(
        "h3",
        "",
        label
      );

    var paragraph =
      document.createElement("p");

    var cleanValue =
      String(value || "").trim();

    container.appendChild(
      heading
    );

    if (!cleanValue) {
      paragraph.textContent =
        "Not provided";

      container.appendChild(
        paragraph
      );

      return container;
    }

    var link =
      document.createElement("a");

    if (contactType === "email") {
      link.href =
        "mailto:" +
        cleanValue;
    } else {
      link.href =
        "tel:" +
        cleanValue.replace(
          /[^0-9+]/g,
          ""
        );
    }

    link.textContent =
      cleanValue;

    paragraph.appendChild(link);

    container.appendChild(
      paragraph
    );

    return container;
  }

  // ==========================================================
  // CREATE STATUS DROPDOWN
  // ==========================================================

  function createStatusSelect(
    intake
  ) {
    var statusSelect =
      document.createElement(
        "select"
      );

    statusSelect.setAttribute(
      "aria-label",
      "Status for " +
      intake.name
    );

    var statuses = [
      {
        value: "new",
        label: "New"
      },
      {
        value: "contacted",
        label: "Contacted"
      },
      {
        value: "in_review",
        label: "In Review"
      },
      {
        value: "approved",
        label: "Approved"
      },
      {
        value: "closed",
        label: "Closed"
      }
    ];

    statuses.forEach(
      function (status) {
        var option =
          document.createElement(
            "option"
          );

        option.value =
          status.value;

        option.textContent =
          status.label;

        statusSelect.appendChild(
          option
        );
      }
    );

    statusSelect.value =
      intake.status;

    return statusSelect;
  }

  // ==========================================================
  // CREATE REFERENCE IMAGE
  // ==========================================================

  function createReferenceSection(
    intake
  ) {
    var referenceSection =
      createElement(
        "aside",
        "intake-reference"
      );

    referenceSection.appendChild(
      createElement(
        "h3",
        "",
        "Reference Image"
      )
    );

    if (!intake.imageUrl) {
      referenceSection.appendChild(
        createElement(
          "p",
          "intake-reference-empty",
          "No reference image was submitted."
        )
      );

      return referenceSection;
    }

    var imageLink =
      document.createElement("a");

    imageLink.href =
      intake.imageUrl;

    imageLink.target =
      "_blank";

    imageLink.rel =
      "noopener noreferrer";

    var image =
      document.createElement("img");

    image.src =
      intake.imageUrl;

    image.alt =
      "Reference image for " +
      intake.name +
      " project request";

    image.className =
      "intake-reference-image";

    image.loading =
      "lazy";

    image.addEventListener(
      "error",
      function () {
        var errorMessage =
          createElement(
            "p",
            "intake-reference-empty",
            "The reference image could not be loaded."
          );

        imageLink.replaceWith(
          errorMessage
        );
      }
    );

    imageLink.appendChild(image);

    referenceSection.appendChild(
      imageLink
    );

    return referenceSection;
  }

  // ==========================================================
  // CREATE INTAKE CARD
  // ==========================================================

  function createIntakeCard(intake) {
    var card =
      createElement(
        "article",
        "intake-card"
      );

    card.setAttribute(
      "data-intake-id",
      intake.id
    );

    var cardHeader =
      createElement(
        "header",
        "intake-card-header"
      );

    var headingContainer =
      document.createElement("div");

    var heading =
      createElement(
        "h2",
        "",
        intake.name
      );

    var submittedDate =
      createElement(
        "p",
        "intake-submitted-date",
        (
          "Submitted: " +
          formatDate(
            intake.createdAt
          )
        )
      );

    var statusBadge =
      createElement(
        "span",
        (
          "intake-status status-" +
          intake.status.replace(
            /_/g,
            "-"
          )
        ),
        formatStatus(
          intake.status
        )
      );

    headingContainer.appendChild(
      heading
    );

    headingContainer.appendChild(
      submittedDate
    );

    cardHeader.appendChild(
      headingContainer
    );

    cardHeader.appendChild(
      statusBadge
    );

    var cardBody =
      createElement(
        "div",
        "intake-card-body"
      );

    var informationGrid =
      createElement(
        "div",
        "intake-information-grid"
      );

    informationGrid.appendChild(
      createContactItem(
        "Email",
        "email",
        intake.email
      )
    );

    informationGrid.appendChild(
      createContactItem(
        "Phone",
        "phone",
        intake.phone
      )
    );

    informationGrid.appendChild(
      createInformationItem(
        "Preferred Contact",
        intake.contactMethod
      )
    );

    informationGrid.appendChild(
      createInformationItem(
        "Project Type",
        intake.projectType
      )
    );

    informationGrid.appendChild(
      createInformationItem(
        "Budget",
        intake.budget
      )
    );

    informationGrid.appendChild(
      createInformationItem(
        "Timeline",
        intake.timeline
      )
    );

    informationGrid.appendChild(
      createInformationItem(
        "Location",
        intake.location
      )
    );

    informationGrid.appendChild(
      createInformationItem(
        "Project Description",
        intake.description,
        "intake-description"
      )
    );

    cardBody.appendChild(
      informationGrid
    );

    cardBody.appendChild(
      createReferenceSection(
        intake
      )
    );

    var cardActions =
      createElement(
        "footer",
        "intake-card-actions"
      );

    var statusSelect =
      createStatusSelect(
        intake
      );

    var updateButton =
      createElement(
        "button",
        "intake-action-button",
        "Update Status"
      );

    updateButton.type =
      "button";

    updateButton.addEventListener(
      "click",
      function () {
        updateIntakeStatus(
          intake.id,
          statusSelect.value,
          updateButton
        );
      }
    );

    var deleteButton =
      createElement(
        "button",
        (
          "intake-action-button " +
          "delete-intake-button"
        ),
        "Delete Intake"
      );

    deleteButton.type =
      "button";

    deleteButton.addEventListener(
      "click",
      function () {
        deleteIntake(
          intake.id,
          intake.name,
          deleteButton
        );
      }
    );

    cardActions.appendChild(
      statusSelect
    );

    cardActions.appendChild(
      updateButton
    );

    cardActions.appendChild(
      deleteButton
    );

    card.appendChild(
      cardHeader
    );

    card.appendChild(
      cardBody
    );

    card.appendChild(
      cardActions
    );

    return card;
  }

  // ==========================================================
  // SEARCH AND FILTER
  // ==========================================================

  function intakeMatchesSearch(
    intake,
    searchText
  ) {
    if (!searchText) {
      return true;
    }

    var searchableText = [
      intake.name,
      intake.email,
      intake.phone,
      intake.contactMethod,
      intake.projectType,
      intake.description,
      intake.budget,
      intake.timeline,
      intake.location
    ]
      .join(" ")
      .toLowerCase();

    return (
      searchableText.indexOf(
        searchText
      ) >= 0
    );
  }

  function getFilteredIntakes() {
    var searchInput =
      getIntakeElement(
        "intake-search"
      );

    var statusFilter =
      getIntakeElement(
        "intake-status-filter"
      );

    var searchText =
      searchInput
        ? searchInput.value
            .trim()
            .toLowerCase()
        : "";

    var selectedStatus =
      statusFilter
        ? statusFilter.value
        : "all";

    return allClientIntakes.filter(
      function (intake) {
        var statusMatches =
          selectedStatus === "all" ||
          intake.status ===
            selectedStatus;

        return (
          statusMatches &&
          intakeMatchesSearch(
            intake,
            searchText
          )
        );
      }
    );
  }

  // ==========================================================
  // RENDER INTAKE LIST
  // ==========================================================

  function renderIntakes() {
    var intakeList =
      getIntakeElement(
        "intake-list"
      );

    if (!intakeList) {
      return;
    }

    var filteredIntakes =
      getFilteredIntakes();

    intakeList.replaceChildren();

    if (
      filteredIntakes.length === 0
    ) {
      var emptyMessage;

      if (
        allClientIntakes.length === 0
      ) {
        emptyMessage =
          "No client intake requests have been submitted yet.";
      } else {
        emptyMessage =
          "No client intake requests match the selected filters.";
      }

      intakeList.appendChild(
        createElement(
          "p",
          "intake-list-empty",
          emptyMessage
        )
      );

      return;
    }

    filteredIntakes.forEach(
      function (intake) {
        intakeList.appendChild(
          createIntakeCard(intake)
        );
      }
    );
  }

  // ==========================================================
  // SUMMARY COUNTS
  // ==========================================================

  function updateSummary() {
    var totalCount =
      allClientIntakes.length;

    var newCount = 0;
    var reviewCount = 0;
    var approvedCount = 0;

    allClientIntakes.forEach(
      function (intake) {
        if (
          intake.status === "new"
        ) {
          newCount += 1;
        }

        if (
          intake.status ===
          "in_review"
        ) {
          reviewCount += 1;
        }

        if (
          intake.status ===
          "approved"
        ) {
          approvedCount += 1;
        }
      }
    );

    setSummaryValue(
      "total-intakes",
      totalCount
    );

    setSummaryValue(
      "new-intakes",
      newCount
    );

    setSummaryValue(
      "review-intakes",
      reviewCount
    );

    setSummaryValue(
      "approved-intakes",
      approvedCount
    );
  }

  function setSummaryValue(
    elementId,
    value
  ) {
    var element =
      getIntakeElement(
        elementId
      );

    if (element) {
      element.textContent =
        String(value);
    }
  }

  // ==========================================================
  // LOAD INTAKES
  // ==========================================================

  async function loadIntakes() {
    var intakeList =
      getIntakeElement(
        "intake-list"
      );

    var refreshButton =
      getIntakeElement(
        "refresh-intakes-button"
      );

    if (intakeList) {
      intakeList.replaceChildren(
        createElement(
          "p",
          "intake-list-loading",
          "Loading client intake requests..."
        )
      );
    }

    try {
      if (refreshButton) {
        refreshButton.disabled = true;

        refreshButton.textContent =
          "Refreshing...";
      }

      var response = await fetch(
        ADMIN_INTAKE_API,
        {
          method: "GET",
          headers:
            getAdminHeaders(false)
        }
      );

      var data =
        await readServerResponse(
          response
        );

      var intakeRecords;

      if (Array.isArray(data)) {
        intakeRecords = data;
      } else if (
        data &&
        Array.isArray(data.intakes)
      ) {
        intakeRecords =
          data.intakes;
      } else {
        intakeRecords = [];
      }

      adminIntakeRecords =
        intakeRecords
          .map(normalizeIntake)
          .filter(
            function (intake) {
              return Boolean(
                intake.id
              );
            }
          )
          .sort(
            function (
              firstIntake,
              secondIntake
            ) {
              var firstDate =
                new Date(
                  firstIntake.createdAt ||
                  0
                );

              var secondDate =
                new Date(
                  secondIntake.createdAt ||
                  0
                );

              return (
                secondDate -
                firstDate
              );
            }
          );

      updateSummary();
      renderIntakes();
      clearIntakeMessage();
    } catch (error) {
      console.error(
        "Client intake requests could not be loaded:",
        error
      );

      adminIntakeRecords = [];

      updateSummary();

      if (intakeList) {
        intakeList.replaceChildren(
          createElement(
            "p",
            "intake-list-empty",
            "Client intake requests could not be loaded."
          )
        );
      }

      showIntakeMessage(
        error.message ||
        "Client intake requests could not be loaded.",
        "error"
      );
    } finally {
      if (refreshButton) {
        refreshButton.disabled =
          false;

        refreshButton.textContent =
          "Refresh Intakes";
      }
    }
  }

  // ==========================================================
  // UPDATE STATUS
  // ==========================================================

  async function updateIntakeStatus(
    intakeId,
    newStatus,
    updateButton
  ) {
    var normalizedStatus =
      normalizeIntakeStatus(
        newStatus
      );

    try {
      if (updateButton) {
        updateButton.disabled =
          true;

        updateButton.textContent =
          "Updating...";
      }

      var response = await fetch(
        ADMIN_INTAKE_API +
        "/" +
        encodeURIComponent(
          intakeId
        ) +
        "/status",
        {
          method: "PATCH",
          headers:
            getAdminHeaders(true),
          body: JSON.stringify({
            status:
              normalizedStatus
          })
        }
      );

      var data =
        await readServerResponse(
          response
        );

      adminIntakeRecords =
        adminIntakeRecords.map(
          function (intake) {
            if (
              intake.id === intakeId
            ) {
              intake.status =
                normalizedStatus;
            }

            return intake;
          }
        );

      updateSummary();
      renderIntakes();

      showIntakeMessage(
        data.message ||
        "Client intake status updated.",
        "success"
      );
    } catch (error) {
      console.error(
        "Client intake status update failed:",
        error
      );

      showIntakeMessage(
        error.message ||
        "The client intake status could not be updated.",
        "error"
      );

      if (updateButton) {
        updateButton.disabled =
          false;

        updateButton.textContent =
          "Update Status";
      }
    }
  }

  // ==========================================================
  // DELETE INTAKE
  // ==========================================================

  async function deleteIntake(
    intakeId,
    clientName,
    deleteButton
  ) {
    var confirmed =
      window.confirm(
        (
          "Permanently delete the client " +
          "intake request from \"" +
          clientName +
          "\"?"
        )
      );

    if (!confirmed) {
      return;
    }

    try {
      if (deleteButton) {
        deleteButton.disabled =
          true;

        deleteButton.textContent =
          "Deleting...";
      }

      var response = await fetch(
        ADMIN_INTAKE_API +
        "/" +
        encodeURIComponent(
          intakeId
        ),
        {
          method: "DELETE",
          headers:
            getAdminHeaders(false)
        }
      );

      var data =
        await readServerResponse(
          response
        );

      adminIntakeRecords =
        adminIntakeRecords.filter(
          function (intake) {
            return (
              intake.id !==
              intakeId
            );
          }
        );

      updateSummary();
      renderIntakes();

      showIntakeMessage(
        data.message ||
        "Client intake request deleted.",
        "success"
      );
    } catch (error) {
      console.error(
        "Client intake deletion failed:",
        error
      );

      showIntakeMessage(
        error.message ||
        "The client intake request could not be deleted.",
        "error"
      );

      if (deleteButton) {
        deleteButton.disabled =
          false;

        deleteButton.textContent =
          "Delete Intake";
      }
    }
  }

  // ==========================================================
  // PAGE STARTUP
  // ==========================================================

  document.addEventListener(
    "DOMContentLoaded",
    async function () {
      var validSession =
        await verifyAdminSession();

      if (!validSession) {
        return;
      }

      var searchInput =
        getIntakeElement(
          "intake-search"
        );

      var statusFilter =
        getIntakeElement(
          "intake-status-filter"
        );

      var refreshButton =
        getIntakeElement(
          "refresh-intakes-button"
        );

      var logoutButton =
        getIntakeElement(
          "admin-logout-button"
        );

      if (searchInput) {
        searchInput.addEventListener(
          "input",
          renderIntakes
        );
      }

      if (statusFilter) {
        statusFilter.addEventListener(
          "change",
          renderIntakes
        );
      }

      if (refreshButton) {
        refreshButton.addEventListener(
          "click",
          loadIntakes
        );
      }

      if (logoutButton) {
        logoutButton.addEventListener(
          "click",
          logoutAdmin
        );
      }

      await loadIntakes();
    }
  );

  // ==========================================================
  // OPTIONAL INLINE SUPPORT
  // ==========================================================

  window.loadIntakes =
    loadIntakes;

  window.updateIntakeStatus =
    updateIntakeStatus;

  window.deleteIntake =
    deleteIntake;

  window.logoutAdmin =
    logoutAdmin;
})();