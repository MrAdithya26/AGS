<?php
/**
 * Plugin Name:       AGS Core
 * Plugin URI:        https://agservices.in
 * Description:       Adithya Group of Services platform: local directory, service providers, service requests, customer and provider dashboards, leads CRM and admin board.
 * Version:           1.0.0
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            Adithya Business and Digital Innovations
 * Author URI:        https://adithyainfohub.com
 * License:           GPL-2.0-or-later
 * Text Domain:       ags-core
 */

defined( 'ABSPATH' ) || exit;

define( 'AGS_VERSION', '1.0.0' );
define( 'AGS_FILE', __FILE__ );
define( 'AGS_DIR', plugin_dir_path( __FILE__ ) );
define( 'AGS_URL', plugin_dir_url( __FILE__ ) );

require_once AGS_DIR . 'includes/class-ags-statuses.php';
require_once AGS_DIR . 'includes/class-ags-post-types.php';
require_once AGS_DIR . 'includes/class-ags-install.php';
require_once AGS_DIR . 'includes/class-ags-meta.php';
require_once AGS_DIR . 'includes/class-ags-requests.php';
require_once AGS_DIR . 'includes/class-ags-notify.php';
require_once AGS_DIR . 'includes/class-ags-shortcodes.php';
require_once AGS_DIR . 'includes/class-ags-admin.php';
require_once AGS_DIR . 'includes/class-ags-rest.php';
require_once AGS_DIR . 'includes/class-ags-frontend.php';

register_activation_hook( __FILE__, array( 'AGS_Install', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'AGS_Install', 'deactivate' ) );

add_action(
	'init',
	static function () {
		load_plugin_textdomain( 'ags-core', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
	},
	1
);

add_action(
	'plugins_loaded',
	static function () {
		AGS_Post_Types::init();
		AGS_Meta::init();
		AGS_Requests::init();
		AGS_Shortcodes::init();
		AGS_Admin::init();
		AGS_Rest::init();
		AGS_Frontend::init();
		AGS_Install::maybe_upgrade();
	}
);
