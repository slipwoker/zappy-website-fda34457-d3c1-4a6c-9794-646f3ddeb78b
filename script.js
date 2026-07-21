/* ZAPPY_STOREFRONT_RUNTIME_BOOTSTRAP_V2 */
(function() {
  'use strict';
  var runtimeLoaded = false;
  var runtimePromise = null;
  var runtimeSrc = '/storefront-runtime.js';
  function loadRuntime() {
    if (runtimeLoaded) return Promise.resolve();
    if (runtimePromise) return runtimePromise;
    runtimePromise = new Promise(function(resolve, reject) {
      var existing = document.querySelector('script[data-zappy-storefront-runtime="true"]');
      if (existing) {
        // A previously failed/already-complete tag never fires load again.
        // Treat complete tags as loaded; drop failed tags and recreate.
        if (existing.getAttribute('data-zappy-load-error') === 'true') {
          existing.parentNode && existing.parentNode.removeChild(existing);
        } else if (existing.getAttribute('data-zappy-loaded') === 'true' || existing.readyState === 'complete') {
          runtimeLoaded = true;
          resolve();
          return;
        } else {
          existing.addEventListener('load', function() {
            existing.setAttribute('data-zappy-loaded', 'true');
            runtimeLoaded = true;
            resolve();
          }, { once: true });
          existing.addEventListener('error', function(error) {
            existing.setAttribute('data-zappy-load-error', 'true');
            reject(error);
          }, { once: true });
          return;
        }
      }
      var restoreDOMContentLoaded = installLateDOMContentLoadedReplay();
      var script = document.createElement('script');
      script.src = runtimeSrc;
      script.defer = true;
      script.setAttribute('data-zappy-storefront-runtime', 'true');
      script.onload = function() {
        script.setAttribute('data-zappy-loaded', 'true');
        restoreDOMContentLoaded();
        runtimeLoaded = true;
        resolve();
      };
      script.onerror = function(error) {
        script.setAttribute('data-zappy-load-error', 'true');
        restoreDOMContentLoaded();
        reject(error);
      };
      document.head.appendChild(script);
    }).catch(function(error) {
      runtimePromise = null;
      throw error;
    });
    return runtimePromise;
  }
  function installLateDOMContentLoadedReplay() {
    if (document.readyState === 'loading') return function() {};
    var original = document.addEventListener;
    var restored = false;
    document.addEventListener = function(type, listener, options) {
      if (type === 'DOMContentLoaded' && listener) {
        setTimeout(function() {
          try {
            if (typeof listener === 'function') {
              listener.call(document, new Event('DOMContentLoaded'));
            } else if (listener && typeof listener.handleEvent === 'function') {
              listener.handleEvent(new Event('DOMContentLoaded'));
            }
          } catch (error) {
            setTimeout(function() { throw error; }, 0);
          }
        }, 0);
        return;
      }
      return original.call(document, type, listener, options);
    };
    return function() {
      if (!restored) {
        restored = true;
        document.addEventListener = original;
      }
    };
  }
  window.__zappyLoadStorefrontRuntime = loadRuntime;
  function onReady() {
    loadRuntime();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    onReady();
  }
})();
/* zappy-announcement-bar setupFixedHeaders */

/* ZAPPY_ANNOUNCEMENT_HEADER_SYNC_V4 */
(function(){
  if (window.__zappyAnnouncementHeaderSyncV4) return;
  window.__zappyAnnouncementHeaderSyncV4 = true;
  window.__zappyAnnouncementHeaderSyncV3 = true;
  window.__zappyAnnouncementHeaderSyncV2 = true;
  window.__zappyAnnouncementHeaderSyncV1 = true; // legacy guards

  function primaryHeader() {
    var selectors = [
      'nav#navbar',
      'nav.navbar',
      '.navbar:not(.zappy-catalog-menu)',
      'nav[class*="nav"]',
      'header.navbar',
      'header:not([class*="gallery"]):not([class*="hero"]):not([class*="section"])'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (!el) continue;
      if (el.classList && el.classList.contains('zappy-catalog-menu')) continue;
      if (el.id === 'zappy-catalog-menu') continue;
      if (el.classList && el.classList.contains('mobile-search-panel')) continue;
      if (el.tagName === 'HEADER' && el.closest('section')) continue;
      if (el.classList && (
        el.classList.contains('lookbook-gallery-header') ||
        el.classList.contains('hero-header') ||
        el.classList.contains('section-header') ||
        el.classList.contains('page-header')
      )) continue;
      return el;
    }
    return null;
  }

  function visibleHeight(el) {
    if (!el) return 0;
    var cs;
    try { cs = window.getComputedStyle(el); } catch (e) {}
    if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return 0;
    var r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    return Math.ceil((r && r.height) || el.offsetHeight || 0);
  }

  function sync() {
    var header = primaryHeader();
    var bar = document.querySelector('.zappy-announcement-bar');
    var catalog = document.querySelector('.zappy-catalog-menu');
    var barHeight = visibleHeight(bar);
    if (!header) {
      if (barHeight > 0) document.body.style.setProperty('padding-top', barHeight + 'px', 'important');
      return;
    }

    header.style.setProperty('position', 'fixed', 'important');
    header.style.setProperty('top', barHeight + 'px', 'important');
    header.style.setProperty('left', '0', 'important');
    header.style.setProperty('right', '0', 'important');
    header.style.setProperty('z-index', '100000', 'important');
    header.style.marginBottom = '0';

    var headerHeight = visibleHeight(header);
    var totalHeight = barHeight + headerHeight;
    if (catalog && visibleHeight(catalog) > 0) {
      catalog.style.marginTop = '0';
      catalog.style.setProperty('top', totalHeight + 'px', 'important');
      totalHeight += visibleHeight(catalog);
    }

    document.documentElement.style.setProperty('--header-height', headerHeight + 'px');
    document.documentElement.style.setProperty('--total-header-height', totalHeight + 'px');
    document.documentElement.style.setProperty('--zappy-mobile-menu-top', (barHeight + headerHeight) + 'px');
    document.documentElement.style.setProperty('--zappy-announcement-height', barHeight + 'px');
    document.documentElement.style.setProperty('--zappy-header-stack-height', totalHeight + 'px');
    document.body.style.setProperty('padding-top', totalHeight + 'px', 'important');

    // Transparent nav: pull hero behind the fixed stack immediately.
    // Measure the navbar itself rather than trusting --nav-bg, which can be
    // absent on older published pages or during stylesheet failure. Critical
    // CSS also paints known opaque navbar colors before this runtime executes.
    // Keep selectors aligned with ZAPPY_ANNOUNCEMENT_HEADER_OFFSET_CSS_V3 —
    // never underlap bare main>section:first-child (catalog /products pages).
    var heroEl = document.querySelector('section[data-hero-type^="fullscreen"], .index-hero-section, main > section[class*="hero"]:first-of-type');
    if (heroEl && totalHeight > 0) {
      var headerIsTransparent = false;
      try {
        var headerStyle = getComputedStyle(header);
        var backgroundColor = headerStyle.backgroundColor || '';
        var backgroundImage = headerStyle.backgroundImage || 'none';
        var alphaMatch = backgroundColor.match(/rgba?\([^)]*[,\s]([0-9.]+)\s*\)$/i);
        headerIsTransparent =
          backgroundImage === 'none' &&
          (backgroundColor === 'transparent' || (alphaMatch && parseFloat(alphaMatch[1]) < 0.3));
      } catch (e) {}
      if (headerIsTransparent) {
        heroEl.style.setProperty('margin-top', '-' + totalHeight + 'px', 'important');
        heroEl.style.setProperty('padding-top', totalHeight + 'px', 'important');
        heroEl.setAttribute('data-zappy-nav-underlap', 'true');
      } else if (
        heroEl.getAttribute('data-zappy-nav-underlap') === 'true' ||
        (heroEl.style.marginTop === '-' + totalHeight + 'px' && heroEl.style.paddingTop === totalHeight + 'px')
      ) {
        heroEl.style.removeProperty('margin-top');
        heroEl.style.removeProperty('padding-top');
        heroEl.removeAttribute('data-zappy-nav-underlap');
      }
    }
  }

  var timer = null;
  function schedule(delay) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(sync, delay || 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ schedule(0); });
  } else {
    schedule(0);
  }
  window.addEventListener('load', function(){ schedule(0); });
  window.addEventListener('resize', function(){ schedule(50); }, { passive: true });
  window.addEventListener('zappy:languageChanged', function(){ schedule(50); });
  window.addEventListener('languageChanged', function(){ schedule(50); });
  [50, 150, 350, 750, 1500, 3000].forEach(function(ms){ setTimeout(sync, ms); });

  try {
    new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var mutation = mutations[i];
        var t = mutation.target;
        var classes = t && t.classList;
        if (mutation.type === 'childList') {
          for (var j = 0; j < mutation.addedNodes.length; j++) {
            var node = mutation.addedNodes[j];
            var nodeClasses = node && node.classList;
            if (nodeClasses && (
              nodeClasses.contains('zappy-announcement-bar') ||
              nodeClasses.contains('zappy-catalog-menu') ||
              nodeClasses.contains('navbar')
            )) {
              schedule(0);
              return;
            }
          }
        }
        if (
          (t === document.body && mutation.attributeName === 'class') ||
          (classes && (
          classes.contains('zappy-announcement-bar') ||
          classes.contains('zappy-catalog-menu')
        ))
        ) {
          schedule(0);
          return;
        }
      }
    }).observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  } catch (e) {}
})();

/* nav-menu navbar */


/* ZAPPY_NAV_OVERFLOW_MENU_V1 */
(function(){
  try {
    if (window.__zappyNavOverflowInit) return;
    window.__zappyNavOverflowInit = true;

    var MORE_LABELS = {en:'More',he:'עוד',es:'Más',fr:'Plus',de:'Mehr',it:'Altro',pt:'Mais',ar:'المزيد',ru:'Ещё',nl:'Meer',pl:'Więcej',tr:'Daha',ja:'その他',zh:'更多',hi:'और',sv:'Mer',uk:'Ще',ro:'Mai mult',cs:'Více',da:'Mere',fi:'Lisää',no:'Mer',el:'Περισσότερα'};
    var TOL = 2;
    var mo = null;

    function moreLabel() {
      var lang = (document.documentElement.getAttribute('lang') || 'en').slice(0,2).toLowerCase();
      return MORE_LABELS[lang] || 'More';
    }

    function injectCss() {
      // Always (re)append so our !important rules win the cascade against
      // later site <style> blocks that also target .navbar .sub-menu with
      // position:absolute !important (bug 2026-07: nested dropdowns drained
      // into More stayed absolute and painted over later siblings like Contact).
      var s = document.getElementById('zappy-nav-overflow-css');
      if (!s) {
        s = document.createElement('style');
        s.id = 'zappy-nav-overflow-css';
      }
      s.textContent =
        '@media (min-width:769px){' +
          '.zappy-nav-more-item{position:relative!important;flex:0 0 auto!important;}' +
          '.zappy-nav-more-item>.zappy-nav-more-toggle{cursor:pointer;display:inline-flex!important;align-items:center;gap:6px;white-space:nowrap;}' +
          /* pointer-events:none!important while closed is critical: nested
             flattened submenus used to set pointer-events:auto and re-enable
             hit-testing under an invisible More panel (hover 100px+ below
             still opened עוד). */
          '.navbar .zappy-nav-more-item>.sub-menu{display:block!important;left:auto!important;right:0!important;min-width:200px!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;transform:translateY(6px);transition:opacity .18s ease,visibility .18s ease,transform .18s ease;}' +
          /* Keep right:0 in RTL too. The old left:0 flip made the panel grow
             rightward over the nav links; on RTL More sits on the left of the
             item cluster so the panel must open left under עוד. */
          '.navbar .zappy-nav-more-item:hover>.sub-menu,.navbar .zappy-nav-more-item:focus-within>.sub-menu,.navbar .zappy-nav-more-item.open>.sub-menu{opacity:1!important;visibility:visible!important;pointer-events:auto!important;transform:translateY(0)!important;}' +
          '.zappy-nav-more-item>.sub-menu>li{display:block!important;width:100%!important;flex:0 0 auto!important;}' +
          /* Mobile-only items (hamburger-overlay contact CTA) must never render
             inside the desktop More panel — the display:block above would
             otherwise resurrect them there (duplicate CTA bug, 2026-07). */
          '.zappy-nav-more-item>.sub-menu>li.mobile-contact-link,.zappy-nav-more-item>.sub-menu>li.nav-cta-mobile-item,.zappy-nav-more-item>.sub-menu>li.mobile-only{display:none!important;}' +
          /* Wrap long labels — nowrap + max-content from ecom-routing caused a
             horizontal scrollbar inside More (publish screenshot 2026-07). */
          '.zappy-nav-more-item>.sub-menu{width:min(420px,calc(100vw - 24px))!important;max-width:min(420px,calc(100vw - 24px))!important;overflow-x:hidden!important;overflow-y:auto!important;box-sizing:border-box!important;}' +
          '.zappy-nav-more-item>.sub-menu>li>a{display:block!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important;padding:10px 16px!important;max-width:100%!important;box-sizing:border-box!important;}' +
          /* Nested dropdowns inside More stay in normal flow (not absolute
             flyouts that cover Contact). Collapsed by default — expand only
             when the parent row has .zappy-more-nested-open (chevron toggle). */
          'html body .navbar .zappy-nav-more-item .sub-menu .sub-menu,' +
          'html body .navbar .zappy-nav-more-item > .sub-menu > li > .sub-menu,' +
          'html body nav.navbar .zappy-nav-more-item .sub-menu ul.sub-menu,' +
          'html body .zappy-nav-more-item .sub-menu .sub-menu{' +
            'position:static!important;top:auto!important;left:auto!important;right:auto!important;' +
            'transform:none!important;box-shadow:none!important;min-width:0!important;' +
            'width:100%!important;max-width:100%!important;margin:0!important;' +
            'display:none!important;opacity:0!important;visibility:hidden!important;' +
            'pointer-events:none!important;height:0!important;overflow:hidden!important;padding:0!important;' +
          '}' +
          'html body .navbar .zappy-nav-more-item .zappy-more-nested-open > .sub-menu,' +
          'html body .navbar .zappy-nav-more-item > .sub-menu > li.zappy-more-nested-open > .sub-menu,' +
          'html body .zappy-nav-more-item .zappy-more-nested-open > .sub-menu{' +
            'display:block!important;opacity:1!important;visibility:visible!important;' +
            'pointer-events:auto!important;height:auto!important;' +
            'overflow-x:hidden!important;overflow-y:visible!important;' +
            'padding-inline-start:12px!important;' +
          '}' +
          /* Chevron for nested parents inside More (desktop accordion).
             width:100% + margin-inline-start:auto pins the chevron to the
             inline-start edge of the row in both LTR and RTL (matches preview). */
          '.zappy-nav-more-item>.sub-menu>li.zappy-more-nested-parent>a{' +
            'display:flex!important;align-items:center!important;justify-content:space-between!important;' +
            'gap:8px!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;' +
          '}' +
          '.zappy-nav-more-item>.sub-menu>li.zappy-more-nested-parent>a .dropdown-arrow{' +
            'display:inline-block!important;flex:0 0 auto!important;width:12px!important;height:12px!important;' +
            'margin-inline-start:auto!important;pointer-events:auto!important;cursor:pointer!important;' +
            'transition:transform .2s ease!important;opacity:1!important;visibility:visible!important;' +
          '}' +
          '.zappy-nav-more-item>.sub-menu>li.zappy-more-nested-open>a .dropdown-arrow{transform:rotate(180deg)!important;}' +
        '}' +
        '@media (max-width:768px){.zappy-nav-more-item{display:none!important;}}';
      (document.head || document.documentElement).appendChild(s);
    }

    // Belt-and-suspenders: when a dropdown parent is drained into More, force
    // its nested .sub-menu into normal flow via inline !important so site CSS
    // cannot resurrect position:absolute and cover later More siblings.
    // Do NOT set pointer-events/opacity/visibility here — those must follow
    // the More panel open/closed state (see CSS above) or an invisible nested
    // submenu re-enables hover far below the trigger.
    function flattenNestedSubmenusForMore(li) {
      if (!li || !li.querySelectorAll) return;
      var nested = li.querySelectorAll('.sub-menu');
      for (var i = 0; i < nested.length; i++) {
        var ul = nested[i];
        if (ul.classList && ul.classList.contains('zappy-nav-more-menu')) continue;
        ul.setAttribute('data-zappy-more-flattened', '1');
        ul.style.setProperty('position', 'static', 'important');
        ul.style.setProperty('top', 'auto', 'important');
        ul.style.setProperty('left', 'auto', 'important');
        ul.style.setProperty('right', 'auto', 'important');
        ul.style.setProperty('transform', 'none', 'important');
        ul.style.setProperty('box-shadow', 'none', 'important');
        ul.style.setProperty('min-width', '0', 'important');
        ul.style.setProperty('width', '100%', 'important');
        // Clear any prior pe/opacity/visibility inline locks from older runtimes.
        ul.style.removeProperty('pointer-events');
        ul.style.removeProperty('opacity');
        ul.style.removeProperty('visibility');
        ul.style.removeProperty('display');
        ul.style.removeProperty('height');
      }
    }

    function unflattenNestedSubmenusFromMore(li) {
      if (!li || !li.querySelectorAll) return;
      var nested = li.querySelectorAll('[data-zappy-more-flattened]');
      for (var i = 0; i < nested.length; i++) {
        var ul = nested[i];
        ul.removeAttribute('data-zappy-more-flattened');
        ul.style.removeProperty('position');
        ul.style.removeProperty('top');
        ul.style.removeProperty('left');
        ul.style.removeProperty('right');
        ul.style.removeProperty('opacity');
        ul.style.removeProperty('visibility');
        ul.style.removeProperty('pointer-events');
        ul.style.removeProperty('transform');
        ul.style.removeProperty('box-shadow');
        ul.style.removeProperty('min-width');
        ul.style.removeProperty('width');
        ul.style.removeProperty('display');
        ul.style.removeProperty('height');
      }
      if (li.classList) {
        li.classList.remove('zappy-more-nested-open', 'zappy-more-nested-parent');
        // Restore dropdown class stripped while nested under More so mobile
        // chevron CSS (.menu-item-has-children > .mobile-submenu-toggle) matches.
        var hasDirectSub = false;
        for (var c = 0; c < li.children.length; c++) {
          if (li.children[c].tagName === 'UL') { hasDirectSub = true; break; }
        }
        if (hasDirectSub) li.classList.add('menu-item-has-children');
      }
    }

    /** Wire chevron accordion for nested dropdowns drained into More (desktop). */
    function ensureMoreNestedAccordion(moreLi) {
      if (!moreLi) return;
      var topSub = moreLi.querySelector(':scope > .sub-menu');
      if (!topSub) return;
      var kids = topSub.children;
      for (var i = 0; i < kids.length; i++) {
        var li = kids[i];
        if (!li || li.tagName !== 'LI') continue;
        var nested = null;
        for (var c = 0; c < li.children.length; c++) {
          if (li.children[c].tagName === 'UL') { nested = li.children[c]; break; }
        }
        if (!nested) {
          li.classList.remove('zappy-more-nested-parent', 'zappy-more-nested-open');
          continue;
        }
        li.classList.add('zappy-more-nested-parent');
        // Always start collapsed when (re)wired after overflow reflow.
        if (!li.__zappyMoreNestedUserOpened) li.classList.remove('zappy-more-nested-open');
        var trigger = li.querySelector(':scope > a');
        if (!trigger) continue;
        var arrow = trigger.querySelector('svg.dropdown-arrow');
        if (!arrow) {
          arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          arrow.setAttribute('class', 'dropdown-arrow');
          arrow.setAttribute('width', '12');
          arrow.setAttribute('height', '12');
          arrow.setAttribute('viewBox', '0 0 24 24');
          arrow.setAttribute('fill', 'none');
          arrow.setAttribute('stroke', 'currentColor');
          arrow.setAttribute('stroke-width', '2');
          arrow.setAttribute('aria-hidden', 'true');
          var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', 'M6 9l6 6 6-6');
          arrow.appendChild(path);
          trigger.appendChild(arrow);
        }
        if (li.__zappyMoreNestedBound) continue;
        li.__zappyMoreNestedBound = true;
        (function(parentLi, arrowEl) {
          arrowEl.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var open = parentLi.classList.toggle('zappy-more-nested-open');
            parentLi.__zappyMoreNestedUserOpened = open;
          });
        })(li, arrow);
      }
    }

    function getMenu() {
      return document.querySelector('.nav-container > .nav-menu, .nav-right-group > .nav-menu')
        || document.getElementById('navMenu')
        || document.querySelector('.nav-menu');
    }

    // Visual extent (px) of just the IN-FLOW top-level <li> items — the true
    // width the menu's content needs. Measured from the left-most item edge to
    // the right-most item edge so the REAL gaps are captured by geometry (never
    // guessed). Absolutely-positioned dropdown sub-menus (the auto "More" panel,
    // the Products/Categories dropdowns) are excluded: they hang out of flow yet
    // still inflate menu.scrollWidth, which was the false signal that drained
    // almost every item into "More" on a near-empty navbar (bug 2026-06).
    function inflowItemsExtent(menu) {
      var left = Infinity, right = -Infinity, found = false, kids = menu.children;
      for (var i = 0; i < kids.length; i++) {
        var li = kids[i];
        if (!li || li.tagName !== 'LI') continue;
        var pos = '';
        try { pos = getComputedStyle(li).position; } catch (e) {}
        if (pos === 'absolute' || pos === 'fixed') continue;
        var r = li.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue; // skip display:none items
        if (r.left < left) left = r.left;
        if (r.right > right) right = r.right;
        found = true;
      }
      return found ? (right - left) : 0;
    }

    // Drop any width/flex sizing override we previously pinned on the menu so
    // the next reflow re-measures from the site's natural layout. flex-basis +
    // flex-grow are cleared alongside width/flex-shrink: many navbars (V2
    // ecommerce, RTL) ship .nav-menu{flex:1 1 0% important}, and a DEFINITE
    // flex-basis (0%) makes the width property a no-op for the flex item's
    // main size (CSS Flexbox spec). Without neutralizing flex-basis/flex-grow
    // our width pin was silently ignored — the menu kept its flex-distributed
    // box while its items spilled over the search/cart icons, and the overflow
    // detector measured the capped box (not the overflowing items) so it never
    // drained anything into "More" (bug 2026-06, RTL navbars).
    function clearMenuWidthOverride(menu) {
      if (!menu) return;
      menu.style.removeProperty('width');
      menu.style.removeProperty('flex-shrink');
      menu.style.removeProperty('flex-basis');
      menu.style.removeProperty('flex-grow');
      menu.removeAttribute('data-zappy-nav-fitted');
    }

    // Force the menu so its inline width actually governs the flex item's main
    // size, regardless of any flex:1 1 0% the site baked in. Sets flex-shrink:0
    // (don't compress), flex-grow:0 (don't stretch) and flex-basis:auto (so width
    // wins). Returns a token array to pass to restoreMenuSizing(). Pass the
    // desired width (px) or null to only freeze the flex triplet.
    function forceMenuSizing(menu, widthPx) {
      var saved = [
        menu.style.getPropertyValue('width'), menu.style.getPropertyPriority('width'),
        menu.style.getPropertyValue('flex-shrink'), menu.style.getPropertyPriority('flex-shrink'),
        menu.style.getPropertyValue('flex-grow'), menu.style.getPropertyPriority('flex-grow'),
        menu.style.getPropertyValue('flex-basis'), menu.style.getPropertyPriority('flex-basis')
      ];
      menu.style.setProperty('flex-shrink', '0', 'important');
      menu.style.setProperty('flex-grow', '0', 'important');
      menu.style.setProperty('flex-basis', 'auto', 'important');
      if (widthPx != null) menu.style.setProperty('width', widthPx + 'px', 'important');
      return saved;
    }

    function restoreMenuSizing(menu, saved) {
      if (saved[0]) menu.style.setProperty('width', saved[0], saved[1]); else menu.style.removeProperty('width');
      if (saved[2]) menu.style.setProperty('flex-shrink', saved[2], saved[3]); else menu.style.removeProperty('flex-shrink');
      if (saved[4]) menu.style.setProperty('flex-grow', saved[4], saved[5]); else menu.style.removeProperty('flex-grow');
      if (saved[6]) menu.style.setProperty('flex-basis', saved[6], saved[7]); else menu.style.removeProperty('flex-basis');
    }

    // The NATURAL (un-shrunk) content width the menu's in-flow items need. The
    // menu carries flex-shrink:1 (and often flex:1 1 0%), so on a tight navbar
    // the browser compresses/expands its box and a plain inflowItemsExtent()
    // read can under-report. Force the flex triplet (shrink:0, grow:0,
    // basis:auto) + a huge width so the items lay out at full size, read the
    // real span (gaps captured by geometry, abs sub-menus excluded), restore.
    function naturalMenuWidth(menu) {
      var saved = forceMenuSizing(menu, 100000);
      var ext = inflowItemsExtent(menu);
      restoreMenuSizing(menu, saved);
      return ext;
    }

    // Would the navbar ROW overflow its container if the menu were sized to
    // widthPx? This is the authoritative "do the items fit?" test. It is
    // deliberately NOT based on container.scrollWidth > clientWidth, which is
    // unreliable here for THREE reasons:
    //   (a) abs-positioned dropdown sub-menus inflate the menu's own scrollWidth,
    //   (b) RTL: a flex child overflowing past the container's edge does NOT grow
    //       the container scrollWidth (measured: menu right=942 over an 817 box,
    //       scrollWidth still 817) — the original bug that left RTL navbars with
    //       no "More" and overlapping links, and
    //   (c) a flexible sibling (the search/cart icon group) silently CRUSHES to
    //       absorb the overflow, hiding it from scrollWidth entirely.
    // Instead we pin the menu to widthPx AND freeze every in-flow sibling at
    // flex-shrink:0 (so none can crush), then measure the geometric UNION SPAN of
    // all in-flow children (leftmost edge → rightmost edge) and compare it to the
    // container's content width. This is fully direction-agnostic (LTR + RTL) and
    // immune to scrollWidth quirks. margin:auto gaps collapse to 0 exactly at
    // the fit boundary, so a row WITH free space spans ≈ clientWidth (not over)
    // while a genuinely too-wide row spans past it. Styles restored exactly.
    //
    // The MENU must be frozen with the full flex triplet (shrink:0, grow:0,
    // basis:auto) — not just flex-shrink:0 — so widthPx actually sizes its box.
    // A navbar that baked .nav-menu{flex:1 1 0%} has a DEFINITE flex-basis,
    // which makes width a no-op: without this the menu kept its narrow
    // flex-distributed box, getBoundingClientRect read that capped box (NOT the
    // overflowing items), the span stayed inside the container, and "More" was
    // never triggered (bug 2026-06). Siblings keep flex-shrink:0 + natural width.
    function rowOverflowsAtWidth(menu, widthPx) {
      var c = menu.parentElement;
      if (!c) return false;
      var saved = [];
      function freezeSibling(el) {
        saved.push([
          el,
          el.style.getPropertyValue('flex-shrink'), el.style.getPropertyPriority('flex-shrink')
        ]);
        el.style.setProperty('flex-shrink', '0', 'important');
      }
      var kids = c.children, i, ch, pos;
      var menuSaved = forceMenuSizing(menu, widthPx);
      for (i = 0; i < kids.length; i++) {
        ch = kids[i];
        if (ch === menu) continue;
        pos = '';
        try { pos = getComputedStyle(ch).position; } catch (e) {}
        if (pos === 'absolute' || pos === 'fixed') continue;
        freezeSibling(ch); // flex-shrink:0 only — keep the sibling's natural width
      }
      var left = Infinity, right = -Infinity, b;
      for (i = 0; i < kids.length; i++) {
        ch = kids[i];
        pos = '';
        try { pos = getComputedStyle(ch).position; } catch (e) {}
        if (pos === 'absolute' || pos === 'fixed') continue;
        b = ch.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) continue;
        if (b.left < left) left = b.left;
        if (b.right > right) right = b.right;
      }
      var span = (right > left) ? (right - left) : 0;
      var over = span > c.clientWidth + TOL;
      for (i = saved.length - 1; i >= 0; i--) {
        var s = saved[i], el = s[0];
        if (s[1]) el.style.setProperty('flex-shrink', s[1], s[2]); else el.style.removeProperty('flex-shrink');
      }
      restoreMenuSizing(menu, menuSaved);
      return over;
    }

    function makeMoreItem() {
      var li = document.createElement('li');
      li.className = 'menu-item-has-children zappy-nav-more-item';
      li.setAttribute('data-zappy-nav-more', '1');
      var a = document.createElement('a');
      a.href = '#';
      a.className = 'zappy-nav-more-toggle nav-link';
      a.setAttribute('aria-haspopup', 'true');
      a.setAttribute('aria-expanded', 'false');
      a.innerHTML = '<span class="zappy-nav-more-label"></span><svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"></path></svg>';
      a.querySelector('.zappy-nav-more-label').textContent = moreLabel();
      var ul = document.createElement('ul');
      ul.className = 'sub-menu zappy-nav-more-menu';
      ul.setAttribute('role', 'menu');
      li.appendChild(a);
      li.appendChild(ul);
      a.addEventListener('click', function(e) {
        e.preventDefault();
        var open = li.classList.toggle('open');
        a.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      return li;
    }

    function restore(menu) {
      var more = menu.querySelector(':scope > .zappy-nav-more-item');
      if (!more) return;
      var sub = more.querySelector('.sub-menu');
      while (sub && sub.firstElementChild) {
        var child = sub.firstElementChild;
        unflattenNestedSubmenusFromMore(child);
        menu.insertBefore(child, more);
      }
      more.remove();
    }

    // Is this anchor href the site home/root? Handles BOTH the preview shape
    // (.../preview-fullscreen/<id>?page=%2F) and the published shape (/, /index.html,
    // /en/, etc.), language prefixes and absolute origins included.
    function isHomeHref(href) {
      if (!href) return false;
      href = ('' + href).trim();
      if (!href || href.charAt(0) === '#') return false;
      var pIdx = href.indexOf('page=');
      if (pIdx !== -1) {
        var val = href.slice(pIdx + 5);
        var stop = val.search(/[&#]/);
        if (stop !== -1) val = val.slice(0, stop);
        try { val = decodeURIComponent(val); } catch (e) {}
        val = val.replace(/index\.html$/i, '').replace(/^\/[a-z]{2}\/$/i, '/');
        return val === '/' || val === '';
      }
      var clean = href.split('?')[0].split('#')[0].trim();
      clean = clean.replace(/^https?:\/\/[^/]+/i, '').replace(/^\.\//, '/').replace(/index\.html$/i, '');
      if (clean === '' || clean === '/') return true;
      return /^\/[a-z]{2}\/?$/i.test(clean);
    }

    // The "Home" link must always be the FIRST top-level nav item. The
    // ecommerce generator injects the auto-built Products dropdown by replacing
    // the catalog/products link IN PLACE, so when the LLM happened to emit that
    // link before "Home" the dropdown rendered first (bug 2026-06: "Products,
    // Home, ..." across e-commerce sites). This deterministically hoists the
    // Home item back to the front on every reflow — runs before the overflow
    // pass so Home can never be pushed into "More".
    function reorderHomeFirst(menu) {
      var home = menu.querySelector(':scope > li.nav-home-item');
      if (!home) {
        var lis = Array.prototype.filter.call(menu.children, function (el) {
          return el.tagName === 'LI' && !(el.classList && el.classList.contains('zappy-nav-more-item'));
        });
        for (var i = 0; i < lis.length; i++) {
          var a = lis[i].querySelector(':scope > a');
          if (a && isHomeHref(a.getAttribute('href'))) { home = lis[i]; break; }
        }
      }
      if (home && menu.firstElementChild !== home) {
        menu.insertBefore(home, menu.firstElementChild);
      }
    }

    function reflow() {
      var menu = getMenu();
      if (!menu) return;
      if (mo) mo.disconnect();
      try {
        menu.classList.remove('zappy-desktop-wrap');
        clearMenuWidthOverride(menu);
        restore(menu);
        reorderHomeFirst(menu);
        if (window.innerWidth <= 768) return;

        // Drain trailing items into "More" until the items, AT THEIR NATURAL
        // CONTENT WIDTH, fit the navbar row. Using the row-fit test (instead of
        // the menu's own scrollWidth/clientWidth) means we never over-drain on a
        // navbar that actually has room: the abs-positioned dropdown panels no
        // longer count, and the flex gap intrinsic-sizing quirk (a content-
        // sized menu under-reporting its width by the total gap) no longer
        // matters. "More" is appended last and items leave from the END, so the
        // maximum number of items stays visible before "More".
        var more = null, sub = null, guard = 0;
        while (guard < 200) {
          guard++;
          if (!rowOverflowsAtWidth(menu, Math.ceil(naturalMenuWidth(menu)))) break;
          var reals = Array.prototype.filter.call(menu.children, function(li) {
            if (li === more || li.tagName !== 'LI') return false;
            // Never drain mobile-only items (the hamburger-overlay contact CTA
            // <li class="mobile-contact-link nav-cta-mobile-item">): they are
            // display:none on desktop and take no row space, but once moved
            // into the More panel its display:block li rule made them visible,
            // duplicating the navbar CTA inside "More" (bug 2026-07).
            if (li.classList && (li.classList.contains('mobile-contact-link') || li.classList.contains('nav-cta-mobile-item') || li.classList.contains('mobile-only'))) return false;
            try { if (getComputedStyle(li).display === 'none') return false; } catch (e) {}
            return true;
          });
          if (reals.length <= 1) break;
          if (!more) {
            more = makeMoreItem();
            menu.appendChild(more);
            sub = more.querySelector('.sub-menu');
          }
          var drained = reals[reals.length - 1];
          flattenNestedSubmenusForMore(drained);
          sub.insertBefore(drained, sub.firstChild);
        }
        if (more && sub && !sub.firstElementChild) more.remove();
        if (more) ensureMoreNestedAccordion(more);

        // The site's flex gap is excluded from a flex-basis:auto menu's
        // intrinsic width, so the menu box can be narrower than its items and
        // they spill over the search/cart icons. Pin the menu to its real
        // NATURAL content extent (only when it currently under-fits) so every
        // remaining item is fully visible. We drained until the row fits at this
        // natural width, so the pin is always safe. Cleared on the next reflow /
        // resize. Using naturalMenuWidth (not the possibly-shrunk inflow extent)
        // is what makes this correct on a tight RTL navbar.
        var ext = naturalMenuWidth(menu);
        if (ext > menu.clientWidth + TOL) {
          // forceMenuSizing pins width + neutralizes flex-grow/flex-basis so the
          // pin holds even under .nav-menu{flex:1 1 0%}. Cleared on next reflow.
          forceMenuSizing(menu, Math.ceil(ext));
          menu.setAttribute('data-zappy-nav-fitted', '1');
        }
      } finally {
        observe();
      }
    }

    function relabel() {
      var menu = getMenu();
      if (!menu) return;
      var lbl = menu.querySelector('.zappy-nav-more-label');
      if (lbl) lbl.textContent = moreLabel();
    }

    var t = null;
    function schedule() {
      if (t) clearTimeout(t);
      t = setTimeout(reflow, 150);
    }

    function observe() {
      if (!window.MutationObserver) return;
      var menu = getMenu();
      if (!menu) return;
      if (!mo) mo = new MutationObserver(function() { schedule(); });
      mo.observe(menu, { childList: true, subtree: true });
    }

    function init() {
      injectCss();
      reflow();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
    window.addEventListener('load', function() { injectCss(); reflow(); });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule, { passive: true });
    window.addEventListener('popstate', function() { setTimeout(reflow, 0); });
    window.addEventListener('zappy:languageChanged', function() { setTimeout(function() { relabel(); reflow(); }, 0); });
    window.addEventListener('languageChanged', function() { setTimeout(function() { relabel(); reflow(); }, 0); });
    document.addEventListener('click', function(e) {
      var menu = getMenu();
      if (!menu) return;
      var more = menu.querySelector(':scope > .zappy-nav-more-item');
      if (more && more.classList.contains('open') && !more.contains(e.target)) {
        more.classList.remove('open');
        var tog = more.querySelector('.zappy-nav-more-toggle');
        if (tog) tog.setAttribute('aria-expanded', 'false');
      }
    }, true);
    setTimeout(reflow, 300);
    setTimeout(reflow, 1200);
  } catch (e) {}
})();

/* ZAPPY_NAV_MORE_POINTER_FIX_V4 */
(function(){
  try {
    if (window.__zappyNavMorePointerFixV4) return;
    window.__zappyNavMorePointerFixV4 = true;
    window.__zappyNavMorePointerFixV3 = true;
    window.__zappyNavMorePointerFixV2 = true;
    window.__zappyNavMorePointerFixV1 = true;

    var STYLE_ID = 'zappy-nav-more-pointer-fix';
    var applying = false;
    var cssText =
      '@media (min-width:769px){' +
        'html[dir="rtl"] body .navbar .zappy-nav-more-item > .sub-menu,' +
        'html[dir="rtl"] body .navbar .zappy-nav-more-item:hover > .sub-menu,' +
        'html[dir="rtl"] body .navbar .zappy-nav-more-item:focus-within > .sub-menu,' +
        'html[dir="rtl"] body .navbar .zappy-nav-more-item.open > .sub-menu{' +
          'left:auto!important;right:0!important;' +
        '}' +
        'html body .navbar .zappy-nav-more-item:not(:hover):not(:focus-within):not(.open) > .sub-menu,' +
        'html body .navbar .zappy-nav-more-item:not(:hover):not(:focus-within):not(.open) > .sub-menu *{' +
          'pointer-events:none!important;' +
        '}' +
        /* Constrain More panel: ecom-routing gives width:max-content + nowrap
           + overflow-y:auto (which promotes overflow-x:auto) → horizontal
           scrollbar on long Hebrew nested titles. */
        'html body .navbar .zappy-nav-more-item > .sub-menu{' +
          'width:min(420px,calc(100vw - 24px))!important;max-width:min(420px,calc(100vw - 24px))!important;' +
          'overflow-x:hidden!important;overflow-y:auto!important;box-sizing:border-box!important;' +
        '}' +
        'html body .navbar .zappy-nav-more-item > .sub-menu a{' +
          'white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important;' +
          'max-width:100%!important;box-sizing:border-box!important;' +
        '}' +
        'html body .navbar .zappy-nav-more-item .sub-menu .sub-menu,' +
        'html body .navbar .zappy-nav-more-item > .sub-menu > li > .sub-menu,' +
        'html body .zappy-nav-more-item [data-zappy-more-flattened]{' +
          'position:static!important;display:none!important;opacity:0!important;visibility:hidden!important;' +
          'pointer-events:none!important;height:0!important;overflow:hidden!important;padding:0!important;margin:0!important;' +
          'box-shadow:none!important;transform:none!important;width:100%!important;max-width:100%!important;' +
        '}' +
        'html body .navbar .zappy-nav-more-item .zappy-more-nested-open > .sub-menu,' +
        'html body .navbar .zappy-nav-more-item > .sub-menu > li.zappy-more-nested-open > .sub-menu{' +
          'display:block!important;opacity:1!important;visibility:visible!important;' +
          'pointer-events:auto!important;height:auto!important;' +
          'overflow-x:hidden!important;overflow-y:visible!important;' +
          'padding-inline-start:12px!important;width:100%!important;max-width:100%!important;' +
        '}' +
        '.zappy-nav-more-item>.sub-menu>li.zappy-more-nested-parent>a{' +
          'display:flex!important;align-items:center!important;justify-content:space-between!important;' +
          'gap:8px!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;' +
        '}' +
        '.zappy-nav-more-item>.sub-menu>li.zappy-more-nested-parent>a .dropdown-arrow{' +
          'display:inline-block!important;flex:0 0 auto!important;width:12px!important;height:12px!important;' +
          'margin-inline-start:auto!important;pointer-events:auto!important;cursor:pointer!important;' +
          'transition:transform .2s ease!important;opacity:1!important;visibility:visible!important;' +
        '}' +
        '.zappy-nav-more-item>.sub-menu>li.zappy-more-nested-open>a .dropdown-arrow{transform:rotate(180deg)!important;}' +
        'html body .navbar .zappy-nav-more-item:hover > .sub-menu,' +
        'html body .navbar .zappy-nav-more-item:focus-within > .sub-menu,' +
        'html body .navbar .zappy-nav-more-item.open > .sub-menu{' +
          'pointer-events:auto!important;' +
        '}' +
      '}';

    function ensureCss() {
      var s = document.getElementById(STYLE_ID);
      if (!s) {
        s = document.createElement('style');
        s.id = STYLE_ID;
      }
      if (s.textContent !== cssText) s.textContent = cssText;
      if (s.parentNode !== (document.head || document.documentElement)) {
        (document.head || document.documentElement).appendChild(s);
      } else if (s.nextSibling) {
        (document.head || document.documentElement).appendChild(s);
      }
    }

    function scrubFlattenedInlineLocks() {
      var nodes = document.querySelectorAll('[data-zappy-more-flattened]');
      for (var i = 0; i < nodes.length; i++) {
        var ul = nodes[i];
        if (ul.style.getPropertyValue('pointer-events')) ul.style.removeProperty('pointer-events');
        if (ul.style.getPropertyValue('opacity')) ul.style.removeProperty('opacity');
        if (ul.style.getPropertyValue('visibility')) ul.style.removeProperty('visibility');
        if (ul.style.getPropertyValue('display')) ul.style.removeProperty('display');
      }
    }

    function wireMoreNestedAccordion() {
      var more = document.querySelector('.zappy-nav-more-item');
      if (!more) return;
      var topSub = more.querySelector(':scope > .sub-menu');
      if (!topSub) return;
      var kids = topSub.children;
      for (var i = 0; i < kids.length; i++) {
        var li = kids[i];
        if (!li || li.tagName !== 'LI') continue;
        var nested = null;
        for (var c = 0; c < li.children.length; c++) {
          if (li.children[c].tagName === 'UL') { nested = li.children[c]; break; }
        }
        if (!nested) {
          li.classList.remove('zappy-more-nested-parent', 'zappy-more-nested-open');
          continue;
        }
        li.classList.add('zappy-more-nested-parent');
        if (!li.__zappyMoreNestedUserOpened) li.classList.remove('zappy-more-nested-open');
        var trigger = null;
        for (var t = 0; t < li.children.length; t++) {
          if (li.children[t].tagName === 'A') { trigger = li.children[t]; break; }
        }
        if (!trigger) continue;
        var arrow = trigger.querySelector('svg.dropdown-arrow');
        if (!arrow) {
          arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          arrow.setAttribute('class', 'dropdown-arrow');
          arrow.setAttribute('width', '12');
          arrow.setAttribute('height', '12');
          arrow.setAttribute('viewBox', '0 0 24 24');
          arrow.setAttribute('fill', 'none');
          arrow.setAttribute('stroke', 'currentColor');
          arrow.setAttribute('stroke-width', '2');
          arrow.setAttribute('aria-hidden', 'true');
          var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', 'M6 9l6 6 6-6');
          arrow.appendChild(path);
          trigger.appendChild(arrow);
        }
        if (li.__zappyMoreNestedBound) continue;
        li.__zappyMoreNestedBound = true;
        (function(parentLi, arrowEl) {
          arrowEl.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var open = parentLi.classList.toggle('zappy-more-nested-open');
            parentLi.__zappyMoreNestedUserOpened = open;
          });
        })(li, arrow);
      }
    }

    function apply() {
      if (applying) return;
      applying = true;
      try {
        ensureCss();
        scrubFlattenedInlineLocks();
        wireMoreNestedAccordion();
      } finally {
        applying = false;
      }
    }

    var scheduled = false;
    function scheduleApply() {
      if (scheduled || applying) return;
      scheduled = true;
      setTimeout(function() {
        scheduled = false;
        apply();
      }, 0);
    }

    apply();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scheduleApply);
    }
    if (typeof MutationObserver === 'function') {
      var mo = new MutationObserver(scheduleApply);
      mo.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['style', 'data-zappy-more-flattened']
      });
    }
  } catch (e) {}
})();

/* data-zappy-content-align */


/* ZAPPY_CONTENT_ALIGNMENT_RUNTIME */
(function(){
  try {
    if (window.__zappyContentAlignInit) return;
    window.__zappyContentAlignInit = true;

    var vShiftMap = { top: -0.5, upper: -0.25, center: 0, lower: 0.25, bottom: 0.5 };
    var hShiftMap = { left: -0.5, 'mid-left': -0.25, center: 0, 'mid-right': 0.25, right: 0.5 };

    function restoreContentAlignments() {
      var sections = document.querySelectorAll('[data-zappy-content-align]');
      for (var i = 0; i < sections.length; i++) {
        try { applyAlignment(sections[i]); } catch(e) {}
      }
    }

    function applyAlignment(section) {
      var target = section.querySelector('[data-zappy-align-target]');
      if (!target) return;

      var align = section.getAttribute('data-zappy-content-align') || 'center-center';
      var idx = align.indexOf('-');
      if (idx === -1) return;
      var vAlign = align.substring(0, idx) || 'center';
      var hAlign = align.substring(idx + 1) || 'center';

      if (!section.id) {
        section.id = 'zappy-section-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
      }
      var sel = '#' + section.id;

      var old = section.querySelector('style[data-zappy-align-style]');
      if (old) old.remove();

      var ts = window.getComputedStyle(target);
      var isFlex = (ts.display === 'flex' || ts.display === 'inline-flex');
      var isColumn = (ts.flexDirection === 'column' || ts.flexDirection === 'column-reverse');

      var sectionRect = section.getBoundingClientRect();
      var sW = sectionRect.width || section.offsetWidth || 0;
      var sH = sectionRect.height || section.offsetHeight || 0;

      var orig = target.style.cssText;
      target.style.setProperty('width', 'fit-content', 'important');
      target.style.setProperty('height', 'auto', 'important');
      target.style.setProperty('min-height', '0', 'important');
      target.style.setProperty('max-height', 'none', 'important');
      target.style.setProperty('align-self', 'flex-start', 'important');
      target.style.setProperty('flex', 'none', 'important');
      var tRect = target.getBoundingClientRect();
      var tW = tRect.width || 0;
      var tH = tRect.height || 0;
      target.style.cssText = orig;

      var freeH = Math.max(0, sW - tW);
      var freeV = Math.max(0, sH - tH);
      var hPx = Math.round((hShiftMap[hAlign] || 0) * freeH);
      var vPx = Math.round((vShiftMap[vAlign] || 0) * freeV);

      var t = [];
      t.push('margin:auto!important');
      if (hPx !== 0 || vPx !== 0) {
        t.push('transform:translate(' + hPx + 'px,' + vPx + 'px)!important');
      }
      if (isFlex) {
        t.push('align-items:center!important');
        t.push('justify-content:center!important');
      } else {
        t.push('display:flex!important');
        t.push('flex-direction:column!important');
        t.push('align-items:center!important');
      }

      var c = ['justify-content:center!important'];
      if (hAlign === 'center') {
        c.push('margin-left:auto!important');
        c.push('margin-right:auto!important');
        c.push('text-align:center!important');
      }
      if (!isFlex && hAlign !== 'center') {
        c.push('min-width:33.33%!important');
        c.push('text-align:start!important');
      }

      var css = '';
      if (hPx !== 0 || vPx !== 0) css += sel + '{overflow:hidden!important}';
      if (hAlign === 'center') {
        css += sel + '{display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;text-align:center!important}';
        t.push('text-align:center!important');
      }
      css += sel + ' [data-zappy-align-target]{' + t.join(';') + '}';
      css += sel + ' [data-zappy-align-target]>*{' + c.join(';') + '}';
      css += '@media(max-width:768px){' +
        sel + ' [data-zappy-align-target]{align-items:center!important;margin-left:auto!important;margin-right:auto!important;' +
        (vPx !== 0 ? 'transform:translateY(' + vPx + 'px)!important' : 'transform:none!important') +
        '}' + sel + ' [data-zappy-align-target]>*{margin-left:auto!important;margin-right:auto!important}}';

      var s = document.createElement('style');
      s.setAttribute('data-zappy-align-style', 'true');
      s.textContent = css;
      section.insertBefore(s, section.firstChild);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', restoreContentAlignments);
    } else {
      restoreContentAlignments();
    }

    var _timer = null;
    window.addEventListener('resize', function() {
      clearTimeout(_timer);
      _timer = setTimeout(restoreContentAlignments, 200);
    });
    window.addEventListener('orientationchange', function() {
      clearTimeout(_timer);
      _timer = setTimeout(restoreContentAlignments, 200);
    });
  } catch(e) {}
})();
