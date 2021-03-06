(function () {

  var supports_querySelector = typeof(document.querySelector) === 'undefined' ? 0 : 1;
  var supports_getComputedStyle = typeof(window.getComputedStyle) === 'undefined' ? 0 : 1;


  (function() {

    if (!tinsta.showReadingIndicator) {
      return;
    }

    var ee = document.getElementById('site-entries');
    var top = ee.offsetTop;
    var bottom = top + ee.offsetHeight;
    var readingIndicator = document.createElement('div');
    readingIndicator.className = 'reading-indicator';
    readingIndicator.tinstaProgressBar = document.createElement('div');
    readingIndicator.tinstaProgressBar.className = 'progress';
    document.body.appendChild(readingIndicator);
    readingIndicator.appendChild(readingIndicator.tinstaProgressBar);
    window.addEventListener('scroll', function() {
      var screenScrolledBottom = window.pageYOffset + window.innerHeight;
      if (screenScrolledBottom > top && screenScrolledBottom < bottom) {
        var progress = Math.ceil(( screenScrolledBottom - top ) / ee.offsetHeight * 100);
        readingIndicator.style.display = 'block';
        readingIndicator.tinstaProgressBar.className = 'progress';
        readingIndicator.tinstaProgressBar.style.width = progress + '%';
      } else {
        readingIndicator.style.display = 'none';
      }
    });
  }());


  /**
   * Because CSS.supports() may not be fully supported.
   *
   * @type bool
   */
  var cssSupports = null;
  if (typeof(CSS) && typeof(CSS) === 'function') {
    cssSupports = CSS.supports;
  } else {
    cssSupports = function (prop, value) {
      var d = document.createElement('div');
      d.style[prop] = value;
      return d.style[prop] === value;
    }
  }

  /**
   * Legacy browsers supports.
   */
  (function () {

    // Flex.
    if (!cssSupports('display', 'flex')) {
      ( function () {
        var script = document.createElement('script');
        script.setAttribute('src', tinsta.assetsDir + 'js/flexibility.min.js');
        script.setAttribute('async', 'async');
        document.body.appendChild(script);
      }() );
    }

    // Sticky.
    if (!cssSupports('position', 'sticky')) {
      ( function () {
        var script = document.createElement('script');
        script.setAttribute('src', tinsta.assetsDir + 'js/sticky.min.js');
        script.setAttribute('async', 'async');
        document.body.appendChild(script);
      }() );
    }

  }());

  /**
   * It's more convinion to use classList but it's not supported from some old browsers.
   *
   * @param element
   * @param className
   */
  var elementRemoveClass = function (element, className) {
    var classes = element.className.split(' ').filter(function (localClassName) {
      return localClassName !== className;
    });
    element.className = classes.join(' ');
  };

  /**
   * Add one time closing button.
   */
  var addCloseButton = function (callback, closeText) {
    var button = document.createElement('div');
    button.innerText = closeText || tinsta.strings.close;
    button.className = 'mobile-back-button';
    document.body.appendChild(button);
    document.body.className += ' no-scroll';
    var closeCallback = function () {
      button.parentNode.removeChild(button);
      elementRemoveClass(document.body, 'no-scroll');
      callback();
    };
    button.addEventListener('mouseup', closeCallback);
    return closeCallback;
  };

  /**
   * Fixups and definitions.
   */
  ( function() {
    // Removing no-js class.
    document.documentElement.className += ' js';
    elementRemoveClass(document.documentElement, 'no-js');
    // Workaround for transition touch events.
    // document.body.addEventListener('touchstart', function () {}, false);
  }() );

  /**
   * Makes "skip to content" link work correctly in IE9, Chrome, and Opera
   * for better accessibility.
   *
   * @link http://www.nczonline.net/blog/2013/01/15/fixing-skip-to-content-links/
   */
  (function () {
    var ua = navigator.userAgent.toLowerCase();
    if ((ua.indexOf('webkit') > -1 || ua.indexOf('opera') > -1 || ua.indexOf('msie') > -1) &&
      document.getElementById && window.addEventListener) {
      window.addEventListener('hashchange', function () {
        var element = document.getElementById(location.hash.substring(1));
        if (element) {
          if (!/^(?:a|select|input|button|textarea)$/i.test(element.nodeName)) {
            element.tabIndex = -1;
          }
          element.focus();
        }
      }, false);
    }
  })();

  /**
   * Auto-grow of comments.
   */
  document.addEventListener('DOMContentLoaded', function () {
    var commentTextArea = document.getElementById('comment');
    if (commentTextArea && commentTextArea.tagName.toUpperCase() === 'TEXTAREA') {

      commentTextArea.removeAttribute('rows');
      commentTextArea.style.overflow = 'hidden';

      var recalcTextAreaHeight = function () {
        this.style.minHeight = 'auto';
        this.style.minHeight = this.scrollHeight + 2 + 'px';
      };

      if ('oninput' in window) {
        commentTextArea.addEventListener('input', recalcTextAreaHeight);
      } else {
        commentTextArea.addEventListener('keyup', recalcTextAreaHeight);
      }
    }
  });

  /**
   * Full Height.
   */
  if (tinsta.fullHeight) {
    (function () {
      var fullHeightRecalc = function () {
        var main = document.getElementsByClassName('site-container-wrapper');
        if (main.length < 1) {
          return;
        }
        var height = window.innerHeight - (document.body.offsetHeight - main[0].offsetHeight);
        var wpAdminBar = document.getElementById('wpadminbar');
        if (wpAdminBar) {
          height -= wpAdminBar.offsetHeight;
        }
        if (height > 0 && main[0].scrollHeight < height) {
          main[0].style.minHeight = height + 'px';
        }
      };

      fullHeightRecalc();
      window.addEventListener('resize', fullHeightRecalc);
      window.addEventListener('orientationchange', fullHeightRecalc);
      document.addEventListener('readystatechange', fullHeightRecalc);
    }());
  }

  /**
   * Scrolltop.
   */
  if (tinsta.scrolltop) {
    ( function () {
      var button = document.createElement('div');
      button.className = 'scrolltop-button';
      button.innerText = tinsta.strings.top;
      button.setAttribute('title', tinsta.strings.top);
      button.addEventListener('mouseup', function () {
        var scrollStep = -window.scrollY / 50;
        var scrollInterval = setInterval(function () {
          if (window.scrollY !== 0) {
            window.scrollBy(0, scrollStep);
          }
          else {
            clearInterval(scrollInterval)
          }
        }, 5);
      });
      var check = function () {
        if (window.pageYOffset > (window.innerHeight / 2)) {
          if (!button.className.match('show')) {
            button.className += ' show';
          }
        }
        else {
          elementRemoveClass(button, 'show');
        }
      };
      document.body.appendChild(button);
      window.addEventListener('scroll', check);
      setTimeout(check, 350);
    }() );

  }

  /**
   * Init smoothscroll if available.
   */
  window.addEventListener('load', function () {
    if ( window.hasOwnProperty('jQuery') && window.jQuery.fn.hasOwnProperty('niceScroll') ) {
      jQuery('body').niceScroll();
    }
  });

  /**
   * Avatar change based on inputed email.
   */
  (supports_querySelector) && (function () {
      var respondForm = document.querySelector('#respond');
      if (respondForm) {
        var emailField = respondForm.querySelector('#email');
        var avatarImg = respondForm.querySelector('img.avatar');
        if (emailField && avatarImg) {
          var avatarSize = avatarImg.naturalWidth || avatarImg.width;
          var emailIsChanged = function () {
            if (avatarImg.hasAttribute('srcset')) {
              avatarImg.removeAttribute('srcset');
            }
            var newUrl = tinsta.siteUrl + '?tinsta-resolve-user-avatar=' + encodeURIComponent(this.value.trim());
            if (avatarSize) {
              avatarImg.srcset = newUrl + '&s=' + avatarSize + ', ' + newUrl + '&s=' + (avatarSize*2) + ' 2x';
              newUrl += '&s=' + avatarSize;
            } else {
              avatarImg.removeAttribute('srcset');
            }
            avatarImg.src = newUrl;
          };
          emailField.addEventListener('change', emailIsChanged);
          emailField.addEventListener('keyup', emailIsChanged);
        }
      }
  }());

  /**
   *  Agree accepted.
   */
  (supports_querySelector) && (function () {
    var shouldShowAgreeDialog = !localStorage.getItem('agreeAccepted');
    if (window.hasOwnProperty('tinstaCustomized')) {
      shouldShowAgreeDialog = ( window.tinstaCustomized.hasOwnProperty('options_site_agreement_enable') && window.tinstaCustomized.component_site_agreement_enable )
        || window.tinstaCustomized.hasOwnProperty('options_site_agreement_style')
        || window.tinstaCustomized.hasOwnProperty('options_site_agreement_text')
        || window.tinstaCustomized.hasOwnProperty('options_site_agreement_agree_button')
        || window.tinstaCustomized.hasOwnProperty('options_site_agreement_cancel_url')
        || window.tinstaCustomized.hasOwnProperty('options_site_agreement_cancel_title');
    }
    if (shouldShowAgreeDialog) {
      var siteAgreementDialog = document.getElementById('site-enter-agreement');
      if (!siteAgreementDialog) {
        return;
      }
      siteAgreementDialog.style.display = 'block';
      document.getElementById('site-enter-agreement-button').addEventListener('mouseup', function (event) {
        event.preventDefault();
        siteAgreementDialog.className += ' agreed';
        setTimeout(function () {
          siteAgreementDialog.style.display = 'none';
          siteAgreementDialog.parentNode.removeChild(siteAgreementDialog);
        }, 150);
        localStorage.setItem('agreeAccepted', true);
      });
    }
  }());

  /**
   * Responsive menu.
   *
   * @TODO check submenus for active link and mark the root element as active too. That because megamenus.
   */
  (supports_querySelector) && (function () {

    var mainWrapper = document.getElementsByClassName('site-container').item(0);
    if (!mainWrapper) {
      return false;
    }

    var menuItemsSelectors = [

      // All menus in header.
      '.site-header-wrapper .menu-item-object-tinsta-nav-menu-object.depth-0 > .sub-menu',
      '.site-header-wrapper .menu-item-has-children.depth-0 > .sub-menu',

      // Primary menu items.
      '.site-primary-menu .menu-item-object-tinsta-nav-menu-object.depth-0 > .sub-menu',
      '.site-primary-menu .menu-item-has-children.depth-0 > .sub-menu',

    ];

    document.querySelectorAll(menuItemsSelectors.join(','))
      .forEach(function (item) {

        // Mega class.
        var richItemsLen = 0;
        for ( var i = 0; i < item.children.length; i++) {
          if (item.children.item(i).className.match('menu-item-has-children')) {
            richItemsLen++;
          }
        }
        if (item.children.length === richItemsLen || !!item.parentElement.className.match('menu-item-object-tinsta-nav-menu-object')) {
          item.parentNode.className += ' is-mega';
        }

        // If widgets area, disable clicking for root item anchor.
        if (item.parentElement.className.match('menu-item-type-tinsta-nav-menu-widget-area')) {
          var firstA = item.parentElement.querySelector('a');
          if (firstA) {
            firstA.addEventListener( 'click', function (event) {
              event.preventDefault();
            });
          }
        }

        // Consider replacing window.innerWidth with window.outerWidth
        // innerWidth represent current width, and outerWidth represent the whole window
        item.parentElement.addEventListener('mouseenter', function (event) {
          if ( window.innerWidth >= parseInt(tinsta.breakpoints.tablet) ) {

            item.style.right = 'auto';
            item.style.left = 'auto';

            if (item.offsetWidth + item.offsetLeft > mainWrapper.offsetWidth) {
              item.style.right = 0;
            }
            if (item.offsetLeft < 20) {
              item.style.left = 0;
            }

          }
        });

        // Mobile menu.
        if (item.parentElement.children.item(0)) {
          item.parentElement.children.item(0).addEventListener('click', function (event) {
            if (window.innerWidth < parseInt(tinsta.breakpoints.tablet)) {
              event.preventDefault();
              item.className += ' mobile-menu';
              addCloseButton(function () {
                elementRemoveClass(item, 'mobile-menu');
              });
            }
          });
        }

      });

  }());

  /**
   * Search widget forms add focus class when focused element.
   */
  ( supports_querySelector ) && ( function () {
    document.querySelectorAll('.widget_search')
      .forEach(function (widget) {
        var field = widget.querySelectorAll('.search-field');
        if (field.length < 1) {
          return;
        }
        field = field[0];
        field.addEventListener('keydown', function (event) {
          if (event.which === 27) {
            elementRemoveClass(this, 'focus');
            field.blur();
          }
        });
        field.addEventListener('focus', function () {
          widget.className += ' focus';
        });
        field.addEventListener('blur', function () {
          elementRemoveClass(widget, 'focus');
        });
      });
  }());

  /**
   * Search fields auto-complete.
   */
  ( supports_querySelector ) && ( function () {
    // @TODO add option to disable/enable auto-complete per widget or globally.
    document.addEventListener('DOMContentLoaded', function () {

      var doAjaxAutocomplete = function () {
        var autoCompletePlaceholder = this;
        var keyword = autoCompletePlaceholder.value.trim();
        if (keyword.length < 3) {
          autoCompletePlaceholder.autocompleteListElement.style.display = 'none';
        } else {
          var httpRequest = new XMLHttpRequest();
          httpRequest.onload = function (event) {
            if (autoCompletePlaceholder.autocompleteListTimer && event.target.status === 200 && event.target.response) {
              autoCompletePlaceholder.autocompleteListElement.style.display = 'block';
              autoCompletePlaceholder.autocompleteListElement.innerHTML = event.target.response;
            } else {
              autoCompletePlaceholder.autocompleteListElement.style.display = 'none';
            }
          };
          httpRequest.open('GET', window.tinsta.siteUrl + '?tinsta-ajax-search=' + keyword);
          httpRequest.send();
        }
      };

      var inputFields = document.querySelectorAll('.search-form input[type="search"]');

      inputFields.forEach(function (element) {
        element.autocompleteListTimer = null;
        element.autocompleteListElement = document.createElement('DIV');
        element.autocompleteListElement.className = 'search-autocomplete-list';
        element.autocompleteListElement.style.display = 'none';
        element.parentNode.insertBefore(element.autocompleteListElement, element.nextSibling);
        element.setAttribute('autocomplete', 'off');
        element.addEventListener('keypress', function (event) {
          if (this.autocompleteListTimer) {
            clearTimeout(this.autocompleteListTimer)
          }
          this.autocompleteListTimer = setTimeout(doAjaxAutocomplete.bind(element), 500);
        });
        element.addEventListener('keydown', function (event) {
          if (event.keyCode === 27) {
            this.value = '';
            this.autocompleteListElement.style.display = 'none';
          }
          var nextItem = null;
          var activeItem = this.autocompleteListElement.querySelector('li.active');
          if (activeItem) {
            if (event.keyCode === 38) {
              nextItem = activeItem.previousSibling;
            } else if (event.keyCode === 40) {
              nextItem = activeItem.nextSibling;
            } else if (event.keyCode === 13) {
              var activeItemLink = activeItem.querySelector('a');
              if (activeItemLink) {
                event.preventDefault();
                window.location.href = activeItemLink.href;
              }
              return true;
            }
            elementRemoveClass(activeItem, 'active');
          }

          if ( !nextItem || !activeItem ) {
            if (event.keyCode === 38) {
              nextItem = this.autocompleteListElement.querySelector('li:last-child');
            } else if (event.keyCode === 40) {
              nextItem = this.autocompleteListElement.querySelector('li:first-child');
            }
          }

          if (nextItem) {
            nextItem.className += ' active';
          }

        });
        element.addEventListener('change', function () {
          if (this.autocompleteListTimer) {
            clearTimeout(this.autocompleteListTimer)
          }
          if (element.autocompleteListElement.children.length > 0) {
            this.autocompleteListTimer = setTimeout(doAjaxAutocomplete.bind(element), 500);
          } else {
            element.autocompleteListElement.style.display = 'none';
          }
        });
        element.addEventListener('focus', function () {
          if (element.autocompleteListElement.children.length > 0) {
            element.autocompleteListElement.style.display = 'block';
          } else {
            this.autocompleteListTimer = setTimeout(doAjaxAutocomplete.bind(element), 100);
          }
        });
        element.addEventListener('blur', function () {
          if (this.autocompleteListTimer) {
            clearTimeout(this.autocompleteListTimer)
          }
          this.autocompleteListTimer = setTimeout(function () {
            element.autocompleteListElement.style.display = 'none';
          }, 250);
        });
      });

    });
  }() );

}());
