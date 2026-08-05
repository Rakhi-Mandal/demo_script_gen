function injectListeners() {
  const RECORDER_INSTALL_ATTRIBUTE =
    "data-pw-recorder-listeners-installed";

  const POINTER_CLICK_MAX_AGE_MS = 1500;

  /*
   * Keep completed gesture IDs briefly so duplicate listeners or repeated
   * delivery of the same physical event cannot record another action.
   */
  const CLICK_GESTURE_RETENTION_MS = 5000;

  /*
   * Attribute-value quarantine.
   *
   * Any attribute whose value contains one of these fragments is excluded,
   * regardless of its attribute name.
   *
   * Examples rejected:
   *
   * id="pv_id_3691"
   * aria-controls="pv_id_4612_panel"
   * class="widget pv_id_100"
   * data-owner="prefix-pv_id_suffix"
   *
   * Matching is case-insensitive.
   */
  const GRAPH_ATTRIBUTE_VALUE_QUARANTINE =
    Object.freeze([
      "pv_id",
    ]);

  /*
   * Weighted local DOM graph limits.
   */
  const GRAPH_XPATH_MAX_COST = 10;
  const GRAPH_XPATH_MAX_VISITED = 180;
  const GRAPH_XPATH_MAX_CHILDREN_PER_NODE = 24;
  const GRAPH_XPATH_MAX_ANCHORS = 60;
  const GRAPH_XPATH_MAX_GENERATED = 800;
  const GRAPH_XPATH_MAX_LENGTH = 360;

  const GRAPH_EDGE_COST = {
    PARENT: 1,
    PREVIOUS_SIBLING: 2,
    NEXT_SIBLING: 2,
    CHILD: 3,
  };

  /*
   * Traversal priority once an ancestor/parent is encountered:
   *
   * 1. Traverse the parent's children and their bounded subtrees.
   * 2. Consider the parent itself as an XPath anchor.
   * 3. Traverse the parent's previous and next sibling peers.
   * 4. Ascend to the next parent level.
   */
  const GRAPH_TRAVERSAL_PRIORITY = {
    CHILDREN: 0,
    SELF: 1,
    SIBLING_PEERS: 2,
    ASCEND_TO_PARENT: 3,
  };

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
   * Shared click state.
   *
   * When same-origin access is available, every frame/listener uses the
   * top-level window as the state owner. This allows duplicate listener
   * instances to see the same gesture registry synchronously.
   */
  function getClickXPathStateOwner() {
    try {
      const topWindow =
        window.top;

      void topWindow.location.href;

      return topWindow;
    } catch {
      return window;
    }
  }

  const clickXPathStateOwner =
    getClickXPathStateOwner();

  if (
    !Object.prototype.hasOwnProperty.call(
      clickXPathStateOwner,
      "__PW_LAST_RECORDED_CLICK_XPATH__"
    )
  ) {
    clickXPathStateOwner
      .__PW_LAST_RECORDED_CLICK_XPATH__ =
      "";
  }

  if (
    !clickXPathStateOwner
      .__PW_RECORDED_CLICK_GESTURES__ ||
    typeof clickXPathStateOwner
      .__PW_RECORDED_CLICK_GESTURES__ !==
      "object"
  ) {
    clickXPathStateOwner
      .__PW_RECORDED_CLICK_GESTURES__ =
      Object.create(null);
  }

  function getLastRecordedClickXPath() {
    return String(
      clickXPathStateOwner
        .__PW_LAST_RECORDED_CLICK_XPATH__ ||
      ""
    );
  }

  function reserveClickXPath(
    xpathKey
  ) {
    if (!xpathKey) {
      return false;
    }

    if (
      getLastRecordedClickXPath() ===
      xpathKey
    ) {
      return false;
    }

    clickXPathStateOwner
      .__PW_LAST_RECORDED_CLICK_XPATH__ =
      xpathKey;

    return true;
  }

  function markClickXPathSaved(
    xpathKey
  ) {
    if (
      !xpathKey ||
      getLastRecordedClickXPath() !==
        xpathKey
    ) {
      return;
    }
  }

  function releaseClickXPath(
    xpathKey
  ) {
    if (!xpathKey) {
      return;
    }

    if (
      getLastRecordedClickXPath() ===
      xpathKey
    ) {
      clickXPathStateOwner
        .__PW_LAST_RECORDED_CLICK_XPATH__ =
        "";
    }
  }

  function getRecordedClickGestures() {
    let gestures =
      clickXPathStateOwner
        .__PW_RECORDED_CLICK_GESTURES__;

    if (
      !gestures ||
      typeof gestures !==
        "object"
    ) {
      gestures =
        Object.create(null);

      clickXPathStateOwner
        .__PW_RECORDED_CLICK_GESTURES__ =
        gestures;
    }

    return gestures;
  }

  function cleanupRecordedClickGestures() {
    const gestures =
      getRecordedClickGestures();

    const now =
      Date.now();

    for (
      const [
        gestureId,
        recordedAt,
      ] of Object.entries(
        gestures
      )
    ) {
      if (
        !Number.isFinite(
          recordedAt
        ) ||
        now - recordedAt >
          CLICK_GESTURE_RETENTION_MS
      ) {
        delete gestures[
          gestureId
        ];
      }
    }
  }

  function reserveClickGesture(
    gestureId
  ) {
    if (!gestureId) {
      return false;
    }

    cleanupRecordedClickGestures();

    const gestures =
      getRecordedClickGestures();

    if (
      Object.prototype.hasOwnProperty.call(
        gestures,
        gestureId
      )
    ) {
      return false;
    }

    gestures[gestureId] =
      Date.now();

    return true;
  }

  function releaseClickGesture(
    gestureId
  ) {
    if (!gestureId) {
      return;
    }

    const gestures =
      getRecordedClickGestures();

    delete gestures[
      gestureId
    ];
  }

  function getAbsoluteEventTimestamp(
    event
  ) {
    const relativeTimestamp =
      Number.isFinite(
        event?.timeStamp
      )
        ? event.timeStamp
        : performance.now();

    const timeOrigin =
      Number.isFinite(
        performance.timeOrigin
      )
        ? performance.timeOrigin
        : (
            Date.now() -
            performance.now()
          );

    /*
     * Microseconds retain enough resolution to distinguish consecutive
     * physical clicks while remaining deterministic across duplicate
     * listeners handling the same event.
     */
    return Math.round(
      (
        timeOrigin +
        relativeTimestamp
      ) *
      1000
    );
  }

  function createPointerGestureId(
    event
  ) {
    return [
      "pointer",
      getAbsoluteEventTimestamp(
        event
      ),
      Number.isFinite(
        event?.pointerId
      )
        ? event.pointerId
        : 0,
      String(
        event?.pointerType ||
        "mouse"
      ),
      Number.isFinite(
        event?.button
      )
        ? event.button
        : 0,
      Number.isFinite(
        event?.clientX
      )
        ? Math.round(
            event.clientX
          )
        : 0,
      Number.isFinite(
        event?.clientY
      )
        ? Math.round(
            event.clientY
          )
        : 0,
    ].join(":");
  }

  function createKeyboardGestureId(
    event,
    snapshot
  ) {
    return [
      "keyboard",
      getAbsoluteEventTimestamp(
        event
      ),
      snapshot?.target
        ?.localName ||
        snapshot?.target
          ?.tagName ||
        "",
      snapshot?.normalXPath ||
        "",
    ].join(":");
  }

  function omitNullFields(
    value
  ) {
    if (Array.isArray(value)) {
      const cleanedItems =
        value
          .map(omitNullFields)
          .filter(
            item =>
              item !== null
          );

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
            ]) =>
              entryValue !== null
          );

      return cleanedEntries.length
        ? Object.fromEntries(
            cleanedEntries
          )
        : null;
    }

    return value === undefined
      ? null
      : value;
  }

  function isRealUserFrame() {
    try {
      const url =
        location.href.toLowerCase();

      return !(
        url.includes("googleads") ||
        url.includes("doubleclick") ||
        url.includes("recaptcha") ||
        url.includes("openx.net") ||
        url.includes("google-bidout") ||
        url.includes("googlesyndication") ||
        url.includes("googleadservices") ||
        url.includes("googletagservices") ||
        url.includes("adservice.google") ||
        url.includes("adnxs") ||
        url.includes("rubiconproject") ||
        url.includes("pubmatic") ||
        url.includes("criteo") ||
        url.includes("taboola") ||
        url.includes("outbrain")
      );
    } catch {
      return false;
    }
  }

  function getAttributeValue(
    element,
    attributeName
  ) {
    return (
      element?.getAttribute?.(
        attributeName
      ) ||
      ""
    );
  }

  function isGraphAttributeValueQuarantined(
    value
  ) {
    const normalizedValue =
      String(value || "")
        .trim()
        .toLowerCase();

    if (!normalizedValue) {
      return false;
    }

    return GRAPH_ATTRIBUTE_VALUE_QUARANTINE
      .some(fragment => {
        const normalizedFragment =
          String(fragment || "")
            .trim()
            .toLowerCase();

        return (
          !!normalizedFragment &&
          normalizedValue.includes(
            normalizedFragment
          )
        );
      });
  }

  function getNonQuarantinedAttributeValue(
    element,
    attributeName
  ) {
    const value =
      getAttributeValue(
        element,
        attributeName
      );

    return isGraphAttributeValueQuarantined(
      value
    )
      ? ""
      : value;
  }

  function getNonQuarantinedAttributes(
    element
  ) {
    return Array.from(
      element?.attributes ||
      []
    ).filter(attribute => {
      return !isGraphAttributeValueQuarantined(
        attribute.value
      );
    });
  }

  function getElementText(
    element
  ) {
    return (
      element?.innerText
        ?.replace(/\s+/g, " ")
        .trim() ||
      ""
    );
  }

  function getGraphNormalizedText(
    element
  ) {
    return String(
      element?.textContent ||
      ""
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  function xpathLiteral(
    value
  ) {
    value =
      String(value);

    if (!value.includes("'")) {
      return `'${value}'`;
    }

    if (!value.includes('"')) {
      return `"${value}"`;
    }

    return (
      "concat(" +
      value
        .split("'")
        .map(part => {
          return `'${part}'`;
        })
        .join(', "\'", ') +
      ")"
    );
  }

  function getXPathTag(
    element
  ) {
    const tag =
      element.localName ||
      element.tagName
        .toLowerCase();

    if (
      element.namespaceURI ===
      "http://www.w3.org/2000/svg"
    ) {
      return (
        `*[local-name()=` +
        `${xpathLiteral(tag)}]`
      );
    }

    return tag;
  }

  function matchesOnlyElement(
    xpath,
    targetElement
  ) {
    try {
      const doc =
        targetElement?.ownerDocument ||
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
        result.snapshotLength === 1 &&
        result.snapshotItem(0) ===
          targetElement
      );
    } catch {
      return false;
    }
  }

  function matchesOnlyElementInScope(
    scopeElement,
    relativeXPath,
    targetElement
  ) {
    try {
      const doc =
        targetElement?.ownerDocument ||
        document;

      const result =
        doc.evaluate(
          relativeXPath,
          scopeElement,
          null,
          XPathResult
            .ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );

      return (
        result.snapshotLength === 1 &&
        result.snapshotItem(0) ===
          targetElement
      );
    } catch {
      return false;
    }
  }

  function isSvgElement(
    element
  ) {
    return (
      !!element &&
      typeof element.tagName ===
        "string" &&
      (
        element.tagName
          .toLowerCase() ===
          "svg" ||
        element.namespaceURI ===
          "http://www.w3.org/2000/svg"
      )
    );
  }

  function getXPathFriendlyTarget(
    element
  ) {
    if (
      !(
        element instanceof
        Element
      )
    ) {
      return null;
    }

    if (!isSvgElement(element)) {
      return element;
    }

    let current =
      element;

    while (
      current &&
      current.parentElement
    ) {
      current =
        current.parentElement;

      if (!isSvgElement(current)) {
        return current;
      }
    }

    return element;
  }

  function getActionableTarget(
    element
  ) {
    if (
      !(
        element instanceof
        Element
      )
    ) {
      return null;
    }

    const labelAncestor =
      element.closest("label");

    let labelControl =
      null;

    if (
      labelAncestor instanceof
      HTMLLabelElement
    ) {
      labelControl =
        labelAncestor.control instanceof
        Element
          ? labelAncestor.control
          : labelAncestor.querySelector(
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

    return element.closest(
      "a, button, input, textarea, select, option, summary, " +
      '[role="option"], [role="menuitem"], [role="listitem"], ' +
      '[role="button"], [role="link"], [role="checkbox"], ' +
      '[role="radio"], [role="tab"], [role="switch"]'
    );
  }

  function getChoiceInputNeighborText(
    element
  ) {
    if (
      !(
        element instanceof
        HTMLInputElement
      )
    ) {
      return "";
    }

    const type =
      getAttributeValue(
        element,
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
        element.closest("label")
      );

    if (labelText) {
      return labelText.slice(
        0,
        120
      );
    }

    const labelledBy =
      getNonQuarantinedAttributeValue(
        element,
        "aria-labelledby"
      );

    if (labelledBy) {
      const text =
        labelledBy
          .split(/\s+/)
          .map(id => {
            return getElementText(
              document.getElementById(
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
        element.closest(
          'tr, [role="row"], li, [role="option"]'
        )
      );

    if (blockText) {
      return blockText.slice(
        0,
        120
      );
    }

    let current =
      element.parentElement;

    for (
      let depth = 0;
      current &&
      depth < 4;
      depth += 1,
      current =
        current.parentElement
    ) {
      const text =
        getElementText(current);

      if (
        text &&
        text.length <= 120
      ) {
        return text;
      }
    }

    return "";
  }

  /*
   * ------------------------------------------------------------------------
   * ATTRIBUTE-AGNOSTIC GRAPH XPATH ENGINE
   * ------------------------------------------------------------------------
   */

  function isGraphAttributeEligible(
    attribute
  ) {
    if (!attribute) {
      return false;
    }

    const name =
      String(
        attribute.name ||
        ""
      )
        .trim()
        .toLowerCase();

    const value =
      String(
        attribute.value ||
        ""
      );

    const trimmedValue =
      value.trim();

    if (
      !name ||
      !trimmedValue
    ) {
      return false;
    }

    if (
      isGraphAttributeValueQuarantined(
        trimmedValue
      )
    ) {
      return false;
    }

    if (
      name ===
        RECORDER_INSTALL_ATTRIBUTE ||
      name.startsWith(
        "data-pw-recorder-"
      )
    ) {
      return false;
    }

    if (/^on[a-z]/i.test(name)) {
      return false;
    }

    if (
      name === "style" ||
      name === "class"
    ) {
      return false;
    }

    if (
      trimmedValue.length > 220
    ) {
      return false;
    }

    return true;
  }

  function getGraphAttributeStabilityPenalty(
    attribute
  ) {
    const name =
      String(
        attribute.name ||
        ""
      );

    const value =
      String(
        attribute.value ||
        ""
      ).trim();

    if (
      isGraphAttributeValueQuarantined(
        value
      )
    ) {
      return Number
        .POSITIVE_INFINITY;
    }

    let penalty = 0;

    if (value.length <= 2) {
      penalty += 7;
    }

    if (value.length > 80) {
      penalty += 6;
    }

    if (value.length > 140) {
      penalty += 10;
    }

    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value
      )
    ) {
      penalty += 28;
    }

    if (
      /^[0-9a-f_-]{14,}$/i.test(
        value
      )
    ) {
      penalty += 20;
    }

    if (/\d{5,}/.test(value)) {
      penalty += 14;
    }

    const digitCount =
      (
        value.match(/\d/g) ||
        []
      ).length;

    if (
      value.length >= 6 &&
      digitCount / value.length >
        0.5
    ) {
      penalty += 12;
    }

    if (/[?&#=]/.test(value)) {
      penalty += 6;
    }

    if (
      /^(true|false|null|undefined|none|on|off)$/i.test(
        value
      )
    ) {
      penalty += 9;
    }

    if (name.length <= 2) {
      penalty += 2;
    }

    return penalty;
  }

  function getGraphTextStabilityPenalty(
    text
  ) {
    const value =
      String(text || "")
        .trim();

    let penalty = 40;

    if (value.length <= 3) {
      penalty += 12;
    }

    if (value.length > 60) {
      penalty += 5;
    }

    if (/\d{5,}/.test(value)) {
      penalty += 16;
    }

    const digitCount =
      (
        value.match(/\d/g) ||
        []
      ).length;

    if (
      value.length >= 6 &&
      digitCount / value.length >
        0.4
    ) {
      penalty += 12;
    }

    if (
      /\b\d{1,2}[/:.-]\d{1,2}[/:.-]\d{2,4}\b/.test(
        value
      ) ||
      /\b\d{1,2}:\d{2}\b/.test(
        value
      )
    ) {
      penalty += 14;
    }

    return penalty;
  }

  function getGraphElementKindKey(
    element
  ) {
    return (
      `${element.namespaceURI || ""}` +
      "\u0000" +
      `${element.localName || ""}`
    );
  }

  function createGraphAttributeKey(
    element,
    attributeName,
    attributeValue
  ) {
    return (
      `${getGraphElementKindKey(
        element
      )}` +
      "\u0000attribute\u0000" +
      `${attributeName}` +
      "\u0000" +
      `${attributeValue}`
    );
  }

  function createGraphTextKey(
    element,
    normalizedText
  ) {
    return (
      `${getGraphElementKindKey(
        element
      )}` +
      "\u0000normalize-space\u0000" +
      `${normalizedText}`
    );
  }

  function compareGraphTraversalPath(
    leftPath,
    rightPath
  ) {
    const length =
      Math.max(
        leftPath.length,
        rightPath.length
      );

    for (
      let index = 0;
      index < length;
      index += 1
    ) {
      const leftValue =
        index < leftPath.length
          ? leftPath[index]
          : -1;

      const rightValue =
        index < rightPath.length
          ? rightPath[index]
          : -1;

      if (
        leftValue !==
        rightValue
      ) {
        return (
          leftValue -
          rightValue
        );
      }
    }

    return 0;
  }

  function cloneGraphTraversalPath(
    path
  ) {
    return Array.isArray(path)
      ? path.slice()
      : [];
  }

  function appendGraphTraversalPriority(
    path,
    priority
  ) {
    return [
      ...cloneGraphTraversalPath(
        path
      ),
      priority,
    ];
  }

  function addLocalGraphCandidate(
    candidates,
    localDuplicates,
    candidate
  ) {
    const {
      key,
      element,
    } = candidate;

    if (
      candidate.kind ===
        "attribute" &&
      isGraphAttributeValueQuarantined(
        candidate.attributeValue
      )
    ) {
      return;
    }

    if (
      localDuplicates.has(key)
    ) {
      return;
    }

    const existing =
      candidates.get(key);

    if (
      existing &&
      existing.element !== element
    ) {
      candidates.delete(key);
      localDuplicates.add(key);

      return;
    }

    if (!existing) {
      candidates.set(
        key,
        candidate
      );

      return;
    }

    const pathComparison =
      compareGraphTraversalPath(
        candidate.traversalPath,
        existing.traversalPath
      );

    if (
      pathComparison < 0 ||
      (
        pathComparison === 0 &&
        candidate.graphCost <
          existing.graphCost
      )
    ) {
      candidates.set(
        key,
        candidate
      );
    }
  }

  function createGraphMinHeap() {
    const values = [];

    function compare(
      left,
      right
    ) {
      const traversalComparison =
        compareGraphTraversalPath(
          left.traversalPath,
          right.traversalPath
        );

      if (
        traversalComparison !== 0
      ) {
        return traversalComparison;
      }

      const leftModePriority =
        left.mode === "COLLECT"
          ? 0
          : 1;

      const rightModePriority =
        right.mode === "COLLECT"
          ? 0
          : 1;

      if (
        leftModePriority !==
        rightModePriority
      ) {
        return (
          leftModePriority -
          rightModePriority
        );
      }

      if (left.cost !== right.cost) {
        return (
          left.cost -
          right.cost
        );
      }

      if (
        left.pathFromTarget.length !==
        right.pathFromTarget.length
      ) {
        return (
          left.pathFromTarget.length -
          right.pathFromTarget.length
        );
      }

      return (
        left.sequence -
        right.sequence
      );
    }

    function push(value) {
      values.push(value);

      let index =
        values.length - 1;

      while (index > 0) {
        const parentIndex =
          Math.floor(
            (index - 1) / 2
          );

        if (
          compare(
            values[parentIndex],
            values[index]
          ) <= 0
        ) {
          break;
        }

        [
          values[parentIndex],
          values[index],
        ] = [
          values[index],
          values[parentIndex],
        ];

        index =
          parentIndex;
      }
    }

    function pop() {
      if (!values.length) {
        return null;
      }

      const first =
        values[0];

      const last =
        values.pop();

      if (
        values.length &&
        last
      ) {
        values[0] =
          last;

        let index = 0;

        while (true) {
          const leftIndex =
            index * 2 + 1;

          const rightIndex =
            leftIndex + 1;

          let smallestIndex =
            index;

          if (
            leftIndex <
              values.length &&
            compare(
              values[leftIndex],
              values[smallestIndex]
            ) < 0
          ) {
            smallestIndex =
              leftIndex;
          }

          if (
            rightIndex <
              values.length &&
            compare(
              values[rightIndex],
              values[smallestIndex]
            ) < 0
          ) {
            smallestIndex =
              rightIndex;
          }

          if (
            smallestIndex ===
            index
          ) {
            break;
          }

          [
            values[index],
            values[smallestIndex],
          ] = [
            values[smallestIndex],
            values[index],
          ];

          index =
            smallestIndex;
        }
      }

      return first;
    }

    return {
      push,
      pop,

      get size() {
        return values.length;
      },
    };
  }

  function isGraphSearchElementAllowed(
    element,
    target
  ) {
    if (
      !(
        element instanceof
        Element
      ) ||
      !element.isConnected ||
      element.ownerDocument !==
        target.ownerDocument
    ) {
      return false;
    }

    if (
      element.tagName === "HTML" ||
      element.tagName === "BODY" ||
      element.tagName
        ?.toLowerCase() ===
        "x-pw-glass"
    ) {
      return false;
    }

    return true;
  }

  function getGraphSampledChildren(
    element
  ) {
    const children =
      Array.from(
        element.children ||
        []
      );

    if (
      children.length <=
      GRAPH_XPATH_MAX_CHILDREN_PER_NODE
    ) {
      return children;
    }

    const selected = [];
    const selectedIndexes =
      new Set();

    for (
      let index = 0;
      index <
        GRAPH_XPATH_MAX_CHILDREN_PER_NODE;
      index += 1
    ) {
      const childIndex =
        Math.round(
          (
            index *
            (children.length - 1)
          ) /
          (
            GRAPH_XPATH_MAX_CHILDREN_PER_NODE -
            1
          )
        );

      if (
        selectedIndexes.has(
          childIndex
        )
      ) {
        continue;
      }

      selectedIndexes.add(
        childIndex
      );

      selected.push(
        children[childIndex]
      );
    }

    return selected;
  }

  function getGraphEdge(
    from,
    to,
    type
  ) {
    return {
      from,
      to,
      type,
      cost:
        GRAPH_EDGE_COST[type],
    };
  }

  function pushGraphExpansionState(
    queue,
    target,
    state,
    destination,
    edgeType,
    traversalPriority,
    isAncestor,
    nextSequence
  ) {
    if (
      !isGraphSearchElementAllowed(
        destination,
        target
      )
    ) {
      return nextSequence;
    }

    const edge =
      getGraphEdge(
        state.element,
        destination,
        edgeType
      );

    const nextCost =
      state.cost +
      edge.cost;

    if (
      nextCost >
      GRAPH_XPATH_MAX_COST
    ) {
      return nextSequence;
    }

    queue.push({
      mode:
        "EXPAND",

      element:
        destination,

      cost:
        nextCost,

      isAncestor,

      traversalPath:
        appendGraphTraversalPriority(
          state.traversalPath,
          traversalPriority
        ),

      pathFromTarget: [
        ...state.pathFromTarget,
        edge,
      ],

      sequence:
        nextSequence,
    });

    return nextSequence + 1;
  }

  function pushGraphCollectState(
    queue,
    state,
    traversalPriority,
    nextSequence
  ) {
    queue.push({
      mode:
        "COLLECT",

      element:
        state.element,

      cost:
        state.cost,

      isAncestor:
        state.isAncestor,

      traversalPath:
        appendGraphTraversalPriority(
          state.traversalPath,
          traversalPriority
        ),

      pathFromTarget:
        state.pathFromTarget
          .slice(),

      sequence:
        nextSequence,
    });

    return nextSequence + 1;
  }

  function collectGraphCandidatesFromState(
    state,
    candidates,
    localDuplicates,
    traversalOrder
  ) {
    for (
      const attribute of
      Array.from(
        state.element.attributes ||
        []
      )
    ) {
      if (
        !isGraphAttributeEligible(
          attribute
        )
      ) {
        continue;
      }

      const value =
        String(attribute.value);

      if (
        isGraphAttributeValueQuarantined(
          value
        )
      ) {
        continue;
      }

      const key =
        createGraphAttributeKey(
          state.element,
          attribute.name,
          value
        );

      addLocalGraphCandidate(
        candidates,
        localDuplicates,
        {
          kind:
            "attribute",

          key,

          element:
            state.element,

          attributeName:
            attribute.name,

          attributeValue:
            value,

          graphCost:
            state.cost,

          traversalOrder,

          traversalPath:
            cloneGraphTraversalPath(
              state.traversalPath
            ),

          stabilityPenalty:
            getGraphAttributeStabilityPenalty(
              attribute
            ),

          pathFromTarget:
            state.pathFromTarget
              .slice(),
        }
      );
    }

    const normalizedText =
      getGraphNormalizedText(
        state.element
      );

    if (
      normalizedText &&
      normalizedText.length <= 80
    ) {
      const key =
        createGraphTextKey(
          state.element,
          normalizedText
        );

      addLocalGraphCandidate(
        candidates,
        localDuplicates,
        {
          kind:
            "text",

          key,

          element:
            state.element,

          textValue:
            normalizedText,

          graphCost:
            state.cost,

          traversalOrder,

          traversalPath:
            cloneGraphTraversalPath(
              state.traversalPath
            ),

          stabilityPenalty:
            getGraphTextStabilityPenalty(
              normalizedText
            ),

          pathFromTarget:
            state.pathFromTarget
              .slice(),
        }
      );
    }
  }

  function collectGraphCandidates(
    target
  ) {
    const candidates =
      new Map();

    const localDuplicates =
      new Set();

    const expandedElements =
      new Set();

    const collectedElements =
      new Set();

    const bestExpansionCost =
      new Map();

    const queue =
      createGraphMinHeap();

    let queueSequence = 0;
    let traversalOrder = 0;
    let visitedCount = 0;

    queue.push({
      mode:
        "EXPAND",

      element:
        target,

      cost:
        0,

      isAncestor:
        false,

      traversalPath:
        [],

      pathFromTarget:
        [],

      sequence:
        queueSequence,
    });

    queueSequence += 1;

    bestExpansionCost.set(
      target,
      0
    );

    while (
      queue.size &&
      visitedCount <
        GRAPH_XPATH_MAX_VISITED
    ) {
      const state =
        queue.pop();

      if (!state) {
        break;
      }

      if (
        state.cost >
        GRAPH_XPATH_MAX_COST
      ) {
        continue;
      }

      if (
        state.mode === "COLLECT"
      ) {
        if (
          collectedElements.has(
            state.element
          )
        ) {
          continue;
        }

        collectedElements.add(
          state.element
        );

        collectGraphCandidatesFromState(
          state,
          candidates,
          localDuplicates,
          traversalOrder
        );

        traversalOrder += 1;
        visitedCount += 1;

        continue;
      }

      const previousBestCost =
        bestExpansionCost.get(
          state.element
        );

      if (
        previousBestCost !== undefined &&
        previousBestCost <
          state.cost
      ) {
        continue;
      }

      if (
        expandedElements.has(
          state.element
        )
      ) {
        continue;
      }

      expandedElements.add(
        state.element
      );

      if (!state.isAncestor) {
        if (
          !collectedElements.has(
            state.element
          )
        ) {
          collectedElements.add(
            state.element
          );

          collectGraphCandidatesFromState(
            state,
            candidates,
            localDuplicates,
            traversalOrder
          );

          traversalOrder += 1;
          visitedCount += 1;
        }
      }

      /*
       * Phase 1: children.
       */
      for (
        const child of
        getGraphSampledChildren(
          state.element
        )
      ) {
        const nextCost =
          state.cost +
          GRAPH_EDGE_COST.CHILD;

        const previousCost =
          bestExpansionCost.get(
            child
          );

        if (
          previousCost !== undefined &&
          previousCost <= nextCost
        ) {
          continue;
        }

        bestExpansionCost.set(
          child,
          nextCost
        );

        queueSequence =
          pushGraphExpansionState(
            queue,
            target,
            state,
            child,
            "CHILD",
            GRAPH_TRAVERSAL_PRIORITY
              .CHILDREN,
            false,
            queueSequence
          );
      }

      /*
       * Phase 2: parent itself.
       */
      if (state.isAncestor) {
        queueSequence =
          pushGraphCollectState(
            queue,
            state,
            GRAPH_TRAVERSAL_PRIORITY
              .SELF,
            queueSequence
          );
      }

      /*
       * Phase 3: sibling peers.
       */
      const siblingStates = [
        {
          element:
            state.element
              .previousElementSibling,

          type:
            "PREVIOUS_SIBLING",
        },
        {
          element:
            state.element
              .nextElementSibling,

          type:
            "NEXT_SIBLING",
        },
      ];

      for (
        const siblingState of
        siblingStates
      ) {
        const sibling =
          siblingState.element;

        if (
          !isGraphSearchElementAllowed(
            sibling,
            target
          )
        ) {
          continue;
        }

        const nextCost =
          state.cost +
          GRAPH_EDGE_COST[
            siblingState.type
          ];

        const previousCost =
          bestExpansionCost.get(
            sibling
          );

        if (
          previousCost !== undefined &&
          previousCost <= nextCost
        ) {
          continue;
        }

        bestExpansionCost.set(
          sibling,
          nextCost
        );

        queueSequence =
          pushGraphExpansionState(
            queue,
            target,
            state,
            sibling,
            siblingState.type,
            GRAPH_TRAVERSAL_PRIORITY
              .SIBLING_PEERS,
            false,
            queueSequence
          );
      }

      /*
       * Phase 4: next parent.
       */
      const parent =
        state.element.parentElement;

      if (
        isGraphSearchElementAllowed(
          parent,
          target
        )
      ) {
        const nextCost =
          state.cost +
          GRAPH_EDGE_COST.PARENT;

        const previousCost =
          bestExpansionCost.get(
            parent
          );

        if (
          previousCost === undefined ||
          nextCost < previousCost
        ) {
          bestExpansionCost.set(
            parent,
            nextCost
          );

          queueSequence =
            pushGraphExpansionState(
              queue,
              target,
              state,
              parent,
              "PARENT",
              GRAPH_TRAVERSAL_PRIORITY
                .ASCEND_TO_PARENT,
              true,
              queueSequence
            );
        }
      }
    }

    return candidates;
  }

  function recordGraphCandidateOccurrence(
    candidates,
    seenOnce,
    key,
    element
  ) {
    if (!candidates.has(key)) {
      return;
    }

    if (seenOnce.has(key)) {
      candidates.delete(key);
      seenOnce.delete(key);

      return;
    }

    seenOnce.set(
      key,
      element
    );
  }

  function proveGraphCandidateUniqueness(
    target,
    candidates
  ) {
    if (!candidates.size) {
      return candidates;
    }

    for (
      const [
        key,
        candidate,
      ] of Array.from(
        candidates.entries()
      )
    ) {
      if (
        candidate.kind ===
          "attribute" &&
        isGraphAttributeValueQuarantined(
          candidate.attributeValue
        )
      ) {
        candidates.delete(key);
      }
    }

    if (!candidates.size) {
      return candidates;
    }

    const attributeNamesByKind =
      new Map();

    const textValuesByKind =
      new Map();

    for (
      const candidate of
      candidates.values()
    ) {
      const elementKind =
        getGraphElementKindKey(
          candidate.element
        );

      if (
        candidate.kind ===
        "text"
      ) {
        let values =
          textValuesByKind.get(
            elementKind
          );

        if (!values) {
          values =
            new Set();

          textValuesByKind.set(
            elementKind,
            values
          );
        }

        values.add(
          candidate.textValue
        );

        continue;
      }

      let names =
        attributeNamesByKind.get(
          elementKind
        );

      if (!names) {
        names =
          new Set();

        attributeNamesByKind.set(
          elementKind,
          names
        );
      }

      names.add(
        candidate.attributeName
      );
    }

    const seenOnce =
      new Map();

    const doc =
      target.ownerDocument ||
      document;

    const root =
      doc.documentElement;

    if (!root) {
      candidates.clear();

      return candidates;
    }

    const showElement =
      doc.defaultView
        ?.NodeFilter
        ?.SHOW_ELEMENT ||
      1;

    const walker =
      doc.createTreeWalker(
        root,
        showElement
      );

    let element =
      walker.currentNode;

    while (
      element &&
      candidates.size
    ) {
      const elementKind =
        getGraphElementKindKey(
          element
        );

      const relevantAttributeNames =
        attributeNamesByKind.get(
          elementKind
        );

      if (relevantAttributeNames) {
        if (
          element.attributes.length <=
          relevantAttributeNames.size
        ) {
          for (
            const attribute of
            Array.from(
              element.attributes
            )
          ) {
            if (
              !relevantAttributeNames.has(
                attribute.name
              )
            ) {
              continue;
            }

            if (
              isGraphAttributeValueQuarantined(
                attribute.value
              )
            ) {
              continue;
            }

            const key =
              createGraphAttributeKey(
                element,
                attribute.name,
                attribute.value
              );

            recordGraphCandidateOccurrence(
              candidates,
              seenOnce,
              key,
              element
            );
          }
        } else {
          for (
            const attributeName of
            relevantAttributeNames
          ) {
            if (
              !element.hasAttribute(
                attributeName
              )
            ) {
              continue;
            }

            const value =
              element.getAttribute(
                attributeName
              );

            if (
              isGraphAttributeValueQuarantined(
                value
              )
            ) {
              continue;
            }

            const key =
              createGraphAttributeKey(
                element,
                attributeName,
                value
              );

            recordGraphCandidateOccurrence(
              candidates,
              seenOnce,
              key,
              element
            );
          }
        }
      }

      const relevantTextValues =
        textValuesByKind.get(
          elementKind
        );

      if (relevantTextValues) {
        const normalizedText =
          getGraphNormalizedText(
            element
          );

        if (
          normalizedText &&
          relevantTextValues.has(
            normalizedText
          )
        ) {
          const key =
            createGraphTextKey(
              element,
              normalizedText
            );

          recordGraphCandidateOccurrence(
            candidates,
            seenOnce,
            key,
            element
          );
        }
      }

      element =
        walker.nextNode();
    }

    for (
      const [
        key,
        candidate,
      ] of Array.from(
        candidates.entries()
      )
    ) {
      if (
        seenOnce.get(key) !==
        candidate.element
      ) {
        candidates.delete(key);
      }
    }

    return candidates;
  }

  function getGraphTextSnippet(
    value
  ) {
    const normalized =
      String(value || "")
        .replace(/\s+/g, " ")
        .trim();

    if (
      normalized.length < 12
    ) {
      return "";
    }

    const tentative =
      normalized.slice(0, 48);

    const lastSpace =
      tentative.lastIndexOf(" ");

    if (lastSpace >= 16) {
      return tentative
        .slice(0, lastSpace)
        .trim();
    }

    return tentative.trim();
  }

  function deriveGraphStableFragments(
    rawValue
  ) {
    const value =
      String(rawValue || "")
        .trim();

    if (
      isGraphAttributeValueQuarantined(
        value
      )
    ) {
      return [];
    }

    if (value.length < 6) {
      return [];
    }

    const fragments =
      new Set();

    const addFragment =
      fragment => {
        const cleaned =
          String(fragment || "")
            .replace(
              /^[\s_.:/?#&=-]+|[\s_.:/?#&=-]+$/g,
              ""
            )
            .trim();

        if (
          !cleaned ||
          isGraphAttributeValueQuarantined(
            cleaned
          )
        ) {
          return;
        }

        if (
          cleaned.length < 5 ||
          cleaned.length >=
            value.length ||
          /^\d+$/.test(cleaned)
        ) {
          return;
        }

        fragments.add(cleaned);
      };

    for (
      const fragment of
      value.split(
        /(?:\d{2,}|[0-9a-f]{10,}|[?&#=]+)/gi
      )
    ) {
      addFragment(fragment);
    }

    for (
      const fragment of
      value.split(
        /[\s_.:/?#&=-]+/
      )
    ) {
      addFragment(fragment);
    }

    const prefixMatch =
      value.match(/^[^\d]{5,}/);

    if (prefixMatch) {
      addFragment(
        prefixMatch[0]
      );
    }

    const suffixMatch =
      value.match(/[^\d]{5,}$/);

    if (suffixMatch) {
      addFragment(
        suffixMatch[0]
      );
    }

    return Array.from(fragments)
      .sort(
        (
          left,
          right
        ) =>
          right.length -
          left.length
      )
      .slice(0, 3);
  }

  function getGraphExactAttributePredicate(
    attributeName,
    attributeValue
  ) {
    return (
      `@*[name()=` +
      `${xpathLiteral(
        attributeName
      )}` +
      ` and .=` +
      `${xpathLiteral(
        attributeValue
      )}]`
    );
  }

  function getGraphStartsWithAttributePredicate(
    attributeName,
    fragment
  ) {
    return (
      `@*[name()=` +
      `${xpathLiteral(
        attributeName
      )}` +
      ` and starts-with(., ` +
      `${xpathLiteral(
        fragment
      )})]`
    );
  }

  function getGraphContainsAttributePredicate(
    attributeName,
    fragments
  ) {
    const conditions =
      fragments.map(
        fragment => {
          return (
            `contains(., ` +
            `${xpathLiteral(
              fragment
            )})`
          );
        }
      );

    return (
      `@*[name()=` +
      `${xpathLiteral(
        attributeName
      )}` +
      ` and ` +
      `${conditions.join(
        " and "
      )}]`
    );
  }

  function isAcceptableGraphXPath(
    xpath
  ) {
    return (
      !!xpath &&
      xpath.length <=
        GRAPH_XPATH_MAX_LENGTH
    );
  }

  function containsNumericPosition(
    xpath
  ) {
    return /\[\s*\d+\s*\]/.test(
      xpath
    );
  }

  function containsQuarantinedAttributeValue(
    xpath
  ) {
    const normalizedXPath =
      String(xpath || "")
        .toLowerCase();

    return GRAPH_ATTRIBUTE_VALUE_QUARANTINE
      .some(fragment => {
        const normalizedFragment =
          String(fragment || "")
            .trim()
            .toLowerCase();

        return (
          !!normalizedFragment &&
          normalizedXPath.includes(
            normalizedFragment
          )
        );
      });
  }

  function pushGraphVariant(
    variants,
    seen,
    variant
  ) {
    if (
      !variant?.xpath ||
      seen.has(variant.xpath) ||
      !isAcceptableGraphXPath(
        variant.xpath
      ) ||
      containsNumericPosition(
        variant.xpath
      ) ||
      containsQuarantinedAttributeValue(
        variant.xpath
      )
    ) {
      return;
    }

    seen.add(variant.xpath);
    variants.push(variant);
  }

  function getGraphAnchorVariants(
    candidate
  ) {
    const variants = [];
    const seen =
      new Set();

    const element =
      candidate.element;

    const tag =
      getXPathTag(element);

    if (
      candidate.kind ===
      "text"
    ) {
      const exactTextXPath =
        `//${tag}` +
        `[normalize-space(.)=` +
        `${xpathLiteral(
          candidate.textValue
        )}]`;

      if (
        matchesOnlyElement(
          exactTextXPath,
          element
        )
      ) {
        pushGraphVariant(
          variants,
          seen,
          {
            xpath:
              exactTextXPath,

            score:
              0,

            strategy:
              "normalize-space-anchor",
          }
        );
      }

      const snippet =
        getGraphTextSnippet(
          candidate.textValue
        );

      if (
        snippet &&
        snippet !==
          candidate.textValue
      ) {
        const containsTextXPath =
          `//${tag}` +
          `[contains(normalize-space(.), ` +
          `${xpathLiteral(
            snippet
          )})]`;

        if (
          matchesOnlyElement(
            containsTextXPath,
            element
          )
        ) {
          pushGraphVariant(
            variants,
            seen,
            {
              xpath:
                containsTextXPath,

              score:
                12,

              strategy:
                "contains-normalized-text-anchor",
            }
          );
        }
      }

      return variants;
    }

    if (
      isGraphAttributeValueQuarantined(
        candidate.attributeValue
      )
    ) {
      return variants;
    }

    const exactXPath =
      `//${tag}` +
      `[` +
      `${getGraphExactAttributePredicate(
        candidate.attributeName,
        candidate.attributeValue
      )}]`;

    pushGraphVariant(
      variants,
      seen,
      {
        xpath:
          exactXPath,

        score:
          0,

        strategy:
          "exact-attribute-anchor",
      }
    );

    const fragments =
      deriveGraphStableFragments(
        candidate.attributeValue
      );

    for (
      const fragment of
      fragments
    ) {
      if (
        isGraphAttributeValueQuarantined(
          fragment
        )
      ) {
        continue;
      }

      if (
        String(
          candidate.attributeValue
        ).startsWith(fragment)
      ) {
        const startsWithXPath =
          `//${tag}` +
          `[` +
          `${getGraphStartsWithAttributePredicate(
            candidate.attributeName,
            fragment
          )}]`;

        if (
          matchesOnlyElement(
            startsWithXPath,
            element
          )
        ) {
          pushGraphVariant(
            variants,
            seen,
            {
              xpath:
                startsWithXPath,

              score:
                8,

              strategy:
                "starts-with-attribute-anchor",
            }
          );
        }
      }

      const containsXPath =
        `//${tag}` +
        `[` +
        `${getGraphContainsAttributePredicate(
          candidate.attributeName,
          [fragment]
        )}]`;

      if (
        matchesOnlyElement(
          containsXPath,
          element
        )
      ) {
        pushGraphVariant(
          variants,
          seen,
          {
            xpath:
              containsXPath,

            score:
              10,

            strategy:
              "contains-attribute-anchor",
          }
        );
      }
    }

    if (fragments.length >= 2) {
      const combinedXPath =
        `//${tag}` +
        `[` +
        `${getGraphContainsAttributePredicate(
          candidate.attributeName,
          fragments.slice(0, 2)
        )}]`;

      if (
        matchesOnlyElement(
          combinedXPath,
          element
        )
      ) {
        pushGraphVariant(
          variants,
          seen,
          {
            xpath:
              combinedXPath,

            score:
              9,

            strategy:
              "multi-contains-attribute-anchor",
          }
        );
      }
    }

    return variants;
  }

  function getGraphScopedNodeVariants(
    element,
    allowText = false
  ) {
    if (
      !(
        element instanceof
        Element
      )
    ) {
      return [];
    }

    const tag =
      getXPathTag(element);

    const variants = [];
    const seen =
      new Set();

    const pushVariant = (
      nodeTest,
      score,
      strategy
    ) => {
      if (
        !nodeTest ||
        seen.has(nodeTest) ||
        containsNumericPosition(
          nodeTest
        ) ||
        containsQuarantinedAttributeValue(
          nodeTest
        )
      ) {
        return;
      }

      seen.add(nodeTest);

      variants.push({
        nodeTest,
        score,
        strategy,
      });
    };

    const attributes =
      Array.from(
        element.attributes ||
        []
      )
        .filter(
          isGraphAttributeEligible
        )
        .filter(attribute => {
          return !isGraphAttributeValueQuarantined(
            attribute.value
          );
        })
        .map(attribute => {
          return {
            attribute,

            penalty:
              getGraphAttributeStabilityPenalty(
                attribute
              ),
          };
        })
        .filter(candidate => {
          return Number.isFinite(
            candidate.penalty
          );
        })
        .sort(
          (
            left,
            right
          ) =>
            left.penalty -
            right.penalty
        );

    for (
      const {
        attribute,
        penalty,
      } of attributes
    ) {
      pushVariant(
        `${tag}[` +
        `${getGraphExactAttributePredicate(
          attribute.name,
          attribute.value
        )}]`,
        penalty,
        "scoped-exact-attribute"
      );

      const fragments =
        deriveGraphStableFragments(
          attribute.value
        );

      for (
        const fragment of
        fragments
      ) {
        if (
          isGraphAttributeValueQuarantined(
            fragment
          )
        ) {
          continue;
        }

        if (
          String(
            attribute.value
          ).startsWith(fragment)
        ) {
          pushVariant(
            `${tag}[` +
            `${getGraphStartsWithAttributePredicate(
              attribute.name,
              fragment
            )}]`,
            penalty + 10,
            "scoped-starts-with-attribute"
          );
        }

        pushVariant(
          `${tag}[` +
          `${getGraphContainsAttributePredicate(
            attribute.name,
            [fragment]
          )}]`,
          penalty + 14,
          "scoped-contains-attribute"
        );
      }
    }

    if (allowText) {
      const normalizedText =
        getGraphNormalizedText(
          element
        );

      if (
        normalizedText &&
        normalizedText.length <= 80
      ) {
        pushVariant(
          `${tag}` +
          `[normalize-space(.)=` +
          `${xpathLiteral(
            normalizedText
          )}]`,
          100,
          "scoped-normalize-space"
        );
      }

      const snippet =
        getGraphTextSnippet(
          normalizedText
        );

      if (snippet) {
        pushVariant(
          `${tag}` +
          `[contains(normalize-space(.), ` +
          `${xpathLiteral(
            snippet
          )})]`,
          115,
          "scoped-contains-normalized-text"
        );
      }
    }

    return variants
      .sort(
        (
          left,
          right
        ) =>
          left.score -
          right.score
      )
      .slice(0, 24);
  }

  function buildGraphPredicateChain(
    anchor,
    target,
    allowText = false
  ) {
    if (
      !(
        anchor instanceof
        Element
      ) ||
      !(
        target instanceof
        Element
      )
    ) {
      return null;
    }

    if (anchor === target) {
      return {
        suffix:
          "",

        score:
          0,

        strategies:
          [],
      };
    }

    if (!anchor.contains(target)) {
      return null;
    }

    const memo =
      new Map();

    function solve(
      scopeElement
    ) {
      if (
        scopeElement ===
        target
      ) {
        return {
          suffix:
            "",

          score:
            0,

          strategies:
            [],
        };
      }

      if (
        memo.has(
          scopeElement
        )
      ) {
        return memo.get(
          scopeElement
        );
      }

      const lineage = [];

      let current =
        target;

      while (
        current &&
        current !== scopeElement
      ) {
        lineage.push(current);

        current =
          current.parentElement;
      }

      if (
        current !==
        scopeElement
      ) {
        memo.set(
          scopeElement,
          null
        );

        return null;
      }

      let bestResult =
        null;

      for (
        const waypoint of
        lineage
      ) {
        const waypointVariants =
          getGraphScopedNodeVariants(
            waypoint,
            allowText
          );

        for (
          const waypointVariant of
          waypointVariants
        ) {
          const relativeXPath =
            `.//${waypointVariant.nodeTest}`;

          if (
            containsQuarantinedAttributeValue(
              relativeXPath
            )
          ) {
            continue;
          }

          if (
            !matchesOnlyElementInScope(
              scopeElement,
              relativeXPath,
              waypoint
            )
          ) {
            continue;
          }

          const remainder =
            waypoint === target
              ? {
                  suffix:
                    "",

                  score:
                    0,

                  strategies:
                    [],
                }
              : solve(waypoint);

          if (!remainder) {
            continue;
          }

          const result = {
            suffix:
              `//${waypointVariant.nodeTest}` +
              remainder.suffix,

            score:
              waypointVariant.score +
              remainder.score +
              2,

            strategies: [
              waypointVariant.strategy,
              ...remainder.strategies,
            ],
          };

          if (
            containsQuarantinedAttributeValue(
              result.suffix
            )
          ) {
            continue;
          }

          if (
            !bestResult ||
            result.score <
              bestResult.score ||
            (
              result.score ===
                bestResult.score &&
              result.suffix.length <
                bestResult.suffix.length
            )
          ) {
            bestResult =
              result;
          }
        }
      }

      memo.set(
        scopeElement,
        bestResult
      );

      return bestResult;
    }

    return solve(anchor);
  }

  function buildGraphAxisPredicateChain(
    anchor,
    target,
    axis,
    allowText = false
  ) {
    if (
      !(
        anchor instanceof
        Element
      ) ||
      !(
        target instanceof
        Element
      ) ||
      !axis
    ) {
      return null;
    }

    const lineage = [];

    let current =
      target;

    while (
      current &&
      current.tagName !== "HTML" &&
      current.tagName !== "BODY"
    ) {
      lineage.push(current);

      current =
        current.parentElement;
    }

    let bestResult =
      null;

    for (
      const waypoint of
      lineage
    ) {
      const waypointVariants =
        getGraphScopedNodeVariants(
          waypoint,
          allowText
        );

      for (
        const waypointVariant of
        waypointVariants
      ) {
        const relativeXPath =
          `${axis}::${waypointVariant.nodeTest}`;

        if (
          containsQuarantinedAttributeValue(
            relativeXPath
          )
        ) {
          continue;
        }

        if (
          !matchesOnlyElementInScope(
            anchor,
            relativeXPath,
            waypoint
          )
        ) {
          continue;
        }

        const remainder =
          waypoint === target
            ? {
                suffix:
                  "",

                score:
                  0,

                strategies:
                  [],
              }
            : buildGraphPredicateChain(
                waypoint,
                target,
                allowText
              );

        if (!remainder) {
          continue;
        }

        const result = {
          suffix:
            `/${axis}::` +
            `${waypointVariant.nodeTest}` +
            remainder.suffix,

          score:
            waypointVariant.score +
            remainder.score +
            35,

          strategies: [
            `${axis}-axis`,
            waypointVariant.strategy,
            ...remainder.strategies,
          ],
        };

        if (
          containsNumericPosition(
            result.suffix
          ) ||
          containsQuarantinedAttributeValue(
            result.suffix
          )
        ) {
          continue;
        }

        if (
          !bestResult ||
          result.score <
            bestResult.score ||
          (
            result.score ===
              bestResult.score &&
            result.suffix.length <
              bestResult.suffix.length
          )
        ) {
          bestResult =
            result;
        }
      }
    }

    return bestResult;
  }

  function getGraphRelationVariants(
    candidate,
    target,
    allowText = false
  ) {
    const anchor =
      candidate.element;

    const variants = [];
    const seen =
      new Set();

    const pushRelation = (
      suffix,
      score,
      strategy
    ) => {
      const key =
        `${suffix}\u0000${strategy}`;

      if (
        seen.has(key) ||
        containsNumericPosition(
          suffix
        ) ||
        containsQuarantinedAttributeValue(
          suffix
        )
      ) {
        return;
      }

      seen.add(key);

      variants.push({
        suffix,
        score,
        strategy,
      });
    };

    if (anchor === target) {
      pushRelation(
        "",
        0,
        "anchor-is-target"
      );

      return variants;
    }

    if (anchor.contains(target)) {
      const chain =
        buildGraphPredicateChain(
          anchor,
          target,
          allowText
        );

      if (chain?.suffix) {
        pushRelation(
          chain.suffix,
          chain.score,
          allowText
            ? "predicate-chain-with-text-fallback"
            : "attribute-predicate-chain"
        );
      }
    }

    if (target.contains(anchor)) {
      const targetVariants =
        getGraphScopedNodeVariants(
          target,
          allowText
        );

      for (
        const targetVariant of
        targetVariants
      ) {
        pushRelation(
          `/ancestor::${targetVariant.nodeTest}`,
          targetVariant.score + 12,
          "predicate-ancestor-axis"
        );
      }
    }

    const position =
      anchor.compareDocumentPosition(
        target
      );

    const targetIsFollowing =
      !!(
        position &
        Node
          .DOCUMENT_POSITION_FOLLOWING
      );

    const targetIsPreceding =
      !!(
        position &
        Node
          .DOCUMENT_POSITION_PRECEDING
      );

    if (
      anchor.parentElement &&
      anchor.parentElement ===
        target.parentElement
    ) {
      const siblingAxis =
        targetIsFollowing
          ? "following-sibling"
          : "preceding-sibling";

      const targetVariants =
        getGraphScopedNodeVariants(
          target,
          allowText
        );

      for (
        const targetVariant of
        targetVariants
      ) {
        pushRelation(
          `/${siblingAxis}::` +
          `${targetVariant.nodeTest}`,
          targetVariant.score + 14,
          `${siblingAxis}-predicate`
        );
      }
    }

    if (
      !anchor.contains(target) &&
      !target.contains(anchor)
    ) {
      const axis =
        targetIsFollowing
          ? "following"
          : targetIsPreceding
            ? "preceding"
            : "";

      if (axis) {
        const axisChain =
          buildGraphAxisPredicateChain(
            anchor,
            target,
            axis,
            allowText
          );

        if (axisChain?.suffix) {
          pushRelation(
            axisChain.suffix,
            axisChain.score,
            `${axis}-predicate-chain`
          );
        }
      }
    }

    return variants;
  }

  function compareGraphCandidatesByTraversal(
    left,
    right
  ) {
    const traversalComparison =
      compareGraphTraversalPath(
        left.traversalPath,
        right.traversalPath
      );

    if (
      traversalComparison !== 0
    ) {
      return traversalComparison;
    }

    if (
      left.traversalOrder !==
      right.traversalOrder
    ) {
      return (
        left.traversalOrder -
        right.traversalOrder
      );
    }

    const leftScore =
      left.graphCost * 12 +
      left.stabilityPenalty;

    const rightScore =
      right.graphCost * 12 +
      right.stabilityPenalty;

    if (
      leftScore !==
      rightScore
    ) {
      return (
        leftScore -
        rightScore
      );
    }

    return (
      left.pathFromTarget.length -
      right.pathFromTarget.length
    );
  }

  function findBestGraphXPathForCandidates(
    target,
    candidates,
    allowTextRelations = false
  ) {
    if (!candidates.size) {
      return "";
    }

    const rankedCandidates =
      Array.from(
        candidates.values()
      )
        .filter(candidate => {
          return !(
            candidate.kind ===
              "attribute" &&
            isGraphAttributeValueQuarantined(
              candidate.attributeValue
            )
          );
        })
        .sort(
          compareGraphCandidatesByTraversal
        )
        .slice(
          0,
          GRAPH_XPATH_MAX_ANCHORS
        );

    const generated =
      new Set();

    let generatedCount = 0;
    let bestResult = null;

    outer:
    for (
      const candidate of
      rankedCandidates
    ) {
      const anchorVariants =
        getGraphAnchorVariants(
          candidate
        );

      const relationVariants =
        getGraphRelationVariants(
          candidate,
          target,
          allowTextRelations
        );

      for (
        const anchorVariant of
        anchorVariants
      ) {
        for (
          const relationVariant of
          relationVariants
        ) {
          if (
            generatedCount >=
            GRAPH_XPATH_MAX_GENERATED
          ) {
            break outer;
          }

          const xpath =
            anchorVariant.xpath +
            relationVariant.suffix;

          if (
            generated.has(xpath) ||
            !isAcceptableGraphXPath(
              xpath
            ) ||
            containsNumericPosition(
              xpath
            ) ||
            containsQuarantinedAttributeValue(
              xpath
            )
          ) {
            continue;
          }

          generated.add(xpath);
          generatedCount += 1;

          if (
            !matchesOnlyElement(
              xpath,
              target
            )
          ) {
            continue;
          }

          let score =
            candidate.stabilityPenalty +
            anchorVariant.score +
            relationVariant.score +
            xpath.length / 100;

          if (
            xpath.includes(
              "/following::"
            ) ||
            xpath.includes(
              "/preceding::"
            )
          ) {
            score += 10;
          }

          if (
            xpath.includes(
              "contains("
            )
          ) {
            score += 4;
          }

          if (
            xpath.includes(
              "normalize-space("
            )
          ) {
            score += 8;
          }

          if (!bestResult) {
            bestResult = {
              xpath,
              score,
              traversalPath:
                candidate.traversalPath,
              traversalOrder:
                candidate.traversalOrder,
            };

            continue;
          }

          const traversalComparison =
            compareGraphTraversalPath(
              candidate.traversalPath,
              bestResult.traversalPath
            );

          if (
            traversalComparison < 0 ||
            (
              traversalComparison === 0 &&
              candidate.traversalOrder <
                bestResult.traversalOrder
            ) ||
            (
              traversalComparison === 0 &&
              candidate.traversalOrder ===
                bestResult.traversalOrder &&
              score <
                bestResult.score
            )
          ) {
            bestResult = {
              xpath,
              score,
              traversalPath:
                candidate.traversalPath,
              traversalOrder:
                candidate.traversalOrder,
            };
          }
        }
      }
    }

    return (
      bestResult?.xpath ||
      ""
    );
  }

  function splitGraphCandidates(
    candidates
  ) {
    const attributeCandidates =
      new Map();

    const textCandidates =
      new Map();

    for (
      const [
        key,
        candidate,
      ] of candidates
    ) {
      if (
        candidate.kind ===
        "attribute"
      ) {
        if (
          isGraphAttributeValueQuarantined(
            candidate.attributeValue
          )
        ) {
          continue;
        }

        attributeCandidates.set(
          key,
          candidate
        );
      } else if (
        candidate.kind === "text"
      ) {
        textCandidates.set(
          key,
          candidate
        );
      }
    }

    return {
      attributeCandidates,
      textCandidates,
    };
  }

  function findBestGraphXPath(
    target
  ) {
    const candidates =
      collectGraphCandidates(
        target
      );

    proveGraphCandidateUniqueness(
      target,
      candidates
    );

    if (!candidates.size) {
      return "";
    }

    const {
      attributeCandidates,
      textCandidates,
    } = splitGraphCandidates(
      candidates
    );

    let xpath =
      findBestGraphXPathForCandidates(
        target,
        attributeCandidates,
        false
      );

    if (
      xpath &&
      !containsQuarantinedAttributeValue(
        xpath
      )
    ) {
      return xpath;
    }

    xpath =
      findBestGraphXPathForCandidates(
        target,
        attributeCandidates,
        true
      );

    if (
      xpath &&
      !containsQuarantinedAttributeValue(
        xpath
      )
    ) {
      return xpath;
    }

    xpath =
      findBestGraphXPathForCandidates(
        target,
        textCandidates,
        false
      );

    if (
      xpath &&
      !containsQuarantinedAttributeValue(
        xpath
      )
    ) {
      return xpath;
    }

    xpath =
      findBestGraphXPathForCandidates(
        target,
        textCandidates,
        true
      );

    return (
      xpath &&
      !containsQuarantinedAttributeValue(
        xpath
      )
    )
      ? xpath
      : "";
  }

  function findBestNormalizeGraphXPath(
    target
  ) {
    const candidates =
      collectGraphCandidates(
        target
      );

    proveGraphCandidateUniqueness(
      target,
      candidates
    );

    const {
      textCandidates,
    } = splitGraphCandidates(
      candidates
    );

    let xpath =
      findBestGraphXPathForCandidates(
        target,
        textCandidates,
        false
      );

    if (
      xpath &&
      !containsQuarantinedAttributeValue(
        xpath
      ) &&
      /normalize-space\s*\(/i.test(
        xpath
      )
    ) {
      return xpath;
    }

    xpath =
      findBestGraphXPathForCandidates(
        target,
        textCandidates,
        true
      );

    return (
      xpath &&
      !containsQuarantinedAttributeValue(
        xpath
      ) &&
      /normalize-space\s*\(/i.test(
        xpath
      )
    )
      ? xpath
      : "";
  }

  function getNormalClickXPath(
    element
  ) {
    if (
      !(
        element instanceof
        Element
      )
    ) {
      return "";
    }

    const graphXPath =
      findBestGraphXPath(
        element
      );

    if (
      graphXPath &&
      !containsNumericPosition(
        graphXPath
      ) &&
      !containsQuarantinedAttributeValue(
        graphXPath
      ) &&
      matchesOnlyElement(
        graphXPath,
        element
      )
    ) {
      return graphXPath;
    }

    return "";
  }

  function getSelector(
    element
  ) {
    const target =
      getXPathFriendlyTarget(
        element
      );

    if (
      !target ||
      target.tagName === "HTML" ||
      target.tagName === "BODY"
    ) {
      return "";
    }

    const xpath =
      findBestGraphXPath(
        target
      );

    if (
      !xpath ||
      containsNumericPosition(xpath) ||
      containsQuarantinedAttributeValue(
        xpath
      ) ||
      !matchesOnlyElement(
        xpath,
        target
      )
    ) {
      return "";
    }

    return `xpath=${xpath}`;
  }

  function getIframeSelector(
    element
  ) {
    if (!element) {
      return "iframe";
    }

    const selector =
      getSelector(element);

    return selector || "iframe";
  }

  function getHardcodedBackupXPath(
    element
  ) {
    if (
      !(
        element instanceof
        Element
      )
    ) {
      return "";
    }

    const doc =
      element.ownerDocument ||
      document;

    const baseXPath =
      `//${getXPathTag(
        element
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
        result.snapshotItem(index) ===
        element
      ) {
        const backupXPath =
          `(${baseXPath})` +
          `[${index + 1}]`;

        return matchesOnlyElement(
          backupXPath,
          element
        )
          ? backupXPath
          : "";
      }
    }

    return "";
  }

  function getElementAttributes(
    element
  ) {
    if (!element) {
      return {};
    }

    const type =
      getNonQuarantinedAttributeValue(
        element,
        "type"
      );

    const safeAttributes =
      getNonQuarantinedAttributes(
        element
      );

    const allAttributes =
      Object.fromEntries(
        safeAttributes.map(
          attribute => [
            attribute.name,
            attribute.value,
          ]
        )
      );

    return {
      tagName:
        element.tagName
          ?.toLowerCase() ||
        null,

      attributes:
        Object.keys(
          allAttributes
        ).length
          ? allAttributes
          : null,

      id:
        getNonQuarantinedAttributeValue(
          element,
          "id"
        ) ||
        null,

      name:
        getNonQuarantinedAttributeValue(
          element,
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
              getNonQuarantinedAttributeValue(
                element,
                "value"
              ) ||
              null
            )
          : null,

      neighborText:
        getChoiceInputNeighborText(
          element
        ) ||
        null,

      href:
        getNonQuarantinedAttributeValue(
          element,
          "href"
        ) ||
        null,

      role:
        getNonQuarantinedAttributeValue(
          element,
          "role"
        ) ||
        null,

      ariaLabel:
        getNonQuarantinedAttributeValue(
          element,
          "aria-label"
        ) ||
        null,

      xTooltip:
        getNonQuarantinedAttributeValue(
          element,
          "x-tooltip"
        ) ||
        null,

      wireClick:
        getNonQuarantinedAttributeValue(
          element,
          "wire:click"
        ) ||
        null,

      testId:
        getNonQuarantinedAttributeValue(
          element,
          "data-testid"
        ) ||
        null,

      dataTest:
        getNonQuarantinedAttributeValue(
          element,
          "data-test"
        ) ||
        null,

      dataCy:
        getNonQuarantinedAttributeValue(
          element,
          "data-cy"
        ) ||
        null,

      dataLabel:
        getNonQuarantinedAttributeValue(
          element,
          "data-label"
        ) ||
        null,

      placeholder:
        getNonQuarantinedAttributeValue(
          element,
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
      let currentWindow =
        window;

      while (
        currentWindow !==
        currentWindow.top
      ) {
        const parentWindow =
          currentWindow.parent;

        const iframeElement =
          Array.from(
            parentWindow.document
              .querySelectorAll(
                "iframe"
              )
          ).find(frame => {
            try {
              return (
                frame.contentWindow ===
                currentWindow
              );
            } catch {
              return false;
            }
          });

        frameChain.unshift(
          iframeElement
            ? getIframeSelector(
                iframeElement
              )
            : "iframe(unknown)"
        );

        currentWindow =
          parentWindow;
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
            current.getRootNode?.();

          if (
            !root ||
            !root.host
          ) {
            break;
          }

          shadowHosts.unshift(
            getSelector(root.host)
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
            frameChain.length > 0,

          shadowHosts:
            shadowHosts.filter(
              Boolean
            ),

          isShadowDom:
            shadowHosts.length > 0,
        }
      );

    delete enriched.elementHandle;

    return omitNullFields(
      enriched
    );
  }

  function dispatch(
    data
  ) {
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
          event.source === window ||
          !event.data ||
          !event.data.__pwAction ||
          typeof window
            .__captureAction !==
            "function"
        ) {
          return;
        }

        window.__captureAction(
          event.data.data
        );
      }
    );
  }

  let inputTimer;
  let scrollTimer;
  let actionSequence = 0;
  let pendingPointerClick =
    null;

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
    element
  ) {
    if (
      !element ||
      !element.tagName
    ) {
      return null;
    }

    const safeAttributes =
      getNonQuarantinedAttributes(
        element
      );

    return {
      tag:
        element.localName ||
        element.tagName
          .toLowerCase(),

      text:
        getGraphNormalizedText(
          element
        ).slice(0, 150),

      attributes:
        Object.fromEntries(
          safeAttributes.map(
            attribute => [
              attribute.name,
              attribute.value,
            ]
          )
        ),
    };
  }

  function getPrimaryNormalizeXPath(
    element
  ) {
    if (
      !(
        element instanceof
        Element
      )
    ) {
      return "";
    }

    const xpath =
      findBestNormalizeGraphXPath(
        element
      );

    return (
      xpath &&
      !containsNumericPosition(xpath) &&
      !containsQuarantinedAttributeValue(
        xpath
      ) &&
      /normalize-space\s*\(/i.test(
        xpath
      ) &&
      matchesOnlyElement(
        xpath,
        element
      )
    )
      ? xpath
      : "";
  }

  function getInnermostActionableTarget(
    event,
    fallbackElement = null
  ) {
    const eventPath =
      typeof event.composedPath ===
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
      fallbackElement instanceof
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
    rawElement,
    inputMethod
  ) {
    const element =
      getInnermostActionableTarget(
        event,
        rawElement
      );

    if (
      !element ||
      !element.tagName ||
      !element.isConnected
    ) {
      return null;
    }

    const tag =
      element.localName ||
      element.tagName
        .toLowerCase();

    if (
      tag === "html" ||
      tag === "body"
    ) {
      return null;
    }

    const normalXPath =
      getNormalClickXPath(
        element
      );

    if (!normalXPath) {
      console.warn(
        "Could not generate non-positional, non-quarantined graph XPath before click:",
        element
      );

      return null;
    }

    const backupXPath =
      getHardcodedBackupXPath(
        element
      );

    if (!backupXPath) {
      console.warn(
        "Could not generate backup_xpath before click:",
        element
      );

      return null;
    }

    const primaryXPath =
      getPrimaryNormalizeXPath(
        element
      ) ||
      backupXPath;

    if (
      containsQuarantinedAttributeValue(
        normalXPath
      ) ||
      (
        primaryXPath !==
          backupXPath &&
        containsQuarantinedAttributeValue(
          primaryXPath
        )
      ) ||
      !matchesOnlyElement(
        normalXPath,
        element
      ) ||
      !matchesOnlyElement(
        primaryXPath,
        element
      ) ||
      !matchesOnlyElement(
        backupXPath,
        element
      )
    ) {
      console.warn(
        "Pre-click XPath validation failed:",
        {
          normalXPath,
          primaryXPath,
          backupXPath,
          element,
        }
      );

      return null;
    }

    const text =
      getGraphNormalizedText(
        element
      ).slice(0, 100) ||
      null;

    return {
      target:
        element,

      inputMethod,

      normalXPath,

      selector:
        `xpath=${normalXPath}`,

      primaryXPath,

      backupXPath,

      text,

      element:
        getElementAttributes(
          element
        ),

      fingerprint:
        getElementFingerprint(
          element
        ),
    };
  }

  function isStoredClickSnapshotValid(
    snapshot
  ) {
    if (
      !snapshot ||
      !(
        snapshot.target instanceof
        Element
      ) ||
      !snapshot.target.isConnected
    ) {
      return false;
    }

    const primaryUsesBackup =
      snapshot.primaryXPath ===
      snapshot.backupXPath;

    return (
      !containsNumericPosition(
        snapshot.normalXPath
      ) &&
      !containsQuarantinedAttributeValue(
        snapshot.normalXPath
      ) &&
      (
        primaryUsesBackup ||
        !containsQuarantinedAttributeValue(
          snapshot.primaryXPath
        )
      ) &&
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

  function createClickXPathKey(
    snapshot
  ) {
    if (!snapshot?.normalXPath) {
      return "";
    }

    if (
      containsQuarantinedAttributeValue(
        snapshot.normalXPath
      )
    ) {
      return "";
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
          event.isTrusted === false ||
          event.button !== 0 ||
          !isRealUserFrame()
        ) {
          pendingPointerClick =
            null;

          return;
        }

        const rawElement =
          event.composedPath
            ? event.composedPath()[0]
            : event.target;

        if (
          !rawElement ||
          !rawElement.tagName ||
          rawElement.tagName
            .toLowerCase() ===
            "x-pw-glass"
        ) {
          pendingPointerClick =
            null;

          return;
        }

        /*
         * Duplicate listeners handling this same pointerdown receive the same
         * deterministic gesture ID.
         */
        const gestureId =
          createPointerGestureId(
            event
          );

        const snapshot =
          createValidatedClickSnapshot(
            event,
            rawElement,
            "pointer"
          );

        if (!snapshot) {
          pendingPointerClick =
            null;

          return;
        }

        pendingPointerClick = {
          ...snapshot,

          gestureId,

          pointerId:
            Number.isFinite(
              event.pointerId
            )
              ? event.pointerId
              : 0,

          pointerType:
            String(
              event.pointerType ||
              "mouse"
            ),

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
      let xpathKey = "";
      let gestureId = "";
      let gestureReserved =
        false;

      try {
        if (
          event.isTrusted === false ||
          !isRealUserFrame()
        ) {
          return;
        }

        let clickSnapshot =
          null;

        if (pendingPointerClick) {
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
              pointerClick.timeStamp
            ) >
            POINTER_CLICK_MAX_AGE_MS
          ) {
            return;
          }

          const rawElement =
            event.composedPath
              ? event.composedPath()[0]
              : event.target;

          const clickTarget =
            getInnermostActionableTarget(
              event,
              rawElement
            );

          if (
            clickTarget !==
            pointerClick.target
          ) {
            console.warn(
              "Pointerdown and click resolved to different elements:",
              {
                pointerdownTarget:
                  pointerClick.target,

                clickTarget,
              }
            );

            return;
          }

          clickSnapshot =
            pointerClick;

          gestureId =
            pointerClick.gestureId ||
            "";
        } else if (
          event.detail === 0
        ) {
          const rawElement =
            event.composedPath
              ? event.composedPath()[0]
              : event.target;

          if (
            !rawElement ||
            !rawElement.tagName ||
            rawElement.tagName
              .toLowerCase() ===
              "x-pw-glass"
          ) {
            return;
          }

          const keyboardSnapshot =
            createValidatedClickSnapshot(
              event,
              rawElement,
              "keyboard"
            );

          if (!keyboardSnapshot) {
            return;
          }

          gestureId =
            createKeyboardGestureId(
              event,
              keyboardSnapshot
            );

          clickSnapshot = {
            ...keyboardSnapshot,

            gestureId,
          };
        } else {
          return;
        }

        if (!clickSnapshot) {
          return;
        }

        if (!gestureId) {
          gestureId =
            clickSnapshot.gestureId ||
            "";
        }

        if (!gestureId) {
          console.warn(
            "[click-recorder] Could not create gesture ID."
          );

          return;
        }

        /*
         * This synchronous shared reservation is the primary duplicate-click
         * guard. Only one listener can reserve a physical gesture.
         */
        if (
          !reserveClickGesture(
            gestureId
          )
        ) {
          console.warn(
            [
              "[click-recorder]",
              "Duplicate action from the same physical click ignored.",
              `gestureId=${gestureId}`,
            ].join(" ")
          );

          return;
        }

        gestureReserved =
          true;

        if (
          !isStoredClickSnapshotValid(
            clickSnapshot
          )
        ) {
          releaseClickGesture(
            gestureId
          );

          gestureReserved =
            false;

          console.warn(
            "Stored pre-click XPath values no longer point to the exact clicked element:",
            {
              gestureId,

              selector:
                clickSnapshot.selector,

              primaryXPath:
                clickSnapshot
                  .primaryXPath,

              backupXPath:
                clickSnapshot
                  .backupXPath,

              element:
                clickSnapshot.target,
            }
          );

          return;
        }

        xpathKey =
          createClickXPathKey(
            clickSnapshot
          );

        if (!xpathKey) {
          releaseClickGesture(
            gestureId
          );

          gestureReserved =
            false;

          console.warn(
            "[click-recorder] Could not create non-quarantined XPath dedupe key."
          );

          return;
        }

        if (
          !reserveClickXPath(
            xpathKey
          )
        ) {
          releaseClickGesture(
            gestureId
          );

          gestureReserved =
            false;

          console.warn(
            [
              "[click-recorder]",
              "Consecutive duplicate XPath ignored.",
              `xpath=${xpathKey}`,
              `gestureId=${gestureId}`,
            ].join(" ")
          );

          return;
        }

        const element =
          clickSnapshot.target;

        const selector =
          clickSnapshot.selector;

        const primaryXPath =
          clickSnapshot.primaryXPath;

        const backupXPath =
          clickSnapshot.backupXPath;

        const text =
          clickSnapshot.text;

        const elementMetadata =
          clickSnapshot.element;

        const fingerprint =
          clickSnapshot.fingerprint;

        const inputMethod =
          clickSnapshot.inputMethod;

        const sequence =
          ++actionSequence;

        /*
         * clickId identifies this physical gesture.
         *
         * xpathKey continues to identify the selector.
         */
        const clickId =
          gestureId;

        const capturedAction =
          prepareAction({
            action:
              "click",

            gestureId,

            clickId,

            xpathKey,

            sequence,

            selector,

            primary_xpath:
              primaryXPath,

            backup_xpath:
              backupXPath,

            elementHandle:
              element,

            text,

            element:
              elementMetadata,
          });

        const job = {
          gestureId,

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

          element:
            elementMetadata,

          capturedAction,

          clickEvent: {
            gestureId,

            inputMethod,

            pointerId:
              Number.isFinite(
                clickSnapshot.pointerId
              )
                ? clickSnapshot.pointerId
                : null,

            pointerType:
              clickSnapshot.pointerType ||
              null,

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
            .__captureClickAction(job)
            .then(result => {
              if (result?.duplicate) {
                /*
                 * Keep the gesture reserved. Another action with the same
                 * physical-click ID has already been accepted.
                 */
                markClickXPathSaved(
                  xpathKey
                );

                console.warn(
                  [
                    "[click-recorder]",
                    "Backend rejected click as duplicate.",
                    `gestureId=${gestureId}`,
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
                releaseClickXPath(
                  xpathKey
                );

                releaseClickGesture(
                  gestureId
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

              releaseClickGesture(
                gestureId
              );

              console.warn(
                "Click capture failed:",
                error
              );
            });

          return;
        }

        dispatch(capturedAction)
          .then(result => {
            if (
              result &&
              result.accepted ===
                false
            ) {
              releaseClickXPath(
                xpathKey
              );

              releaseClickGesture(
                gestureId
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

            releaseClickGesture(
              gestureId
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

        if (
          gestureReserved &&
          gestureId
        ) {
          releaseClickGesture(
            gestureId
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
      clearTimeout(inputTimer);

      const element =
        event.composedPath
          ? event.composedPath()[0]
          : event.target;

      if (
        !element ||
        ![
          "INPUT",
          "TEXTAREA",
        ].includes(
          element.tagName
        ) ||
        !isRealUserFrame()
      ) {
        return;
      }

      inputTimer =
        setTimeout(
          () => {
            const selector =
              getSelector(element);

            if (!selector) {
              return;
            }

            dispatch({
              action:
                "input",

              selector,

              elementHandle:
                element,

              value:
                element.value,

              inputType:
                element.type ||
                "text",

              element:
                getElementAttributes(
                  element
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
      const element =
        event.composedPath
          ? event.composedPath()[0]
          : event.target;

      if (
        !element ||
        !isRealUserFrame()
      ) {
        return;
      }

      const selector =
        getSelector(element);

      if (!selector) {
        return;
      }

      if (
        element.tagName ===
        "SELECT"
      ) {
        dispatch({
          action:
            "select",

          selector,

          elementHandle:
            element,

          value:
            element.value,

          label:
            element.options[
              element.selectedIndex
            ]?.text ||
            null,

          element:
            getElementAttributes(
              element
            ),
        });
      }

      if (
        element.type ===
          "checkbox" ||
        element.type ===
          "radio"
      ) {
        dispatch({
          action:
            element.type,

          selector,

          elementHandle:
            element,

          checked:
            element.checked,

          value:
            element.value ||
            null,

          element:
            getElementAttributes(
              element
            ),
        });
      }

      if (
        element.type ===
        "file"
      ) {
        dispatch({
          action:
            "file-upload",

          selector,

          elementHandle:
            element,

          fileCount:
            element.files.length,

          fileNames:
            Array.from(
              element.files
            ).map(file => {
              return file.name;
            }),

          element:
            getElementAttributes(
              element
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
        if (!isRealUserFrame()) {
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
        // Ignore load capture failures.
      }
    }
  );

  window.addEventListener(
    "scroll",
    () => {
      clearTimeout(scrollTimer);

      scrollTimer =
        setTimeout(
          () => {
            if (!isRealUserFrame()) {
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
      const element =
        event.composedPath
          ? event.composedPath()[0]
          : event.target;

      if (
        !element ||
        ![
          "INPUT",
          "TEXTAREA",
          "SELECT",
        ].includes(
          element.tagName
        ) ||
        !isRealUserFrame()
      ) {
        return;
      }

      const selector =
        getSelector(element);

      if (!selector) {
        return;
      }

      dispatch({
        action:
          "focus",

        selector,

        elementHandle:
          element,

        element:
          getElementAttributes(
            element
          ),
      });
    },
    true
  );
}

module.exports = {
  injectListeners,
};