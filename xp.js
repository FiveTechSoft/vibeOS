(function () {
  'use strict';

  // ---------------------------------------------------------------
  // 1. Menu Bar dropdowns
  // ---------------------------------------------------------------
  document.addEventListener('click', function (e) {
    // Close all context menus first
    var ctx = document.querySelector('.context-menu');
    if (ctx && !ctx.contains(e.target)) {
      ctx.style.display = 'none';
    }

    // Close all menus
    var allItems = document.querySelectorAll('.menu-item');
    for (var i = 0; i < allItems.length; i++) {
      allItems[i].classList.remove('active');
    }

    // If we clicked a menu-item, activate it
    var menuItem = e.target.closest('.menu-item');
    if (menuItem) {
      menuItem.classList.add('active');
      e.stopPropagation();
    }

    // Hide start menu when clicking elsewhere
    var startMenu = document.getElementById('start-menu');
    if (startMenu && startMenu.style.display !== 'none' && !e.target.closest('#btn-start') && !e.target.closest('#start-menu')) {
      startMenu.style.display = 'none';
    }
  });

  // Hover switching — mouseover on menu-item
  document.addEventListener('mouseover', function (e) {
    var item = e.target.closest('.menu-item');
    if (!item) return;

    var parent = item.parentNode;
    if (!parent) return;

    var siblings = parent.children;
    for (var i = 0; i < siblings.length; i++) {
      if (siblings[i] !== item && siblings[i].classList) {
        siblings[i].classList.remove('active');
      }
    }
    item.classList.add('active');
  });

  // Escape key closes all active menus
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var activeItems = document.querySelectorAll('.menu-item.active');
      for (var i = 0; i < activeItems.length; i++) {
        activeItems[i].classList.remove('active');
      }
    }
  });

  // ---------------------------------------------------------------
  // 2. Tab switching
  // ---------------------------------------------------------------
  document.addEventListener('click', function (e) {
    var tab = e.target.closest('button[role="tab"]');
    if (!tab) return;

    var panelId = tab.getAttribute('aria-controls');
    if (!panelId) return;

    var tabsSection = tab.closest('.tabs');
    if (!tabsSection) return;

    // Deactivate all tabs in this section
    var allTabs = tabsSection.querySelectorAll('button[role="tab"]');
    for (var i = 0; i < allTabs.length; i++) {
      allTabs[i].setAttribute('aria-selected', 'false');
    }

    // Activate this tab
    tab.setAttribute('aria-selected', 'true');

    // Show corresponding panel
    var allPanels = tabsSection.querySelectorAll('[role="tabpanel"]');
    for (var i = 0; i < allPanels.length; i++) {
      allPanels[i].classList.remove('active');
    }

    var panel = document.getElementById(panelId);
    if (panel) {
      panel.classList.add('active');
    }
  });

  // ---------------------------------------------------------------
  // 3. Tree View expand/collapse
  // ---------------------------------------------------------------
  document.addEventListener('click', function (e) {
    var li = e.target.closest('ul.tree-view li');
    if (!li) return;

    var childUl = li.querySelector(':scope > ul');
    if (!childUl) return;

    li.classList.toggle('expanded');
    e.stopPropagation();
  });

  // ---------------------------------------------------------------
  // 4. Window dragging + resizing
  // ---------------------------------------------------------------
  var dragState = null;
  var RESIZE_EDGE = 8; // px from edge to trigger resize

  function getResizeDir(win, clientX, clientY) {
    var r = win.getBoundingClientRect();
    var onRight  = (clientX >= r.right  - RESIZE_EDGE && clientX <= r.right  + RESIZE_EDGE);
    var onBottom = (clientY >= r.bottom - RESIZE_EDGE && clientY <= r.bottom + RESIZE_EDGE);
    var onLeft   = (clientX >= r.left   - RESIZE_EDGE && clientX <= r.left   + RESIZE_EDGE);
    var onTop    = (clientY >= r.top    - RESIZE_EDGE && clientY <= r.top    + RESIZE_EDGE);
    if (onRight && onBottom) return 'se';
    if (onRight && onTop)    return 'ne';
    if (onLeft  && onBottom) return 'sw';
    if (onLeft  && onTop)    return 'nw';
    if (onRight)  return 'e';
    if (onBottom) return 's';
    if (onLeft)   return 'w';
    if (onTop)    return 'n';
    return null;
  }

  document.addEventListener('mousedown', function (e) {
    // Check for resize first (edge grab)
    var win = e.target.closest('.window');
    if (win && !win.classList.contains('maximized')) {
      var dir = getResizeDir(win, e.clientX, e.clientY);
      if (dir && !e.target.closest('button') && !e.target.closest('input') && !e.target.closest('textarea')) {
        var r = win.getBoundingClientRect();
        dragState = {
          win: win, dir: dir, resize: true,
          startX: e.clientX, startY: e.clientY,
          origW: r.width, origH: r.height,
          origLeft: r.left, origTop: r.top
        };
        e.preventDefault();
        return;
      }
    }

    // Check for title bar drag
    var titleBar = e.target.closest('.title-bar');
    if (!titleBar) return;
    if (e.target.closest('button')) return;

    win = titleBar.closest('.window');
    if (!win || win.classList.contains('maximized')) return;

    dragState = {
      win: win, dir: null, resize: false,
      startX: e.clientX, startY: e.clientY,
      origLeft: win.offsetLeft, origTop: win.offsetTop
    };

    // Increase z-index
    var maxZ = 0;
    var allWindows = document.querySelectorAll('.window');
    for (var i = 0; i < allWindows.length; i++) {
      var z = parseInt(allWindows[i].style.zIndex, 10);
      if (z > maxZ) maxZ = z;
    }
    win.style.zIndex = maxZ + 100;

    e.preventDefault();
  });

  document.addEventListener('mousemove', function (e) {
    if (!dragState) {
      // Update cursor for resize hints
      var win = e.target.closest('.window');
      if (win && !win.classList.contains('maximized')) {
        var dir = getResizeDir(win, e.clientX, e.clientY);
        if (dir && !e.target.closest('button') && !e.target.closest('input') && !e.target.closest('textarea')) {
          var cursors = { n:'ns-resize', s:'ns-resize', e:'ew-resize', w:'ew-resize',
                         ne:'nesw-resize', sw:'nesw-resize', nw:'nwse-resize', se:'nwse-resize' };
          win.style.cursor = cursors[dir] || '';
          return;
        }
      }
      if (win) win.style.cursor = '';
      return;
    }

    if (dragState.resize) {
      var dx = e.clientX - dragState.startX;
      var dy = e.clientY - dragState.startY;
      var dir = dragState.dir;
      var w = dragState.win;

      if (dir.indexOf('e') >= 0) w.style.width  = Math.max(250, dragState.origW + dx) + 'px';
      if (dir.indexOf('w') >= 0) { w.style.width = Math.max(250, dragState.origW - dx) + 'px'; w.style.left = (dragState.origLeft + dx) + 'px'; }
      if (dir.indexOf('s') >= 0) w.style.height = Math.max(120, dragState.origH + dy) + 'px';
      if (dir.indexOf('n') >= 0) { w.style.height = Math.max(120, dragState.origH - dy) + 'px'; w.style.top = (dragState.origTop + dy) + 'px'; }
    } else {
      var dx2 = e.clientX - dragState.startX;
      var dy2 = e.clientY - dragState.startY;
      dragState.win.style.left = (dragState.origLeft + dx2) + 'px';
      dragState.win.style.top  = (dragState.origTop  + dy2) + 'px';
    }
  });

  document.addEventListener('mouseup', function () {
    dragState = null;
  });

  // ---------------------------------------------------------------
  // 5. Window focus on click
  // ---------------------------------------------------------------
  document.addEventListener('mousedown', function (e) {
    var win = e.target.closest('.window');
    if (!win) return;

    var maxZ = 0;
    var allWindows = document.querySelectorAll('.window');
    for (var i = 0; i < allWindows.length; i++) {
      var z = parseInt(allWindows[i].style.zIndex, 10);
      if (!isNaN(z) && z > maxZ) maxZ = z;
    }

    win.style.zIndex = maxZ + 1;
  });

  // ---------------------------------------------------------------
  // 6. Start menu toggle
  // ---------------------------------------------------------------
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('#btn-start');
    if (!btn) return;

    var startMenu = document.getElementById('start-menu');
    if (!startMenu) return;

    if (startMenu.style.display === 'none' || startMenu.style.display === '') {
      startMenu.style.display = 'flex';
    } else {
      startMenu.style.display = 'none';
    }

    e.stopPropagation();
  });

  // ---------------------------------------------------------------
  // 7. Window controls (min / max / close)
  // ---------------------------------------------------------------
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.title-bar-controls button');
    if (!btn) return;

    var win = btn.closest('.window');
    if (!win) return;

    if (btn.classList.contains('min-btn')) {
      win.style.display = 'none';
    } else if (btn.classList.contains('max-btn')) {
      win.classList.toggle('maximized');
    } else if (btn.classList.contains('close-btn')) {
      win.remove();
    }

    e.stopPropagation();
  });

  // ---------------------------------------------------------------
  // 8. Context menu on right-click
  // ---------------------------------------------------------------
  document.addEventListener('contextmenu', function (e) {
    var trigger = e.target.closest('[data-context]');
    if (!trigger) return;

    var ctxMenu = document.getElementById('ctx-menu');
    if (!ctxMenu) return;

    e.preventDefault();

    ctxMenu.style.display = 'block';
    ctxMenu.style.left = e.clientX + 'px';
    ctxMenu.style.top = e.clientY + 'px';
  });

  // ---------------------------------------------------------------
  // 9. Desktop icon double-click
  // ---------------------------------------------------------------
  document.addEventListener('dblclick', function (e) {
    var icon = e.target.closest('.desktop-icon');
    if (!icon) return;

    var action = icon.getAttribute('data-action');
    if (!action) return;

    if (typeof window.vibeSend === 'function') {
      window.vibeSend({ action: 'dblclick', target: action, id: icon.id });
    }
  });

})();
