from __future__ import annotations


def get_assertion_suggester_prompt() -> str:
    return """
{
  "navigation": {
    "url_verification": {
      "type": "url-verification",
      "label": "Verify URL",
      "description": "Check if navigation was successful",
      "confidence": "high"
    },
    "title_verification": {
      "type": "title-verification",
      "label": "Verify Page Title",
      "description": "Check if correct page loaded",
      "confidence": "medium"
    },
    "page_load": {
      "type": "page-load",
      "label": "Wait for DOM Content",
      "description": "Ensure page DOM is fully loaded",
      "confidence": "high"
    }
  },
  "click": {
    "element_visible_before": {
      "type": "element-visible-before",
      "label": "Verify element is visible",
      "description": "Confirm the clickable target is on screen before the click",
      "confidence": "high"
    },
    "element_enabled": {
      "type": "element-enabled",
      "label": "Verify element is enabled",
      "description": "Confirm the target can actually be clicked",
      "confidence": "high"
    },
    "button_text": {
      "type": "button-text",
      "label": "Verify button text",
      "description": "Check the button or link label used for this action",
      "confidence": "medium"
    },
    "wait_after_click": {
      "type": "wait-after-click",
      "label": "Wait for page state",
      "description": "Wait for the app to settle after this click",
      "confidence": "high"
    },
    "modal_appears": {
      "type": "modal-appears",
      "label": "Verify modal opens",
      "description": "Check if this click opened the expected dialog",
      "confidence": "high"
    }
  },
  "fill": {
    "input_value": {
      "type": "input-value",
      "label": "Verify input value",
      "description": "Check the exact value that was entered on this line",
      "confidence": "high"
    },
    "input_enabled": {
      "type": "input-enabled",
      "label": "Verify input is editable",
      "description": "Confirm the field stayed enabled while typing",
      "confidence": "high"
    },
    "email_format": {
      "type": "email-format",
      "label": "Verify email format",
      "description": "Check the value matches a valid email shape",
      "confidence": "medium"
    },
    "phone_format": {
      "type": "phone-format",
      "label": "Verify phone format",
      "description": "Check the value matches a phone number pattern",
      "confidence": "medium"
    },
    "password_masked": {
      "type": "password-masked",
      "label": "Verify password is masked",
      "description": "Confirm the password input still uses a masked field",
      "confidence": "high"
    }
  },
  "select": {
    "selected_value": {
      "type": "selected-value",
      "label": "Verify selected value",
      "description": "Check the option chosen on this line",
      "confidence": "high"
    },
    "dropdown_enabled": {
      "type": "dropdown-enabled",
      "label": "Verify dropdown is enabled",
      "description": "Ensure the select control stayed interactive",
      "confidence": "high"
    }
  },
  "checkbox": {
    "checked": {
      "type": "checkbox-state",
      "label": "Verify checkbox checked",
      "description": "Confirm the checkbox state after this action",
      "confidence": "high"
    },
    "unchecked": {
      "type": "checkbox-state",
      "label": "Verify checkbox unchecked",
      "description": "Confirm the checkbox state after this action",
      "confidence": "high"
    },
    "enabled": {
      "type": "checkbox-enabled",
      "label": "Verify checkbox is enabled",
      "description": "Ensure the checkbox is still interactive",
      "confidence": "high"
    }
  },
  "locator": {
    "visible": {
      "type": "element-visible",
      "label": "Verify element is visible",
      "description": "Check that this exact locator resolves on the page",
      "confidence": "high"
    },
    "enabled": {
      "type": "element-enabled",
      "label": "Verify element is enabled",
      "description": "Check that the element is interactive",
      "confidence": "high"
    },
    "attached": {
      "type": "element-attached",
      "label": "Verify element exists in DOM",
      "description": "Check that the element is attached to the page",
      "confidence": "high"
    }
  },
  "context": {
    "page_ready": {
      "type": "page-ready",
      "label": "Verify Page is Ready",
      "description": "Check page is visible after navigation",
      "confidence": "high"
    },
    "form_valid": {
      "type": "form-valid",
      "label": "Verify Form is Valid",
      "description": "Check form has no validation errors",
      "confidence": "medium"
    },
    "modal_overlay": {
      "type": "modal-overlay",
      "label": "Verify Modal Overlay",
      "description": "Check modal backdrop is visible",
      "confidence": "medium"
    }
  }
}
"""