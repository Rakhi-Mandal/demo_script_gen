function injectListeners() {
  const SELECTOR_ATTRS = [
    "data-testid",
    "data-test",
    "data-cy",
    "data-label",
    "id",
    "name",
    "aria-label",
    "x-tooltip",
    "wire:click",
    "placeholder",
  ];

  const XPATH_CANDIDATE_ATTRS = [
    ...SELECTOR_ATTRS,
    "title",
    "type",
  ];

  const WEAK_NAME_VALUES = new Set([
    "q",
    "query",
    "search",
    "input",
    "text",
  ]);

  const WEAK_ID_VALUES = new Set([
    "app",
    "container",
    "content",
    "main",
    "page",
    "root",
    "wrapper",
  ]);

  const ANCHOR_TAGS = new Set([
    "A",
    "BUTTON",
    "INPUT",
    "TEXTAREA",
    "SELECT",
    "FORM",
    "HEADER",
    "NAV",
    "MAIN",
  ]);

  const TEXT_XPATH_TAGS = new Set([
    "A",
    "BUTTON",
    "LABEL",
    "OPTION",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
  ]);

  /*
   * Prevent every recorder listener from being installed more than once.
   */
  const RECORDER_INSTALL_ATTRIBUTE =
    "data-pw-recorder-listeners-installed";

  const recorderAlreadyInstalled =
    window.__PW_RECORDER_LISTENERS_INSTALLED__ ||
    document.documentElement?.hasAttribute(
      RECORDER_INSTALL_ATTRIBUTE
    );

  if (recorderAlreadyInstalled) {
    console.warn(
      "[recorder] Listeners are already installed. Duplicate installation skipped."
    );

    return;
  }

  window.__PW_RECORDER_LISTENERS_INSTALLED__ =
    true;

  document.documentElement?.setAttribute(
    RECORDER_INSTALL_ATTRIBUTE,
    "true"
  );

  /*
   * One shared Map for XPath keys.
   *
   * Map.has() and Map.set() are average O(1).
   */
  function getClickXPathMapOwner() {
    try {
      const topWindow =
        window.top;

      /*
       * Access verifies that the top frame is same-origin.
       */
      void topWindow.location.href;

      return topWindow;
    } catch {
      return window;
    }
  }

  const clickXPathMapOwner =
    getClickXPathMapOwner();

  if (
    !(
      clickXPathMapOwner
        .__PW_RECORDED_CLICK_XPATHS__
      instanceof Map
    )
  ) {
    clickXPathMapOwner
      .__PW_RECORDED_CLICK_XPATHS__ =
      new Map();
  }

  const recordedClickXPaths =
    clickXPathMapOwner
      .__PW_RECORDED_CLICK_XPATHS__;

  function reserveClickXPath(
    xpathKey
  ) {
    if (!xpathKey) {
      return false;
    }

    /*
     * Average O(1) lookup.
     */
    if (
      recordedClickXPaths.has(
        xpathKey
      )
    ) {
      return false;
    }

    /*
     * Reserve before sending the action.
     */
    recordedClickXPaths.set(
      xpathKey,
      {
        status:
          "reserved",

        createdAt:
          Date.now(),
      }
    );

    return true;
  }

  function markClickXPathSaved(
    xpathKey
  ) {
    const current =
      recordedClickXPaths.get(
        xpathKey
      );

    if (!current) {
      return;
    }

    recordedClickXPaths.set(
      xpathKey,
      {
        ...current,

        status:
          "saved",

        savedAt:
          Date.now(),
      }
    );
  }

  function releaseClickXPath(
    xpathKey
  ) {
    if (!xpathKey) {
      return;
    }

    recordedClickXPaths.delete(
      xpathKey
    );
  }

  function omitNullFields(value) {
    if (Array.isArray(value)) {
      const cleanedItems = value
        .map(omitNullFields)
        .filter(item => item !== null);

      return cleanedItems.length
        ? cleanedItems
        : null;
    }

    if (
      value &&
      typeof value === "object"
    ) {
      const cleanedEntries =
        Object.entries(value)
          .map(
            ([
              key,
              entryValue,
            ]) => [
              key,
              omitNullFields(
                entryValue
              ),
            ]
          )
          .filter(
            ([
              ,
              entryValue,
            ]) => {
              return (
                entryValue !==
                null
              );
            }
          );

      return cleanedEntries.length
        ? Object.fromEntries(
            cleanedEntries
          )
        : null;
    }

    return value;
  }

  function isRealUserFrame() {
    try {
      const url =
        location.href.toLowerCase();

      return !(
        url.includes(
          "googleads"
        ) ||
        url.includes(
          "doubleclick"
        ) ||
        url.includes(
          "recaptcha"
        ) ||
        url.includes(
          "openx.net"
        ) ||
        url.includes(
          "google-bidout"
        ) ||
        url.includes(
          "googlesyndication"
        ) ||
        url.includes(
          "googleadservices"
        ) ||
        url.includes(
          "googletagservices"
        ) ||
        url.includes(
          "adservice.google"
        ) ||
        url.includes(
          "adnxs"
        ) ||
        url.includes(
          "rubiconproject"
        ) ||
        url.includes(
          "pubmatic"
        ) ||
        url.includes(
          "criteo"
        ) ||
        url.includes(
          "taboola"
        ) ||
        url.includes(
          "outbrain"
        )
      );
    } catch {
      return false;
    }
  }

  function getIframeSelector(el) {
    if (!el) {
      return "iframe";
    }

    if (el.id) {
      return `#${el.id}`;
    }

    if (el.name) {
      return (
        `[name="${el.name}"]`
      );
    }

    const title =
      el.getAttribute(
        "title"
      );

    if (title) {
      return (
        `iframe[title="${title}"]`
      );
    }

    const src =
      el.getAttribute(
        "src"
      );

    if (src) {
      try {
        return (
          `iframe[src*="` +
          `${
            new URL(
              src,
              location.href
            ).pathname
          }"]`
        );
      } catch {
        return (
          `iframe[src="${src}"]`
        );
      }
    }

    let nth = 1;
    let sibling = el;

    while (
      (
        sibling =
          sibling
            .previousElementSibling
      )
    ) {
      if (
        sibling.tagName ===
        "IFRAME"
      ) {
        nth += 1;
      }
    }

    return (
      `iframe:nth-of-type(${nth})`
    );
  }

  function getElementText(el) {
    return (
      el?.innerText
        ?.replace(
          /\s+/g,
          " "
        )
        .trim() ||
      ""
    );
  }

  function getShortText(el) {
    const text =
      getElementText(el);

    return (
      text &&
      text.length < 50
        ? text
        : ""
    );
  }

  function getLongTextSnippet(
    el
  ) {
    const text =
      getElementText(el);

    if (
      !text ||
      text.length < 50
    ) {
      return "";
    }

    const snippet =
      text.slice(
        0,
        40
      );

    const lastSpace =
      snippet.lastIndexOf(
        " "
      );

    return (
      lastSpace >= 12
        ? snippet.slice(
            0,
            lastSpace
          )
        : snippet
    ).trim();
  }

  function getChoiceInputNeighborText(
    el
  ) {
    if (
      !(
        el instanceof
        HTMLInputElement
      )
    ) {
      return "";
    }

    const type =
      getAttributeValue(
        el,
        "type"
      ).toLowerCase();

    if (
      type !== "radio" &&
      type !== "checkbox"
    ) {
      return "";
    }

    const labelText =
      getElementText(
        el.closest(
          "label"
        )
      );

    if (labelText) {
      return labelText.slice(
        0,
        120
      );
    }

    const labelledBy =
      getAttributeValue(
        el,
        "aria-labelledby"
      );

    if (labelledBy) {
      const text =
        labelledBy
          .split(/\s+/)
          .map(id => {
            return getElementText(
              document
                .getElementById(
                  id
                )
            );
          })
          .filter(Boolean)
          .join(" ");

      if (text) {
        return text.slice(
          0,
          120
        );
      }
    }

    const blockText =
      getElementText(
        el.closest(
          'tr, [role="row"], li, [role="option"], ' +
          '[data-row], [data-cy*="row" i], ' +
          '[data-testid*="row" i]'
        )
      );

    if (blockText) {
      return blockText.slice(
        0,
        120
      );
    }

    let current =
      el.parentElement;

    for (
      let depth = 0;
      current &&
      depth < 4;
      depth += 1,
      current =
        current.parentElement
    ) {
      const text =
        getElementText(
          current
        );

      if (
        text &&
        text.length <= 120
      ) {
        return text;
      }
    }

    return "";
  }

  function getSelectorFriendlyTestId(
    el
  ) {
    const testId =
      el?.getAttribute?.(
        "data-testid"
      );

    if (testId) {
      return {
        attribute:
          "data-testid",

        value:
          testId,
      };
    }

    const dataTest =
      el?.getAttribute?.(
        "data-test"
      );

    if (dataTest) {
      return {
        attribute:
          "data-test",

        value:
          dataTest,
      };
    }

    const dataCy =
      el?.getAttribute?.(
        "data-cy"
      );

    if (dataCy) {
      return {
        attribute:
          "data-cy",

        value:
          dataCy,
      };
    }

    const dataLabel =
      el?.getAttribute?.(
        "data-label"
      );

    return dataLabel
      ? {
          attribute:
            "data-label",

          value:
            dataLabel,
        }
      : null;
  }

  function getSelectorFriendlyTooltip(
    el
  ) {
    const tooltip =
      el?.getAttribute?.(
        "x-tooltip"
      );

    return tooltip
      ? {
          attribute:
            "x-tooltip",

          value:
            tooltip,
        }
      : null;
  }

  function getSelectorFriendlyWireClick(
    el
  ) {
    const wireClick =
      el?.getAttribute?.(
        "wire:click"
      );

    return wireClick
      ? {
          attribute:
            "wire:click",

          value:
            wireClick,
        }
      : null;
  }

  function getTestIdXPathOptions(
    el
  ) {
    return [
      [
        "data-testid",
        getAttributeValue(
          el,
          "data-testid"
        ),
      ],
      [
        "data-test",
        getAttributeValue(
          el,
          "data-test"
        ),
      ],
      [
        "data-cy",
        getAttributeValue(
          el,
          "data-cy"
        ),
      ],
      [
        "data-label",
        getAttributeValue(
          el,
          "data-label"
        ),
      ],
      [
        "x-tooltip",
        getAttributeValue(
          el,
          "x-tooltip"
        ),
      ],
      [
        "wire:click",
        getAttributeValue(
          el,
          "wire:click"
        ),
      ],
    ].filter(
      ([
        ,
        value,
      ]) => value
    );
  }

  function getAttributeValue(
    el,
    attribute
  ) {
    return (
      el?.getAttribute?.(
        attribute
      ) ||
      ""
    );
  }

  function hasStrongNameSelector(
    el
  ) {
    const name =
      getAttributeValue(
        el,
        "name"
      ).trim();

    return (
      !!name &&
      name.length > 2 &&
      !WEAK_NAME_VALUES.has(
        name.toLowerCase()
      )
    );
  }

  function isLikelyDynamicValue(
    value
  ) {
    if (!value) {
      return true;
    }

    const trimmed =
      value.trim();

    return (
      !trimmed ||
      trimmed.length > 80 ||
      /[?&=#]/.test(
        trimmed
      ) ||
      /[0-9]{5,}/.test(
        trimmed
      ) ||
      /^[a-f0-9_-]{12,}$/i.test(
        trimmed
      )
    );
  }

  function isMeaningfulAttributeValue(
    attribute,
    value
  ) {
    const trimmed =
      String(
        value ||
        ""
      ).trim();

    if (!trimmed) {
      return false;
    }

    if (
      attribute ===
      "name"
    ) {
      return (
        trimmed.length > 2 &&
        !WEAK_NAME_VALUES.has(
          trimmed.toLowerCase()
        )
      );
    }

    if (
      attribute ===
      "id"
    ) {
      return (
        !WEAK_ID_VALUES.has(
          trimmed.toLowerCase()
        ) &&
        !isLikelyDynamicValue(
          trimmed
        )
      );
    }

    if (
      attribute ===
      "type"
    ) {
      return [
        "button",
        "submit",
        "checkbox",
        "radio",
        "email",
        "password",
      ].includes(
        trimmed.toLowerCase()
      );
    }

    return (
      !isLikelyDynamicValue(
        trimmed
      )
    );
  }

  function canUseTextForXPath(
    el
  ) {
    if (
      !(
        el instanceof
        Element
      )
    ) {
      return false;
    }

    if (
      TEXT_XPATH_TAGS.has(
        el.tagName
      )
    ) {
      return true;
    }

    const role =
      getAttributeValue(
        el,
        "role"
      );

    return [
      "button",
      "link",
      "menuitem",
      "tab",
      "option",
    ].includes(role);
  }

  function isAcceptableXPath(
    xpath
  ) {
    if (
      !xpath ||
      xpath.length > 160
    ) {
      return false;
    }

    return (
      xpath
        .split("/")
        .filter(Boolean)
        .length <= 5
    );
  }

  function joinXPath(
    anchor,
    scopedOrRelative
  ) {
    if (
      !anchor ||
      !scopedOrRelative
    ) {
      return "";
    }

    const joined =
      anchor +
      scopedOrRelative.slice(
        1
      );

    return isAcceptableXPath(
      joined
    )
      ? joined
      : "";
  }

  function getSelector(el) {
    if (!el) {
      return "";
    }

    el =
      getXPathFriendlyTarget(
        el
      );

    if (!el) {
      return "";
    }

    const tagName =
      el.tagName
        ?.toLowerCase?.() ||
      "";

    const preferredAncestor =
      el instanceof Element
        ? el.closest(
            'a, button, [role="button"], label, summary'
          )
        : null;

    if (
      preferredAncestor &&
      preferredAncestor !== el
    ) {
      const preferredXPath =
        getUniqueXPathAnchor(
          preferredAncestor
        );

      if (preferredXPath) {
        return (
          `xpath=${preferredXPath}`
        );
      }

      el =
        preferredAncestor;
    }

    if (
      [
        "HTML",
        "BODY",
      ].includes(
        el.tagName
      )
    ) {
      return "";
    }

    const listItemDataLabel =
      el.tagName === "LI"
        ? getAttributeValue(
            el,
            "data-label"
          )
        : "";

    if (listItemDataLabel) {
      return (
        `li[data-label="` +
        `${listItemDataLabel}"]`
      );
    }

    let choiceSelector = "";

    if (
      el instanceof
      HTMLInputElement
    ) {
      const type =
        getAttributeValue(
          el,
          "type"
        ).toLowerCase();

      if (
        type === "radio" ||
        type === "checkbox"
      ) {
        const name =
          getAttributeValue(
            el,
            "name"
          );

        const value =
          getAttributeValue(
            el,
            "value"
          );

        if (
          name &&
          value &&
          value !== "on"
        ) {
          choiceSelector =
            `input[name="${name}"]` +
            `[value="${value}"]`;
        } else if (
          name &&
          type
        ) {
          choiceSelector =
            `input[name="${name}"]` +
            `[type="${type}"]`;
        }
      }
    }

    if (choiceSelector) {
      return choiceSelector;
    }

    if (el.id) {
      return `#${el.id}`;
    }

    const testId =
      getSelectorFriendlyTestId(
        el
      );

    if (testId) {
      return (
        `[${testId.attribute}=` +
        `"${testId.value}"]`
      );
    }

    const tooltip =
      getSelectorFriendlyTooltip(
        el
      );

    const wireClick =
      getSelectorFriendlyWireClick(
        el
      );

    const attrPrefix =
      tagName ||
      "";

    if (
      tooltip &&
      wireClick
    ) {
      return (
        `${attrPrefix}` +
        `[${tooltip.attribute}="${tooltip.value}"]` +
        `[wire\\:click="${wireClick.value}"]`
      );
    }

    if (wireClick) {
      return (
        `${attrPrefix}` +
        `[${wireClick.attribute}="${wireClick.value}"]`
      );
    }

    const aria =
      getAttributeValue(
        el,
        "aria-label"
      );

    if (aria) {
      return (
        `[aria-label="${aria}"]`
      );
    }

    if (tooltip) {
      return (
        `${attrPrefix}` +
        `[${tooltip.attribute}="${tooltip.value}"]`
      );
    }

    const placeholder =
      getAttributeValue(
        el,
        "placeholder"
      );

    if (placeholder) {
      return (
        `[placeholder="${placeholder}"]`
      );
    }

    const title =
      getAttributeValue(
        el,
        "title"
      );

    if (title) {
      return (
        `[title="${title}"]`
      );
    }

    const role =
      getAttributeValue(
        el,
        "role"
      );

    const text =
      getShortText(el);

    if (
      role &&
      text
    ) {
      return (
        `role=${role}` +
        `[name="${text}"]`
      );
    }

    if (
      hasStrongNameSelector(
        el
      )
    ) {
      const type =
        getAttributeValue(
          el,
          "type"
        );

      return type
        ? (
            `${
              el.tagName
                .toLowerCase()
            }` +
            `[name="${el.name}"]` +
            `[type="${type}"]`
          )
        : (
            `[name="${el.name}"]`
          );
    }

    if (text) {
      return `text=${text}`;
    }

    const xpath =
      getRelativeXPath(el);

    return xpath
      ? `xpath=${xpath}`
      : getCssPath(el);
  }

  function getRelativeXPath(
    el
  ) {
    if (
      !(
        el instanceof
        Element
      )
    ) {
      return "";
    }

    const directAnchor =
      getUniqueXPathAnchor(
        el
      );

    if (directAnchor) {
      return directAnchor;
    }

    const stableAncestor =
      getStableAnchorAncestor(
        el
      );

    if (
      stableAncestor &&
      stableAncestor !== el
    ) {
      const stableAnchorXPath =
        getUniqueXPathAnchor(
          stableAncestor
        );

      if (stableAnchorXPath) {
        const scopedTarget =
          getUniqueScopedXPath(
            stableAncestor,
            el
          );

        if (scopedTarget) {
          return joinXPath(
            stableAnchorXPath,
            scopedTarget
          );
        }

        const anchoredPath =
          stableAnchorXPath +
          buildPathFromAncestor(
            stableAncestor,
            el
          );

        if (
          isAcceptableXPath(
            anchoredPath
          )
        ) {
          return anchoredPath;
        }
      }
    }

    let current = el;

    while (
      current &&
      current.nodeType ===
        Node.ELEMENT_NODE
    ) {
      const anchor =
        getUniqueXPathAnchor(
          current
        );

      if (anchor) {
        const scopedTarget =
          getUniqueScopedXPath(
            current,
            el
          );

        if (scopedTarget) {
          return joinXPath(
            anchor,
            scopedTarget
          );
        }

        let descendant = el;

        while (
          descendant &&
          descendant !==
            current
        ) {
          const scopedDescendant =
            getUniqueScopedXPath(
              current,
              descendant
            );

          if (scopedDescendant) {
            const joined =
              anchor +
              scopedDescendant.slice(
                1
              ) +
              buildPathFromAncestor(
                descendant,
                el
              );

            if (
              isAcceptableXPath(
                joined
              )
            ) {
              return joined;
            }
          }

          descendant =
            descendant
              .parentElement;
        }

        const anchoredPath =
          anchor +
          buildPathFromAncestor(
            current,
            el
          );

        if (
          isAcceptableXPath(
            anchoredPath
          )
        ) {
          return anchoredPath;
        }
      }

      current =
        current.parentElement;

      if (
        !current ||
        [
          "HTML",
          "BODY",
        ].includes(
          current.tagName
        )
      ) {
        break;
      }
    }

    current = el;

    while (
      current &&
      current.nodeType ===
        Node.ELEMENT_NODE
    ) {
      const candidate =
        getUniqueXPathAnchor(
          current
        );

      if (candidate) {
        const anchoredPath =
          candidate +
          buildPathFromAncestor(
            current,
            el
          );

        if (
          isAcceptableXPath(
            anchoredPath
          )
        ) {
          return anchoredPath;
        }
      }

      current =
        current.parentElement;
    }

    const steps = [];

    current = el;

    while (
      current &&
      current.nodeType ===
        Node.ELEMENT_NODE &&
      steps.length < 3
    ) {
      steps.unshift(
        buildXPathStep(
          current
        )
      );

      current =
        current.parentElement;

      if (
        !current ||
        [
          "HTML",
          "BODY",
        ].includes(
          current.tagName
        )
      ) {
        break;
      }
    }

    const fallbackPath =
      `//${steps.join("/")}`;

    return isAcceptableXPath(
      fallbackPath
    )
      ? fallbackPath
      : "";
  }

  function getCssPath(el) {
    if (
      !(
        el instanceof
        Element
      )
    ) {
      return "";
    }

    const cssPath = [];

    while (
      el &&
      el.nodeType ===
        Node.ELEMENT_NODE
    ) {
      let selector =
        el.nodeName
          .toLowerCase();

      if (el.id) {
        selector +=
          `#${el.id}`;

        cssPath.unshift(
          selector
        );

        break;
      }

      selector +=
        `:nth-of-type(` +
        `${getSiblingIndex(
          el
        )})`;

      cssPath.unshift(
        selector
      );

      el =
        el.parentElement;
    }

    return cssPath.join(
      " > "
    );
  }

  function getXPathFriendlyTarget(
    el
  ) {
    if (
      !(
        el instanceof
        Element
      )
    ) {
      return null;
    }

    if (isSvgElement(el)) {
      let current = el;

      while (
        current &&
        current.parentElement
      ) {
        current =
          current.parentElement;

        if (
          !isSvgElement(
            current
          )
        ) {
          return current;
        }
      }
    }

    return el;
  }

  function isSvgElement(el) {
    return (
      !!el &&
      typeof el.tagName ===
        "string" &&
      (
        el.tagName
          .toLowerCase() ===
          "svg" ||
        el.namespaceURI ===
          "http://www.w3.org/2000/svg"
      )
    );
  }

  function getActionableTarget(
    el
  ) {
    if (
      !(
        el instanceof
        Element
      )
    ) {
      return null;
    }

    const labelAncestor =
      el.closest(
        "label"
      );

    let labelControl = null;

    if (
      labelAncestor
        instanceof
        HTMLLabelElement
    ) {
      labelControl =
        labelAncestor.control
          instanceof Element
          ? labelAncestor.control
          : labelAncestor
              .querySelector(
                "input, textarea, select, button"
              );
    }

    if (labelControl) {
      const type =
        getAttributeValue(
          labelControl,
          "type"
        ).toLowerCase();

      if (
        [
          "checkbox",
          "radio",
          "button",
          "submit",
        ].includes(type) ||
        [
          "INPUT",
          "BUTTON",
          "SELECT",
          "TEXTAREA",
        ].includes(
          labelControl.tagName
        )
      ) {
        return labelControl;
      }
    }

    return el.closest(
      "a, button, input, textarea, select, option, summary, " +
      'li[data-label], li[role="option"], [role="option"], ' +
      '[role="menuitem"], [role="listitem"], [role="button"], ' +
      '[role="link"], [role="checkbox"], [role="radio"], ' +
      '[role="tab"], [role="switch"]'
    );
  }

  function isUsefulContainer(
    el
  ) {
    return (
      el instanceof Element &&
      (
        ANCHOR_TAGS.has(
          el.tagName
        ) ||
        isMeaningfulAttributeValue(
          "id",
          el.id
        ) ||
        !!getSelectorFriendlyTestId(
          el
        ) ||
        !!getSelectorFriendlyTooltip(
          el
        ) ||
        !!getSelectorFriendlyWireClick(
          el
        ) ||
        isMeaningfulAttributeValue(
          "aria-label",
          getAttributeValue(
            el,
            "aria-label"
          )
        ) ||
        isMeaningfulAttributeValue(
          "title",
          getAttributeValue(
            el,
            "title"
          )
        ) ||
        hasStrongNameSelector(
          el
        )
      )
    );
  }

  function getStableAnchorAncestor(
    el
  ) {
    let current = el;

    while (
      current &&
      current.nodeType ===
        Node.ELEMENT_NODE
    ) {
      if (
        isUsefulContainer(
          current
        )
      ) {
        return current;
      }

      current =
        current.parentElement;

      if (
        !current ||
        [
          "HTML",
          "BODY",
        ].includes(
          current.tagName
        )
      ) {
        break;
      }
    }

    return null;
  }

  function escapeXPathLiteral(
    value
  ) {
    if (
      !value.includes('"')
    ) {
      return `"${value}"`;
    }

    if (
      !value.includes("'")
    ) {
      return `'${value}'`;
    }

    return (
      "concat(" +
      value
        .split('"')
        .map(part => {
          return `"${part}"`;
        })
        .join(
          ", '\"', "
        ) +
      ")"
    );
  }

  function getSiblingIndex(
    el
  ) {
    let nth = 1;
    let sibling = el;

    while (
      (
        sibling =
          sibling
            .previousElementSibling
      )
    ) {
      if (
        sibling.tagName ===
        el.tagName
      ) {
        nth += 1;
      }
    }

    return nth;
  }

  function isUniqueXPath(
    xpath,
    el
  ) {
    try {
      const result =
        document.evaluate(
          xpath,
          document,
          null,
          XPathResult
            .ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );

      return (
        result.snapshotLength ===
          1 &&
        result.snapshotItem(
          0
        ) === el
      );
    } catch {
      return false;
    }
  }

  function getUniqueXPathByAttribute(
    el,
    attributes,
    prefix = "//"
  ) {
    for (
      const attribute of
      attributes
    ) {
      const options =
        attribute ===
        "data-testid"
          ? getTestIdXPathOptions(
              el
            )
          : [
              [
                attribute,
                getAttributeValue(
                  el,
                  attribute
                ),
              ],
            ];

      for (
        const [
          attributeName,
          value,
        ] of options
      ) {
        if (
          !isMeaningfulAttributeValue(
            attributeName,
            value
          ) ||
          !value
        ) {
          continue;
        }

        const xpath =
          `${prefix}` +
          `${
            el.tagName
              .toLowerCase()
          }` +
          `[@${attributeName}=` +
          `${escapeXPathLiteral(
            value
          )}]`;

        if (
          xpath &&
          isAcceptableXPath(
            xpath
          ) &&
          isUniqueXPath(
            xpath,
            el
          )
        ) {
          return xpath;
        }
      }
    }

    return "";
  }

  function getUniqueXPathAnchor(
    el
  ) {
    const attributeMatch =
      getUniqueXPathByAttribute(
        el,
        SELECTOR_ATTRS
      );

    if (attributeMatch) {
      return attributeMatch;
    }

    const extendedAttributeMatch =
      getUniqueXPathByAttribute(
        el,
        [
          "title",
          "type",
        ]
      );

    if (
      extendedAttributeMatch
    ) {
      return (
        extendedAttributeMatch
      );
    }

    const tag =
      el.tagName
        .toLowerCase();

    const text =
      getShortText(el);

    if (
      text &&
      canUseTextForXPath(
        el
      )
    ) {
      const xpath =
        `//${tag}` +
        `[normalize-space(.)=` +
        `${escapeXPathLiteral(
          text
        )}]`;

      if (
        isAcceptableXPath(
          xpath
        ) &&
        isUniqueXPath(
          xpath,
          el
        )
      ) {
        return xpath;
      }
    }

    const longTextSnippet =
      getLongTextSnippet(
        el
      );

    if (
      longTextSnippet &&
      canUseTextForXPath(
        el
      )
    ) {
      const xpath =
        `//${tag}` +
        `[contains(normalize-space(.), ` +
        `${escapeXPathLiteral(
          longTextSnippet
        )})]`;

      if (
        isAcceptableXPath(
          xpath
        ) &&
        isUniqueXPath(
          xpath,
          el
        )
      ) {
        return xpath;
      }
    }

    return "";
  }

  function getXPathCandidates(
    el,
    prefix = "//"
  ) {
    if (
      !(
        el instanceof
        Element
      )
    ) {
      return [];
    }

    const tag =
      el.tagName
        .toLowerCase();

    const candidates = [];

    const push = predicate => {
      if (!predicate) {
        return;
      }

      const xpath =
        `${prefix}${tag}` +
        `[${predicate}]`;

      if (
        !candidates.includes(
          xpath
        )
      ) {
        candidates.push(
          xpath
        );
      }
    };

    for (
      const attribute of
      XPATH_CANDIDATE_ATTRS
    ) {
      const options =
        attribute ===
        "data-testid"
          ? getTestIdXPathOptions(
              el
            )
          : [
              [
                attribute,
                getAttributeValue(
                  el,
                  attribute
                ),
              ],
            ];

      for (
        const [
          attributeName,
          value,
        ] of options
      ) {
        if (
          !isMeaningfulAttributeValue(
            attributeName,
            value
          ) ||
          !value
        ) {
          continue;
        }

        const xpath =
          `${prefix}${tag}` +
          `[@${attributeName}=` +
          `${escapeXPathLiteral(
            value
          )}]`;

        if (
          !candidates.includes(
            xpath
          )
        ) {
          candidates.push(
            xpath
          );
        }
      }
    }

    const text =
      getShortText(el);

    if (
      text &&
      canUseTextForXPath(
        el
      )
    ) {
      push(
        `normalize-space(.)=` +
        `${escapeXPathLiteral(
          text
        )}`
      );
    }

    const longTextSnippet =
      getLongTextSnippet(
        el
      );

    if (
      longTextSnippet &&
      canUseTextForXPath(
        el
      )
    ) {
      push(
        `contains(normalize-space(.), ` +
        `${escapeXPathLiteral(
          longTextSnippet
        )})`
      );
    }

    return candidates;
  }

  function isUniqueXPathInScope(
    xpath,
    scopeEl,
    el
  ) {
    try {
      const result =
        document.evaluate(
          xpath,
          scopeEl,
          null,
          XPathResult
            .ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );

      return (
        result.snapshotLength ===
          1 &&
        result.snapshotItem(
          0
        ) === el
      );
    } catch {
      return false;
    }
  }

  function getUniqueScopedXPath(
    scopeEl,
    el
  ) {
    const candidates =
      getXPathCandidates(
        el,
        ".//"
      );

    for (
      const xpath of
      candidates
    ) {
      if (
        isAcceptableXPath(
          xpath
        ) &&
        isUniqueXPathInScope(
          xpath,
          scopeEl,
          el
        )
      ) {
        return xpath;
      }
    }

    return "";
  }

  function buildXPathStep(
    el
  ) {
    const tag =
      el.tagName
        .toLowerCase();

    const attributeStep =
      getUniqueXPathByAttribute(
        el,
        XPATH_CANDIDATE_ATTRS,
        ""
      );

    if (attributeStep) {
      return (
        attributeStep.replace(
          /^\/\//,
          ""
        )
      );
    }

    const text =
      getShortText(el);

    if (
      text &&
      canUseTextForXPath(
        el
      )
    ) {
      const matches =
        Array.from(
          el.parentElement
            ?.children ||
          []
        ).filter(child => {
          return (
            child.tagName ===
              el.tagName &&
            getShortText(
              child
            ) === text
          );
        });

      if (
        matches.length === 1
      ) {
        return (
          `${tag}` +
          `[normalize-space(.)=` +
          `${escapeXPathLiteral(
            text
          )}]`
        );
      }
    }

    const longTextSnippet =
      getLongTextSnippet(
        el
      );

    if (
      longTextSnippet &&
      canUseTextForXPath(
        el
      )
    ) {
      const matches =
        Array.from(
          el.parentElement
            ?.children ||
          []
        ).filter(child => {
          return (
            child.tagName ===
              el.tagName &&
            getElementText(
              child
            ).includes(
              longTextSnippet
            )
          );
        });

      if (
        matches.length === 1
      ) {
        return (
          `${tag}` +
          `[contains(normalize-space(.), ` +
          `${escapeXPathLiteral(
            longTextSnippet
          )})]`
        );
      }
    }

    const name =
      getAttributeValue(
        el,
        "name"
      );

    if (name) {
      return (
        `${tag}[@name=` +
        `${escapeXPathLiteral(
          name
        )}]`
      );
    }

    const type =
      getAttributeValue(
        el,
        "type"
      );

    if (type) {
      const matches =
        Array.from(
          el.parentElement
            ?.children ||
          []
        ).filter(child => {
          return (
            child.tagName ===
              el.tagName &&
            getAttributeValue(
              child,
              "type"
            ) === type
          );
        });

      if (
        matches.length === 1
      ) {
        return (
          `${tag}[@type=` +
          `${escapeXPathLiteral(
            type
          )}]`
        );
      }
    }

    return (
      `${tag}` +
      `[${getSiblingIndex(
        el
      )}]`
    );
  }

  function buildPathFromAncestor(
    ancestor,
    target
  ) {
    const steps = [];

    let current =
      target;

    while (
      current &&
      current !== ancestor
    ) {
      steps.unshift(
        buildXPathStep(
          current
        )
      );

      current =
        current.parentElement;
    }

    return steps.length
      ? `/${steps.join("/")}`
      : "";
  }

  function getElementAttributes(
    el
  ) {
    if (!el) {
      return {};
    }

    const type =
      el.getAttribute?.(
        "type"
      ) ||
      "";

    return {
      tagName:
        el.tagName
          ?.toLowerCase() ||
        null,

      id:
        el.id ||
        null,

      name:
        el.getAttribute?.(
          "name"
        ) ||
        null,

      type:
        type ||
        null,

      value:
        [
          "checkbox",
          "radio",
        ].includes(type)
          ? (
              el.getAttribute?.(
                "value"
              ) ||
              null
            )
          : null,

      neighborText:
        getChoiceInputNeighborText(
          el
        ) ||
        null,

      href:
        el.getAttribute?.(
          "href"
        ) ||
        null,

      role:
        el.getAttribute?.(
          "role"
        ) ||
        null,

      ariaLabel:
        el.getAttribute?.(
          "aria-label"
        ) ||
        null,

      xTooltip:
        el.getAttribute?.(
          "x-tooltip"
        ) ||
        null,

      wireClick:
        el.getAttribute?.(
          "wire:click"
        ) ||
        null,

      testId:
        el.getAttribute?.(
          "data-testid"
        ) ||
        null,

      dataTest:
        el.getAttribute?.(
          "data-test"
        ) ||
        null,

      dataCy:
        el.getAttribute?.(
          "data-cy"
        ) ||
        null,

      dataLabel:
        el.getAttribute?.(
          "data-label"
        ) ||
        null,

      placeholder:
        el.getAttribute?.(
          "placeholder"
        ) ||
        null,
    };
  }

  function prepareAction(
    data
  ) {
    const frameChain = [];

    try {
      let win = window;

      while (
        win !== win.top
      ) {
        const parent =
          win.parent;

        const iframeEl =
          Array.from(
            parent.document
              .querySelectorAll(
                "iframe"
              )
          ).find(frame => {
            try {
              return (
                frame.contentWindow ===
                win
              );
            } catch {
              return false;
            }
          });

        frameChain.unshift(
          iframeEl
            ? getIframeSelector(
                iframeEl
              )
            : "iframe(unknown)"
        );

        win = parent;
      }
    } catch {
      // Cross-origin frame boundary.
    }

    const shadowHosts = [];

    if (data.elementHandle) {
      try {
        let current =
          data.elementHandle;

        while (current) {
          const root =
            current.getRootNode &&
            current.getRootNode();

          if (
            !root ||
            !root.host
          ) {
            break;
          }

          shadowHosts.unshift(
            getSelector(
              root.host
            )
          );

          current =
            root.host;
        }
      } catch {
        // Ignore shadow traversal failures.
      }
    }

    const enriched =
      Object.assign(
        {},
        data,
        {
          frameChain,

          isIframe:
            frameChain.length >
            0,

          shadowHosts:
            shadowHosts.filter(
              Boolean
            ),

          isShadowDom:
            shadowHosts.length >
            0,
        }
      );

    delete (
      enriched.elementHandle
    );

    return omitNullFields(
      enriched
    );
  }

  function dispatch(data) {
    const sanitized =
      prepareAction(data);

    if (
      typeof window
        .__captureAction ===
      "function"
    ) {
      return Promise.resolve(
        window.__captureAction(
          sanitized
        )
      );
    }

    try {
      window.top.postMessage(
        {
          __pwAction:
            true,

          data:
            sanitized,
        },
        "*"
      );

      return Promise.resolve({
        accepted:
          true,

        forwarded:
          true,
      });
    } catch {
      return Promise.resolve({
        accepted:
          false,

        reason:
          "__captureAction binding is unavailable",
      });
    }
  }

  if (
    window === window.top &&
    !window
      .__PW_ACTION_MESSAGE_LISTENER_INSTALLED__
  ) {
    window
      .__PW_ACTION_MESSAGE_LISTENER_INSTALLED__ =
      true;

    window.addEventListener(
      "message",
      event => {
        if (
          event.source ===
            window ||
          !event.data ||
          !event.data
            .__pwAction ||
          typeof window
            .__captureAction !==
            "function"
        ) {
          return;
        }

        const action =
          event.data.data;

        if (
          action?.action ===
            "click" &&
          action?.xpathKey
        ) {
          if (
            recordedClickXPaths.has(
              action.xpathKey
            )
          ) {
            console.warn(
              [
                "[recorder]",
                "Duplicate forwarded XPath ignored.",
                `xpath=${action.xpathKey}`,
              ].join(" ")
            );

            return;
          }

          recordedClickXPaths.set(
            action.xpathKey,
            {
              status:
                "forwarded",

              createdAt:
                Date.now(),
            }
          );
        }

        window.__captureAction(
          action
        );
      }
    );
  }

  let inputTimer;
  let scrollTimer;
  let actionSequence = 0;
  let pendingPointerClick =
    null;

  const POINTER_CLICK_MAX_AGE_MS =
    1500;

  const NORMAL_CLICK_MAX_DEPTH =
    5;

  const PRIMARY_NORMALIZE_MAX_DEPTH =
    10;

  function getPriorityXPathCandidates(
    el
  ) {
    const tag =
      getXPathTag(el);

    const candidates = [];

    const priorityAttrs = [
      "id",
      "data-testid",
      "data-test",
      "data-qa",
      "data-cy",
      "aria-label",
      "aria-labelledby",
      "name",
      "placeholder",
      "title",
      "href",
      "role",
      "type",
    ];

    for (
      const attr of
      priorityAttrs
    ) {
      const value =
        el.getAttribute?.(
          attr
        );

      if (value) {
        candidates.push(
          `//${tag}` +
          `[@${attr}=` +
          `${xpathLiteral(
            value
          )}]`
        );
      }
    }

    const text =
      (
        el.textContent ||
        ""
      )
        .trim()
        .replace(
          /\s+/g,
          " "
        );

    if (
      text &&
      text.length <= 80
    ) {
      candidates.push(
        `//${tag}` +
        `[normalize-space(.)=` +
        `${xpathLiteral(
          text
        )}]`
      );
    }

    return Array.from(
      new Set(
        candidates
      )
    );
  }

  function getNormalClickXPath(
    el
  ) {
    if (
      !(
        el instanceof
        Element
      )
    ) {
      return "";
    }

    let anchor = el;

    for (
      let depth = 0;
      anchor &&
      anchor.nodeType ===
        Node.ELEMENT_NODE &&
      depth <=
        NORMAL_CLICK_MAX_DEPTH;
      depth += 1
    ) {
      if (
        anchor.tagName ===
          "HTML" ||
        anchor.tagName ===
          "BODY"
      ) {
        break;
      }

      const anchorCandidates =
        getPriorityXPathCandidates(
          anchor
        );

      for (
        const anchorXPath of
        anchorCandidates
      ) {
        if (
          !matchesOnlyElement(
            anchorXPath,
            anchor
          )
        ) {
          continue;
        }

        if (
          anchor === el
        ) {
          return anchorXPath;
        }

        const childPath =
          getIndexedPathFromAncestor(
            anchor,
            el
          );

        if (!childPath) {
          continue;
        }

        const finalXPath =
          `${anchorXPath}${childPath}`;

        if (
          matchesOnlyElement(
            finalXPath,
            el
          )
        ) {
          return finalXPath;
        }
      }

      anchor =
        anchor.parentElement;
    }

    const fallbackParts = [];

    let current = el;

    while (
      current &&
      current.nodeType ===
        Node.ELEMENT_NODE
    ) {
      fallbackParts.unshift(
        getIndexedXPathSegment(
          current
        )
      );

      current =
        current.parentElement;
    }

    const fallbackXPath =
      `/${fallbackParts.join(
        "/"
      )}`;

    return matchesOnlyElement(
      fallbackXPath,
      el
    )
      ? fallbackXPath
      : "";
  }

  function getIndexedPathFromAncestor(
    ancestor,
    el
  ) {
    const parts = [];

    let current = el;

    while (
      current &&
      current !== ancestor
    ) {
      parts.unshift(
        getIndexedXPathSegment(
          current
        )
      );

      current =
        current.parentElement;
    }

    if (
      current !== ancestor ||
      !parts.length
    ) {
      return "";
    }

    return (
      `/${parts.join("/")}`
    );
  }

  function getIndexedXPathSegment(
    el
  ) {
    const tag =
      getXPathTag(el);

    if (!el.parentElement) {
      return `${tag}[1]`;
    }

    const siblings =
      Array.from(
        el.parentElement
          .children
      ).filter(child => {
        return (
          child.localName ===
            el.localName &&
          child.namespaceURI ===
            el.namespaceURI
        );
      });

    return (
      `${tag}[` +
      `${
        siblings.indexOf(
          el
        ) + 1
      }]`
    );
  }

  function matchesOnlyElement(
    xpath,
    targetEl
  ) {
    try {
      const doc =
        targetEl
          ?.ownerDocument ||
        document;

      const result =
        doc.evaluate(
          xpath,
          doc,
          null,
          XPathResult
            .ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );

      return (
        result.snapshotLength ===
          1 &&
        result.snapshotItem(
          0
        ) === targetEl
      );
    } catch {
      return false;
    }
  }

  function getXPathTag(el) {
    const tag =
      el.localName ||
      el.tagName
        .toLowerCase();

    return (
      el.namespaceURI ===
      "http://www.w3.org/2000/svg"
    )
      ? (
          `*[local-name()=` +
          `${xpathLiteral(
            tag
          )}]`
        )
      : tag;
  }

  function xpathLiteral(
    value
  ) {
    value =
      String(value);

    if (
      !value.includes("'")
    ) {
      return `'${value}'`;
    }

    if (
      !value.includes('"')
    ) {
      return `"${value}"`;
    }

    return (
      "concat(" +
      value
        .split("'")
        .map(part => {
          return `'${part}'`;
        })
        .join(
          ', "\'", '
        ) +
      ")"
    );
  }

  function getFrameInfo() {
    return {
      frameUrl:
        window.location.href,

      isTopFrame:
        window.top ===
        window.self,
    };
  }

  function getElementFingerprint(
    el
  ) {
    if (
      !el ||
      !el.tagName
    ) {
      return null;
    }

    return {
      tag:
        el.localName ||
        el.tagName
          .toLowerCase(),

      text:
        (
          el.textContent ||
          ""
        )
          .trim()
          .replace(
            /\s+/g,
            " "
          )
          .slice(
            0,
            150
          ),

      ariaLabel:
        el.getAttribute(
          "aria-label"
        ),

      role:
        el.getAttribute(
          "role"
        ),

      title:
        el.getAttribute(
          "title"
        ),

      type:
        el.getAttribute(
          "type"
        ),

      name:
        el.getAttribute(
          "name"
        ),
    };
  }

  function getPrimaryNormalizeXPath(
    el
  ) {
    if (
      !(
        el instanceof
        Element
      )
    ) {
      return "";
    }

    let anchor = el;

    for (
      let depth = 0;
      anchor &&
      anchor.nodeType ===
        Node.ELEMENT_NODE &&
      depth <
        PRIMARY_NORMALIZE_MAX_DEPTH;
      depth += 1
    ) {
      if (
        anchor.tagName ===
          "HTML" ||
        anchor.tagName ===
          "BODY"
      ) {
        break;
      }

      const text =
        (
          anchor.textContent ||
          ""
        )
          .trim()
          .replace(
            /\s+/g,
            " "
          );

      if (
        text &&
        text.length <= 80
      ) {
        const anchorXPath =
          `//${getXPathTag(
            anchor
          )}` +
          `[normalize-space(.)=` +
          `${xpathLiteral(
            text
          )}]`;

        if (
          matchesOnlyElement(
            anchorXPath,
            anchor
          )
        ) {
          if (
            anchor === el
          ) {
            return anchorXPath;
          }

          const childPath =
            getIndexedPathFromAncestor(
              anchor,
              el
            );

          if (childPath) {
            const finalXPath =
              `${anchorXPath}${childPath}`;

            if (
              matchesOnlyElement(
                finalXPath,
                el
              )
            ) {
              return finalXPath;
            }
          }
        }
      }

      anchor =
        anchor.parentElement;
    }

    return "";
  }

  function getHardcodedBackupXPath(
    el
  ) {
    if (
      !(
        el instanceof
        Element
      )
    ) {
      return "";
    }

    const doc =
      el.ownerDocument ||
      document;

    const baseXPath =
      `//${getXPathTag(
        el
      )}`;

    let result;

    try {
      result =
        doc.evaluate(
          baseXPath,
          doc,
          null,
          XPathResult
            .ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
    } catch {
      return "";
    }

    for (
      let index = 0;
      index <
        result.snapshotLength;
      index += 1
    ) {
      if (
        result.snapshotItem(
          index
        ) === el
      ) {
        const backupXPath =
          `(${baseXPath})` +
          `[${index + 1}]`;

        return matchesOnlyElement(
          backupXPath,
          el
        )
          ? backupXPath
          : "";
      }
    }

    return "";
  }

  function getInnermostActionableTarget(
    event,
    fallbackElement = null
  ) {
    const eventPath =
      typeof event
        .composedPath ===
      "function"
        ? event.composedPath()
        : [];

    for (
      const pathItem of
      eventPath
    ) {
      if (
        !(
          pathItem instanceof
          Element
        )
      ) {
        continue;
      }

      if (
        pathItem.tagName
          ?.toLowerCase() ===
        "x-pw-glass"
      ) {
        continue;
      }

      const friendlyTarget =
        getXPathFriendlyTarget(
          pathItem
        );

      if (!friendlyTarget) {
        continue;
      }

      const actionableTarget =
        getActionableTarget(
          friendlyTarget
        );

      if (actionableTarget) {
        return actionableTarget;
      }
    }

    if (
      fallbackElement
        instanceof
        Element
    ) {
      const friendlyFallback =
        getXPathFriendlyTarget(
          fallbackElement
        );

      if (friendlyFallback) {
        return (
          getActionableTarget(
            friendlyFallback
          ) ||
          friendlyFallback
        );
      }
    }

    return null;
  }

  function createValidatedClickSnapshot(
    event,
    rawEl,
    inputMethod
  ) {
    const el =
      getInnermostActionableTarget(
        event,
        rawEl
      );

    if (
      !el ||
      !el.tagName ||
      !el.isConnected
    ) {
      return null;
    }

    const tag =
      el.localName ||
      el.tagName
        .toLowerCase();

    if (
      tag === "html" ||
      tag === "body"
    ) {
      return null;
    }

    const normalXPath =
      getNormalClickXPath(
        el
      );

    if (!normalXPath) {
      console.warn(
        "Could not generate normal XPath selector before click:",
        el
      );

      return null;
    }

    const backupXPath =
      getHardcodedBackupXPath(
        el
      );

    if (!backupXPath) {
      console.warn(
        "Could not generate backup_xpath before click:",
        el
      );

      return null;
    }

    const primaryXPath =
      getPrimaryNormalizeXPath(
        el
      ) ||
      backupXPath;

    if (
      !matchesOnlyElement(
        normalXPath,
        el
      ) ||
      !matchesOnlyElement(
        primaryXPath,
        el
      ) ||
      !matchesOnlyElement(
        backupXPath,
        el
      )
    ) {
      console.warn(
        "Pre-click XPath validation failed:",
        {
          normalXPath,
          primaryXPath,
          backupXPath,
          element:
            el,
        }
      );

      return null;
    }

    const text =
      el.textContent
        ?.trim()
        ?.replace(
          /\s+/g,
          " "
        )
        .slice(
          0,
          100
        ) ||
      null;

    return {
      target:
        el,

      inputMethod,

      normalXPath,

      selector:
        `xpath=${normalXPath}`,

      primaryXPath,

      backupXPath,

      text,

      element:
        getElementAttributes(
          el
        ),

      fingerprint:
        getElementFingerprint(
          el
        ),
    };
  }

  function isStoredClickSnapshotValid(
    snapshot
  ) {
    if (
      !snapshot ||
      !(
        snapshot.target
          instanceof
          Element
      ) ||
      !snapshot.target
        .isConnected
    ) {
      return false;
    }

    return (
      matchesOnlyElement(
        snapshot.normalXPath,
        snapshot.target
      ) &&
      matchesOnlyElement(
        snapshot.primaryXPath,
        snapshot.target
      ) &&
      matchesOnlyElement(
        snapshot.backupXPath,
        snapshot.target
      )
    );
  }

  /*
   * This is the requested dedupe key.
   *
   * When an HTML id exists:
   *
   *   xpath=//button[@id='continue']
   *
   * Otherwise:
   *
   *   xpath=<normal generated XPath>
   */
  function createClickXPathKey(
    snapshot
  ) {
    const target =
      snapshot?.target;

    if (
      !target ||
      !snapshot?.normalXPath
    ) {
      return "";
    }

    const elementId =
      target.getAttribute?.(
        "id"
      );

    if (elementId) {
      const tag =
        getXPathTag(
          target
        );

      return (
        `xpath=//${tag}` +
        `[@id=` +
        `${xpathLiteral(
          elementId
        )}]`
      );
    }

    return (
      `xpath=${snapshot.normalXPath}`
    );
  }

  document.addEventListener(
    "pointerdown",
    event => {
      try {
        if (
          event.isTrusted ===
            false ||
          event.button !== 0 ||
          !isRealUserFrame()
        ) {
          pendingPointerClick =
            null;

          return;
        }

        const rawEl =
          event.composedPath
            ? event
                .composedPath()[0]
            : event.target;

        if (
          !rawEl ||
          !rawEl.tagName ||
          rawEl.tagName
            .toLowerCase() ===
            "x-pw-glass"
        ) {
          pendingPointerClick =
            null;

          return;
        }

        const snapshot =
          createValidatedClickSnapshot(
            event,
            rawEl,
            "pointer"
          );

        if (!snapshot) {
          pendingPointerClick =
            null;

          return;
        }

        pendingPointerClick = {
          ...snapshot,

          timeStamp:
            Number.isFinite(
              event.timeStamp
            )
              ? event.timeStamp
              : performance.now(),
        };
      } catch (error) {
        pendingPointerClick =
          null;

        console.warn(
          "Pointerdown capture failed:",
          error
        );
      }
    },
    true
  );

  document.addEventListener(
    "pointercancel",
    () => {
      pendingPointerClick =
        null;
    },
    true
  );

  document.addEventListener(
    "click",
    event => {
      let xpathKey =
        "";

      try {
        if (
          event.isTrusted ===
            false ||
          !isRealUserFrame()
        ) {
          return;
        }

        let clickSnapshot =
          null;

        if (
          pendingPointerClick
        ) {
          const pointerClick =
            pendingPointerClick;

          pendingPointerClick =
            null;

          const eventTimeStamp =
            Number.isFinite(
              event.timeStamp
            )
              ? event.timeStamp
              : performance.now();

          if (
            Math.abs(
              eventTimeStamp -
              pointerClick
                .timeStamp
            ) >
            POINTER_CLICK_MAX_AGE_MS
          ) {
            return;
          }

          const clickRawEl =
            event.composedPath
              ? event
                  .composedPath()[0]
              : event.target;

          const clickTarget =
            getInnermostActionableTarget(
              event,
              clickRawEl
            );

          if (
            clickTarget !==
            pointerClick.target
          ) {
            console.warn(
              "Pointerdown and click resolved to different elements:",
              {
                pointerdownTarget:
                  pointerClick
                    .target,

                clickTarget,
              }
            );

            return;
          }

          clickSnapshot =
            pointerClick;
        } else if (
          event.detail === 0
        ) {
          const rawEl =
            event.composedPath
              ? event
                  .composedPath()[0]
              : event.target;

          if (
            !rawEl ||
            !rawEl.tagName ||
            rawEl.tagName
              .toLowerCase() ===
              "x-pw-glass"
          ) {
            return;
          }

          clickSnapshot =
            createValidatedClickSnapshot(
              event,
              rawEl,
              "keyboard"
            );
        } else {
          return;
        }

        if (!clickSnapshot) {
          return;
        }

        if (
          !isStoredClickSnapshotValid(
            clickSnapshot
          )
        ) {
          console.warn(
            "Stored pre-click XPath values no longer point to the exact clicked element:",
            {
              selector:
                clickSnapshot
                  .selector,

              primaryXPath:
                clickSnapshot
                  .primaryXPath,

              backupXPath:
                clickSnapshot
                  .backupXPath,

              element:
                clickSnapshot
                  .target,
            }
          );

          return;
        }

        /*
         * Build the ID-based XPath key.
         */
        xpathKey =
          createClickXPathKey(
            clickSnapshot
          );

        if (!xpathKey) {
          console.warn(
            "[click-recorder] Could not create XPath dedupe key."
          );

          return;
        }

        /*
         * Average O(1).
         *
         * Once the XPath exists in the Map, do not include it again.
         */
        if (
          !reserveClickXPath(
            xpathKey
          )
        ) {
          console.warn(
            [
              "[click-recorder]",
              "XPath already exists in Map. Click ignored.",
              `xpath=${xpathKey}`,
            ].join(" ")
          );

          return;
        }

        const el =
          clickSnapshot.target;

        const selector =
          clickSnapshot.selector;

        const primaryXPath =
          clickSnapshot
            .primaryXPath;

        const backupXPath =
          clickSnapshot
            .backupXPath;

        const text =
          clickSnapshot.text;

        const element =
          clickSnapshot.element;

        const fingerprint =
          clickSnapshot
            .fingerprint;

        const inputMethod =
          clickSnapshot
            .inputMethod;

        const sequence =
          ++actionSequence;

        /*
         * The click ID is also based on the XPath Map key.
         */
        const clickId =
          xpathKey;

        const capturedAction =
          prepareAction({
            action:
              "click",

            clickId,

            xpathKey,

            sequence,

            selector,

            primary_xpath:
              primaryXPath,

            backup_xpath:
              backupXPath,

            elementHandle:
              el,

            text,

            element,
          });

        const job = {
          clickId,

          xpathKey,

          sequence,

          action:
            "click",

          url:
            window.location.href,

          frameInfo:
            getFrameInfo(),

          selector,

          primary_xpath:
            primaryXPath,

          backup_xpath:
            backupXPath,

          preClickValidated:
            true,

          fingerprint,

          text,

          element,

          capturedAction,

          clickEvent: {
            inputMethod,

            detail:
              Number.isFinite(
                event.detail
              )
                ? event.detail
                : 0,

            button:
              Number.isFinite(
                event.button
              )
                ? event.button
                : 0,

            clientX:
              Number.isFinite(
                event.clientX
              )
                ? event.clientX
                : null,

            clientY:
              Number.isFinite(
                event.clientY
              )
                ? event.clientY
                : null,

            altKey:
              !!event.altKey,

            ctrlKey:
              !!event.ctrlKey,

            metaKey:
              !!event.metaKey,

            shiftKey:
              !!event.shiftKey,
          },
        };

        if (
          typeof window
            .__captureClickAction ===
          "function"
        ) {
          window
            .__captureClickAction(
              job
            )
            .then(result => {
              if (
                result
                  ?.duplicate
              ) {
                markClickXPathSaved(
                  xpathKey
                );

                console.warn(
                  [
                    "[click-recorder]",
                    "Backend rejected duplicate XPath.",
                    `xpath=${xpathKey}`,
                  ].join(" ")
                );

                return;
              }

              if (
                result &&
                result.accepted ===
                  false
              ) {
                /*
                 * The write failed, so allow this XPath to be tried again.
                 */
                releaseClickXPath(
                  xpathKey
                );

                console.warn(
                  "Click was not recorded:",
                  result
                );

                return;
              }

              markClickXPathSaved(
                xpathKey
              );
            })
            .catch(error => {
              releaseClickXPath(
                xpathKey
              );

              console.warn(
                "Click capture failed:",
                error
              );
            });

          return;
        }

        dispatch(
          capturedAction
        )
          .then(result => {
            if (
              result &&
              result.accepted ===
                false
            ) {
              releaseClickXPath(
                xpathKey
              );

              console.warn(
                "Click dispatch was rejected:",
                result
              );

              return;
            }

            markClickXPathSaved(
              xpathKey
            );
          })
          .catch(error => {
            releaseClickXPath(
              xpathKey
            );

            console.warn(
              "Click dispatch failed:",
              error
            );
          });
      } catch (error) {
        if (xpathKey) {
          releaseClickXPath(
            xpathKey
          );
        }

        console.warn(
          "Click capture failed:",
          error
        );
      }
    },
    true
  );

  document.addEventListener(
    "input",
    event => {
      clearTimeout(
        inputTimer
      );

      const el =
        event.composedPath
          ? event
              .composedPath()[0]
          : event.target;

      if (
        !el ||
        ![
          "INPUT",
          "TEXTAREA",
        ].includes(
          el.tagName
        ) ||
        !isRealUserFrame()
      ) {
        return;
      }

      inputTimer =
        setTimeout(
          () => {
            const selector =
              getSelector(el);

            if (!selector) {
              return;
            }

            dispatch({
              action:
                "input",

              selector,

              elementHandle:
                el,

              value:
                el.value,

              inputType:
                el.type ||
                "text",

              element:
                getElementAttributes(
                  el
                ),
            });
          },
          300
        );
    },
    true
  );

  document.addEventListener(
    "change",
    event => {
      const el =
        event.composedPath
          ? event
              .composedPath()[0]
          : event.target;

      if (
        !el ||
        !isRealUserFrame()
      ) {
        return;
      }

      const selector =
        getSelector(el);

      if (!selector) {
        return;
      }

      if (
        el.tagName ===
        "SELECT"
      ) {
        dispatch({
          action:
            "select",

          selector,

          elementHandle:
            el,

          value:
            el.value,

          label:
            el.options[
              el.selectedIndex
            ]?.text ||
            null,

          element:
            getElementAttributes(
              el
            ),
        });
      }

      if (
        el.type ===
          "checkbox" ||
        el.type ===
          "radio"
      ) {
        dispatch({
          action:
            el.type,

          selector,

          elementHandle:
            el,

          checked:
            el.checked,

          value:
            el.value ||
            null,

          element:
            getElementAttributes(
              el
            ),
        });
      }

      if (
        el.type ===
        "file"
      ) {
        dispatch({
          action:
            "file-upload",

          selector,

          elementHandle:
            el,

          fileCount:
            el.files.length,

          fileNames:
            Array.from(
              el.files
            ).map(file => {
              return file.name;
            }),

          element:
            getElementAttributes(
              el
            ),
        });
      }
    },
    true
  );

  window.addEventListener(
    "load",
    () => {
      try {
        if (
          !isRealUserFrame()
        ) {
          return;
        }

        dispatch({
          action:
            "navigation",

          url:
            location.href,

          title:
            document.title ||
            null,
        });
      } catch {
        // Ignore load capture errors.
      }
    }
  );

  window.addEventListener(
    "scroll",
    () => {
      clearTimeout(
        scrollTimer
      );

      scrollTimer =
        setTimeout(
          () => {
            if (
              !isRealUserFrame()
            ) {
              return;
            }

            const maxScrollY =
              document.body
                .scrollHeight -
              window.innerHeight;

            dispatch({
              action:
                "scroll",

              maxScrollY,

              scrollPercent:
                Math.round(
                  (
                    window.scrollY /
                    (
                      maxScrollY ||
                      1
                    )
                  ) *
                  100
                ),
            });
          },
          800
        );
    }
  );

  document.addEventListener(
    "focusin",
    event => {
      const el =
        event.composedPath
          ? event
              .composedPath()[0]
          : event.target;

      if (
        !el ||
        ![
          "INPUT",
          "TEXTAREA",
          "SELECT",
        ].includes(
          el.tagName
        ) ||
        !isRealUserFrame()
      ) {
        return;
      }

      const selector =
        getSelector(el);

      if (!selector) {
        return;
      }

      dispatch({
        action:
          "focus",

        selector,

        elementHandle:
          el,

        element:
          getElementAttributes(
            el
          ),
      });
    },
    true
  );
}

module.exports = {
  injectListeners,
};