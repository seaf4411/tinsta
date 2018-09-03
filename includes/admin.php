<?php

/**
 * @file
 * Only hooks that are responsible for admin/back-end and NOT for front-end interface.
 */


/**
 * Import .tinsta settings file (only local files)
 *
 * @param string $file
 * @param bool $tinsta_settings_only
 *
 * @return int
 */
function tinsta_settings_import($file, $tinsta_settings_only = false)
{
  $imported_settings_count = 0;
  $defaults = tinsta_get_options_defaults();

  require_once ABSPATH . '/wp-admin/includes/file.php';
  WP_Filesystem();
  global $wp_filesystem;

  if ($wp_filesystem->is_readable($file)) {

    $data = $wp_filesystem->get_contents($file);
    $data = @json_decode($data, true);

    if (!json_last_error()) {
      foreach ($data as $key => $value) {
        // Import ONLY the settings, described in tinsta_get_options_defaults().
        if ($tinsta_settings_only && !isset($defaults[$key])) {
          remove_theme_mod($key);
        }
        else {
          set_theme_mod($key, $value);
          $imported_settings_count++;
        }
      }
    }
  }

  return $imported_settings_count;
}

/**
 * Insert a widget in a sidebar.
 *
 * This function is copied from, all credits goes to "tyxla" as it's author
 * https://gist.github.com/tyxla/372f51ea1340e5e643f6b47e2ddf43f2
 *
 * @param string $widget_id ID of the widget (search, recent-posts, etc.)
 * @param array $widget_data Widget settings.
 * @param string $sidebar ID of the sidebar.
 */
function tinsta_insert_widget_in_sidebar($widget_id, $widget_data, $sidebar)
{
  // Retrieve sidebars, widgets and their instances
  $sidebars_widgets = get_option('sidebars_widgets', array());
  $widget_instances = get_option('widget_' . $widget_id, array());
  // Retrieve the key of the next widget instance
  $numeric_keys = array_filter(array_keys($widget_instances), 'is_int');
  $next_key = $numeric_keys ? max($numeric_keys) + 1 : 2;
  // Add this widget to the sidebar
  if (!isset($sidebars_widgets[$sidebar])) {
    $sidebars_widgets[$sidebar] = array();
  }
  $sidebars_widgets[$sidebar][] = $widget_id . '-' . $next_key;
  // Add the new widget instance
  $widget_instances[$next_key] = $widget_data;
  // Store updated sidebars, widgets and their instances
  update_option('sidebars_widgets', $sidebars_widgets);
  update_option('widget_' . $widget_id, $widget_instances);
}

/**
 * Add theme exports AJAX endpoint
 * wp-admin/admin-ajax.php?action=tinsta-export-settings
 */
add_action('wp_ajax_tinsta-export-settings', function () {

  // Only users that can modify theme can download settings.
  if (!current_user_can('edit_theme_options')) {
    die('Cheatin&#8217; uh?');
  }

  $filename = get_bloginfo('name') . '-' . date('YmdHi') . '.tinsta';

  if ( ! headers_sent() ) {
    header('Cache-Control: no-cache, must-revalidate', true);
    header('Expires: Sat, 26 Jul 1997 05:00:00 GMT', true);
    header('Content-Type: plain/text; charset=UTF-8', true);
    header('Content-Disposition: attachment; filename="' . addslashes($filename) . '"', true);
  }

  if ( !empty($_GET['tinsta_settings_only']) || !empty($_POST['tinsta_settings_only']) ) {
    $defaults = tinsta_get_options_defaults();
    $document = array_replace($defaults, array_intersect_key(get_theme_mods(), tinsta_get_options_defaults()));
  }
  else {
    $document = array_replace(tinsta_get_options_defaults(), get_theme_mods());
  }

  $document['$tinstaVersion'] = wp_get_theme()->Version;

  echo json_encode( $document, JSON_PRETTY_PRINT );
  exit;
});

/**
 * Because add_theme_support( 'starter-content', []) doesn't works well,
 * we will populate some of the sidebars (if they are empty) with some random widgets.
 */
if (get_option('fresh_site')) {
  add_action('after_switch_theme', function () {

    if (!is_active_sidebar('header')) {
      tinsta_insert_widget_in_sidebar('tinsta_logo_widget', [], 'header');
      tinsta_insert_widget_in_sidebar('search', [], 'header');
    }

    if (!is_active_sidebar('footer')) {
      tinsta_insert_widget_in_sidebar('meta', [], 'footer');
      tinsta_insert_widget_in_sidebar('tag_cloud', [], 'footer');
      tinsta_insert_widget_in_sidebar('calendar', [], 'footer');
    }

    if (!is_active_sidebar('before-entries')) {
      tinsta_insert_widget_in_sidebar('tinsta_breadcrumbs_widget', [], 'before-entries');
    }

    if (!is_active_sidebar('primary')) {
      tinsta_insert_widget_in_sidebar('pages', [], 'primary');
    }

  });
}

/**
 * Admin Scripts and Styles
 */
add_action('admin_print_scripts', function () {
  // Build/rebuild only when in editing post.
  if (get_current_screen() == 'edit') {
    add_editor_style(tinsta_get_stylesheet('editor'));
  }
  wp_enqueue_style('tinsta-admin', get_template_directory_uri() . '/assets/css/admin.css');
  wp_enqueue_script('tinsta-admin', get_template_directory_uri() . '/assets/js/admin.js', ['jquery']);
  wp_localize_script('tinsta-admin', 'tinsta', [
    'palette' => array_values(tinsta_get_color_palette()),
  ]);
});

/**
 * Add admin theme pages.
 */
add_action('admin_menu', function () {

  add_theme_page(__('Tools', 'tinsta'), __('Tools', 'tinsta'), 'edit_theme_options', 'tinsta-tools', function () {
    require __DIR__ . '/tools.php';
  });

});

/**
 * Hook to set tinsta related settings per widget.
 */
add_filter('widget_update_callback', function ($instance, $new_instance, $widget, $object) {

  $instance = wp_parse_args((array)$new_instance, [
    'tinsta_widget_size_float' => '',
    'tinsta_widget_size' => '',
    'tinsta_boxed' => '',
  ]);
  return $instance;
}, 10, 4);

/**
 * Add tinsta related settings to widgets.
 */
add_action('in_widget_form', function ($object, &$return, $instance) {

  $sidebar = null;

  if ($object->number !== '__i__') {
    foreach (wp_get_sidebars_widgets() as $registered_sidebars => $sidebar_widgets) {
      if (in_array($object->id, $sidebar_widgets)) {
        $sidebar = $registered_sidebars;
        break;
      }
    }
  }

  //  if (!$sidebar) {
  //    return [$object, $return, $instance];
  //  }

  // New fields are added.
  $return = null;

  $instance = wp_parse_args((array)$instance, [
    'tinsta_boxed' => '',
    'tinsta_widget_size' => '',
    'tinsta_widget_float' => '',
  ]);

  ob_start();

  if (in_array($sidebar, ['before-content', 'after-content'])) {
    ?>
    <p>
      <input id="<?php echo $object->get_field_id('tinsta_boxed') ?>"
             name="<?php echo $object->get_field_name('tinsta_boxed') ?>"
             type="checkbox"
             value="on"
      <?php checked($instance['tinsta_boxed'], 'on') ?> />
      <label for="<?php echo $object->get_field_id('tinsta_boxed') ?>">
        <?php _e('Boxed', 'tinsta') ?>
      </label>
    </p>
    <?php
  }

  if (!in_array($sidebar, ['primary', 'secondary'])) {
    $cols_num = 12;
    $col_width = round(100 / $cols_num, 2);
    ?>

    <p>
      <label for="<?php echo $object->get_field_id('tinsta_widget_size') ?>">
        <?php _e('Width', 'tinsta') ?>
      </label>
      <select id="<?php echo $object->get_field_id('tinsta_widget_size') ?>"
              name="<?php echo $object->get_field_name('tinsta_widget_size') ?>"
              style="vertical-align: middle; width: 6em;">
        <option value=""><?php _e('Auto', 'tinsta')?></option>
        <?php for ($col_n = 1; $col_n < $cols_num; $col_n++):?>
          <option value="<?php echo $col_width*$col_n?>" <?php selected($instance['tinsta_widget_size'], $col_width*$col_n)?> >
            <?php echo $col_n?>
          </option>
        <?php endfor?>
      </select>
      /<?php echo $cols_num?>
    </p>

    <p>
      <label for="<?php echo $object->get_field_id('tinsta_widget_float') ?>">
        <?php _e('Floating', 'tinsta') ?>
      </label>
      <select name="<?php echo $object->get_field_name('tinsta_widget_float') ?>"
             id="<?php echo $object->get_field_id('tinsta_widget_float') ?>"
             style="vertical-align: middle; width: 6em;">
        <option value="">
          <?php _e('Auto', 'tinsta')?>
        </option>
        <option value="left" <?php selected($instance['tinsta_widget_float'], 'left')?>>
          <?php _e('Left', 'tinsta')?>
        </option>
        <option value="right" <?php selected($instance['tinsta_widget_float'], 'right')?>>
          <?php _e('Right', 'tinsta')?>
        </option>
      </select>
    </p>
    <?php
  }

  $tinsta_fields = ob_get_clean();
  if ($tinsta_fields) {
    ?>
    <fieldset class="tinsta-widget-fieldset">
      <legend>
        <?php _e('Layout', 'tinsta') ?>
      </legend>
      <?php echo $tinsta_fields?>
    </fieldset>
    <?php
  }

  return [$object, $return, $instance];
}, 10, 3);

/**
 * Show Tinsta's types instead of "Custom Link"
 */
add_filter('wp_setup_nav_menu_item', function ($item) {
  if ($item->object === 'tinsta-nav-menu-object') {
    $items = tinsta_nav_menu_items();
    if (!empty($items[$item->type])) {
      $item->type_label = $items[$item->type]['type_label'];
    }
    else {
      $item->type_label = __('Dynamic Content', 'tinsta');
    }
  }
  return $item;
});

/**
 * Helper function that returns Tinsta's custom menu items.
 *
 * The fake ID is required because customizer do not want to accept if they have no unique ID
 *
 * @return array
 */
function tinsta_nav_menu_items()
{
  $items = [];

  $items['tinsta-nav-menu-frontpage'] = [
    'id' => md5( microtime(1) . wp_rand(0, 1000)),
    'title' => __('Front Page (with logo)', 'tinsta'),
    'type' => 'tinsta-nav-menu-frontpage',
    'type_label' => __('Front Page (with logo)', 'tinsta'),
    'object' => 'tinsta-nav-menu-object',
    'object_label' => __('Tinsta Nav Item', 'tinsta'),
  ];

  $items['tinsta-nav-menu-widget-area'] = [
    'id' => md5( microtime(1) . wp_rand(0, 1000)),
    'title' => __('Widgets Area', 'tinsta'),
    'type' => 'tinsta-nav-menu-widget-area',
    'type_label' => __('Widgets Area', 'tinsta'),
    'object' => 'tinsta-nav-menu-object',
    'object_label' => __('Tinsta Nav Item', 'tinsta'),
    'description' => __('Create <em>sidebar</em> and allow managing widgets as <em>mega-menu</em>.', 'tinsta'),
  ];

  $items['tinsta-nav-menu-search-box'] = [
    'id' => md5( microtime(1) . wp_rand(0, 1000)),
    'title' => __('Search Box', 'tinsta'),
    'type' => 'tinsta-nav-menu-search-box',
    'type_label' => __('Search Box', 'tinsta'),
    'object' => 'tinsta-nav-menu-object',
    'object_label' => __('Tinsta Nav Item', 'tinsta'),
  ];

  $items['tinsta-nav-menu-current-user'] = [
    'id' => md5( microtime(1) . wp_rand(0, 1000)),
    'title' => __('%avatar% Hey %name%', 'tinsta'),
    'type' => 'tinsta-nav-menu-current-user',
    'type_label' => __('Current User', 'tinsta'),
    'object' => 'tinsta-nav-menu-object',
    'object_label' => __('Tinsta Nav Item', 'tinsta'),
    'url' => '',
    'description' => __('Displayed only on logged users.', 'tinsta'),
  ];

  $items['tinsta-nav-menu-login-register'] = [
    'id' => md5( microtime(1) . wp_rand(0, 1000)),
    'title' => __('Login & Register', 'tinsta'),
    'type' => 'tinsta-nav-menu-login-register',
    'type_label' => __('Login & Register', 'tinsta'),
    'object' => 'tinsta-nav-menu-object',
    'object_label' => __('Tinsta Nav Item', 'tinsta'),
    'url' => '',
    'description' => __('Displayed only on anonymous users.', 'tinsta'),
  ];

  return $items;
}

/**
 * Add metabox for Tinsta's items in the wp-admin/nav-menus.php
 */
add_action( 'admin_head-nav-menus.php', function() {
  add_meta_box('tinsta_nav_menu_items', __('Dynamic Content', 'tinsta'), function () {
    global $nav_menu_selected_id;
    ?>
    <div id="tinsta-menu-items-div">
      <div class="tabs-panel tabs-panel-active">

        <p>
          <?php _e('Dynamic content items works if are placed as 1st or 2nd level. When placed deeper, they are not dislpayed.', 'tinsta')?>
        </p>

        <ul class="categorychecklist form-no-clear" >
          <?php $index = 0; foreach (tinsta_nav_menu_items() as $item): $index++; ?>
            <li>
              <div>
                <label class="menu-item-title">
                  <input type="checkbox" class="menu-item-checkbox"
                         name="menu-item[<?php echo esc_attr($index)?>][menu-item-object-id]"
                         value="<?php echo esc_attr($index); ?>" />
                  <?php echo esc_html($item['title'])?>
                </label>
                <?php if (!empty($item['description'])):?>
                  <div class="howto">
                    <?php echo $item['description']?>
                  </div>
                <?php endif?>

                <input type="hidden" class="menu-item-type" name="menu-item[<?php echo esc_attr($index)?>][menu-item-type]"
                       value="<?php echo esc_html($item['type'])?>" />

                <input type="hidden" class="menu-item-object" name="menu-item[<?php echo esc_attr($index)?>][menu-item-object]"
                       value="<?php echo esc_html($item['object'])?>" />

                <input type="hidden" class="menu-item-title"
                       name="menu-item[<?php echo esc_attr($index)?>][menu-item-title]"
                       value="<?php echo esc_html($item['title'])?>" />

                <?php if (!empty($item['url'])):?>
                  <input type="hidden" class="menu-item-url" name="menu-item[<?php echo esc_attr($index); ?>][menu-item-url]"
                         value="<?php echo esc_url($item['url']); ?>" />
                <?php endif?>

                <input type="hidden" class="menu-item-classes"
                       name="menu-item[<?php echo esc_attr($index)?>][menu-item-classes]" />
              </div>
            </li>
          <?php endforeach?>
        </ul>
      </div>
      <p class="button-controls">
      <span class="add-to-menu">
        <input type="submit"<?php wp_nav_menu_disabled_check( $nav_menu_selected_id )?>
               class="button-secondary submit-add-to-menu right"
               value="<?php esc_attr_e( 'Add to Menu', 'tinsta' )?>"
               name="add-tinsta-menu-item" id="submit-tinsta-menu-items-div" />
        <span class="spinner"></span>
      </span>
      </p>
    </div>
    <?php
  }, 'nav-menus', 'side', 'low');
});

/**
 * Add metabox for Tinsta's items in the customizer.
 */
add_filter('customize_nav_menu_available_item_types', function($menu_types) {
  $menu_types[] = [
    'title' => __('Dynamic Content', 'tinsta'),
    'type_label' => __('Dynamic Content', 'tinsta'),
    'type' => 'tinsta-menu-item',
    'object' => 'tinsta-nav-menu-object',
  ];
  return $menu_types;
});

/**
 * Add Tinsta's custom menu item to customizer's metabox.
 */
add_filter( 'customize_nav_menu_available_items', function( $items = [], $type = '', $object = '', $page = 0 ) {
  if ( 'tinsta-nav-menu-object' !== $object ) {
    return $items;
  }
  return array_merge( $items, array_values(tinsta_nav_menu_items()) );
}, 10, 4);
