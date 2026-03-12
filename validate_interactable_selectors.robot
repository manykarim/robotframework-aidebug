*** Settings ***
Library    Browser
Suite Setup    Open Demo Shop
Suite Teardown    Close Browser

*** Variables ***
${SHOP_URL}    https://demoshop.makrocode.de/
${HEADLESS}    ${TRUE}

*** Test Cases ***
Validate Selectors For Every Interactable Element
    ${selector_rows}=    Collect Interactable Selector Rows
    ${total}=    Get Length    ${selector_rows}
    Should Be True    ${total} > 0

    FOR    ${row}    IN    @{selector_rows}
        ${selector}=    Set Variable    ${row}[selector]
        ${expected_index}=    Set Variable    ${row}[index]

        ${count}=    Get Element Count    css=${selector}
        Should Be Equal As Integers    ${count}    1

        ${index}=    Evaluate JavaScript    ${selector}    (el) => Number(el.getAttribute('data-rf-index'))
        Should Be Equal As Integers    ${index}    ${expected_index}
    END

*** Keywords ***
Open Demo Shop
    New Browser    browser=chromium    headless=${HEADLESS}
    New Context
    New Page    ${SHOP_URL}

Collect Interactable Selector Rows
    ${rows}=    Evaluate JavaScript    body    () => {
    ...    const hasVisibleBox = (el) => {
    ...      const style = window.getComputedStyle(el);
    ...      if (style.visibility === 'hidden' || style.display === 'none') return false;
    ...      const rect = el.getBoundingClientRect();
    ...      return rect.width > 0 && rect.height > 0;
    ...    };
    ...
    ...    const buildPathSelector = (el) => {
    ...      let node = el;
    ...      const segments = [];
    ...      while (node && node.nodeType === 1 && segments.length < 12) {
    ...        const tag = node.tagName.toLowerCase();
    ...        if (node.id) {
    ...          segments.unshift('#' + CSS.escape(node.id));
    ...          break;
    ...        }
    ...        const parent = node.parentElement;
    ...        if (!parent) {
    ...          segments.unshift(tag);
    ...          break;
    ...        }
    ...        const siblings = Array.from(parent.children).filter((s) => s.tagName === node.tagName);
    ...        const index = siblings.indexOf(node) + 1;
    ...        segments.unshift(tag + ':nth-of-type(' + index + ')');
    ...        node = parent;
    ...      }
    ...      return segments.join(' > ');
    ...    };
    ...
    ...    const interactable = Array.from(document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])'))
    ...      .filter((el) => !el.matches('[disabled], [aria-disabled="true"]'))
    ...      .filter(hasVisibleBox);
    ...
    ...    return interactable.map((el, index) => {
    ...      el.setAttribute('data-rf-index', String(index));
    ...      return {
    ...        index,
    ...        selector: buildPathSelector(el) + '[data-rf-index="' + index + '"]',
    ...      };
    ...    });
    ...  }
    RETURN    ${rows}
