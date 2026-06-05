// Glue: send user actions to backend, apply HTML deltas
// VibeOS — AI-simulated Windows XP bridge between frontend and Harbour backend

(function () {
    'use strict';

    /**
     * Send a user action payload to the backend via XMLHttpRequest.
     * @param {Object} payload - Action data to send
     */
    window.vibeSend = function (payload) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/action', true);
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.onload = function () {
            if (xhr.status === 200) {
                var response;
                try {
                    response = JSON.parse(xhr.responseText);
                } catch (e) {
                    console.error('vibeSend: failed to parse response', e);
                    return;
                }
                if (Array.isArray(response)) {
                    for (var i = 0; i < response.length; i++) {
                        applyDelta(response[i]);
                    }
                } else {
                    applyDelta(response);
                }
            } else {
                console.error('vibeSend: HTTP ' + xhr.status, xhr.responseText);
            }
        };

        xhr.onerror = function () {
            console.error('vibeSend: network error');
        };

        xhr.send(JSON.stringify(payload));
    };

    /**
     * Apply a single DOM delta operation.
     * @param {Object} delta - Delta object with at least id and op
     */
    function applyDelta(delta) {
        // Guard: delta must have id and op
        if (!delta || !delta.id || !delta.op) {
            console.warn('applyDelta: invalid delta (missing id or op)', delta);
            return;
        }

        var el = document.getElementById(delta.id);
        if (!el) {
            console.warn('applyDelta: element not found #' + delta.id);
            return;
        }

        switch (delta.op) {
            case 'replace':
                el.outerHTML = delta.html || '';
                break;
            case 'inner':
                el.innerHTML = delta.html || '';
                break;
            case 'before':
                el.insertAdjacentHTML('beforebegin', delta.html || '');
                break;
            case 'after':
                el.insertAdjacentHTML('afterend', delta.html || '');
                break;
            case 'remove':
                el.remove();
                break;
            case 'append':
                el.insertAdjacentHTML('beforeend', delta.html || '');
                break;
            case 'value':
                el.value = delta.value || '';
                break;
            case 'attr':
                el.setAttribute(delta.attr, delta.val);
                break;
            default:
                console.warn('applyDelta: unknown op "' + delta.op + '", falling back to inner');
                el.innerHTML = delta.html || '';
                break;
        }
    }

    // Expose applyDelta globally
    window.vibeApplyDelta = applyDelta;

    // -----------------------------------------------------------------------
    // Click Interception
    // -----------------------------------------------------------------------
    document.addEventListener('click', function (e) {
        // Skip if handled by xp.js (e.g., context menu)
        if (e.defaultPrevented) {
            return;
        }

        // Find the closest ancestor with an id
        var target = e.target;
        var el = null;
        while (target) {
            if (target.id) {
                el = target;
                break;
            }
            target = target.parentElement;
        }
        if (!el) {
            return;
        }

        // Skip system elements managed by xp.js
        var id = el.id;
        if (id === 'btn-start' || id === 'start-menu') {
            return;
        }

        var payload = {
            action: 'click',
            id: id
        };

        // If element has data-action attribute, send that as the command
        var dataAction = el.getAttribute('data-action');
        if (dataAction) {
            payload.command = dataAction;
        } else {
            payload.tag = el.tagName.toLowerCase();
            var text = (el.textContent || '').trim();
            payload.text = text.substring(0, 100);
        }

        window.vibeSend(payload);
    }, false);

    // -----------------------------------------------------------------------
    // Input Interception
    // -----------------------------------------------------------------------
    document.addEventListener('input', function (e) {
        var el = e.target;
        if (!el || !el.id) {
            return;
        }
        var tag = el.tagName.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
            return;
        }

        var value;
        var type = el.getAttribute('type') || 'text';

        if (type === 'checkbox' || type === 'radio') {
            value = el.checked;
        } else {
            value = el.value;
        }

        window.vibeSend({
            action: 'input',
            id: el.id,
            value: value,
            type: type
        });
    }, false);

    // -----------------------------------------------------------------------
    // Form Submission Interception
    // -----------------------------------------------------------------------
    document.addEventListener('submit', function (e) {
        e.preventDefault();

        var form = e.target;
        if (!form) {
            return;
        }

        var data = {};
        var elements = form.elements;
        for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            if (!el.name) {
                continue;
            }
            var tag = el.tagName.toLowerCase();
            var type = (el.getAttribute('type') || '').toLowerCase();

            if (tag === 'input' && (type === 'checkbox' || type === 'radio')) {
                if (el.checked) {
                    // For radio groups, only send the checked one
                    data[el.name] = el.value;
                }
                continue;
            }

            if (tag === 'select' && el.multiple) {
                var values = [];
                for (var j = 0; j < el.options.length; j++) {
                    if (el.options[j].selected) {
                        values.push(el.options[j].value);
                    }
                }
                data[el.name] = values;
                continue;
            }

            data[el.name] = el.value;
        }

        window.vibeSend({
            action: 'submit',
            id: form.id || '',
            data: data
        });
    }, false);

    console.log('vibe.js loaded');
})();
