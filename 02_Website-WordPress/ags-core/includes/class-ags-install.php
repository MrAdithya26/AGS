<?php
/**
 * Activation: database table, roles, default categories, mandals and pages.
 *
 * @package AGS_Core
 */

defined( 'ABSPATH' ) || exit;

class AGS_Install {

	const DB_VERSION = '1.0.0';

	public static function activate() {
		AGS_Post_Types::register();
		self::create_tables();
		self::create_roles();
		self::seed_terms();
		self::create_pages();
		update_option( 'ags_db_version', self::DB_VERSION );
		if ( ! wp_next_scheduled( 'ags_daily_maintenance' ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'ags_daily_maintenance' );
		}
		flush_rewrite_rules();
	}

	public static function deactivate() {
		wp_clear_scheduled_hook( 'ags_daily_maintenance' );
		flush_rewrite_rules();
	}

	public static function maybe_upgrade() {
		if ( get_option( 'ags_db_version' ) !== self::DB_VERSION ) {
			self::create_tables();
			self::create_roles();
			update_option( 'ags_db_version', self::DB_VERSION );
		}
	}

	public static function log_table() {
		global $wpdb;
		return $wpdb->prefix . 'ags_request_log';
	}

	public static function create_tables() {
		global $wpdb;
		$table   = self::log_table();
		$charset = $wpdb->get_charset_collate();
		$sql     = "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			request_id bigint(20) unsigned NOT NULL,
			status varchar(32) NOT NULL DEFAULT '',
			note text NULL,
			user_id bigint(20) unsigned NOT NULL DEFAULT 0,
			created_at datetime NOT NULL,
			PRIMARY KEY  (id),
			KEY request_id (request_id)
		) {$charset};";
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
	}

	public static function create_roles() {
		add_role(
			'ags_manager',
			__( 'AGS Manager', 'ags-core' ),
			array(
				'read'                   => true,
				'edit_posts'             => true,
				'edit_others_posts'      => true,
				'edit_published_posts'   => true,
				'publish_posts'          => true,
				'delete_posts'           => true,
				'delete_published_posts' => true,
				'upload_files'           => true,
				'manage_categories'      => true,
				'manage_ags'             => true,
			)
		);
		add_role(
			'ags_provider',
			__( 'AGS Provider', 'ags-core' ),
			array(
				'read'         => true,
				'ags_provider' => true,
			)
		);
		$admin = get_role( 'administrator' );
		if ( $admin ) {
			$admin->add_cap( 'manage_ags' );
		}
	}

	/**
	 * Default service categories (editable later in admin).
	 *
	 * @return array<string,string[]>
	 */
	public static function default_services() {
		return array(
			'Home Services'       => array( 'Electrician', 'Plumber', 'Carpenter', 'Painter', 'AC and Appliance Repair', 'Cleaning', 'Packers and Movers', 'Door Delivery' ),
			'Health'              => array( 'Hospitals and Clinics', 'Pharmacies', 'Diagnostic Labs' ),
			'Shops and Food'      => array( 'Supermarkets', 'Mobile Stores', 'Hotels and Restaurants' ),
			'Education'           => array( 'Schools', 'Colleges', 'Coaching Centres' ),
			'Government Help'     => array( 'Certificates and Applications', 'Scheme Applications' ),
			'Tech Services'       => array( 'Website Design', 'App Development', 'Digital Marketing' ),
			'Public Places'       => array( 'Banks', 'Government Offices' ),
		);
	}

	/**
	 * Srikakulam district mandals. Verify against the district's current official list.
	 *
	 * @return string[]
	 */
	public static function default_mandals() {
		return array(
			'Amadalavalasa', 'Burja', 'Etcherla', 'Ganguvarisigadam', 'Gara', 'Hiramandalam', 'Ichchapuram',
			'Jalumuru', 'Kanchili', 'Kaviti', 'Kotabommali', 'Kothuru', 'Laveru', 'Lakshminarasupeta', 'Mandasa',
			'Meliaputti', 'Nandigam', 'Narasannapeta', 'Palasa', 'Pathapatnam', 'Polaki', 'Ponduru', 'Ranastalam',
			'Santhabommali', 'Saravakota', 'Sarubujjili', 'Sompeta', 'Srikakulam', 'Tekkali', 'Vajrapukotturu',
		);
	}

	public static function seed_terms() {
		foreach ( self::default_services() as $parent => $children ) {
			$parent_term = term_exists( $parent, 'ags_service' );
			if ( ! $parent_term ) {
				$parent_term = wp_insert_term( $parent, 'ags_service' );
			}
			if ( is_wp_error( $parent_term ) ) {
				continue;
			}
			$parent_id = (int) ( is_array( $parent_term ) ? $parent_term['term_id'] : $parent_term );
			foreach ( $children as $child ) {
				if ( ! term_exists( $child, 'ags_service', $parent_id ) ) {
					wp_insert_term( $child, 'ags_service', array( 'parent' => $parent_id ) );
				}
			}
		}
		foreach ( self::default_mandals() as $mandal ) {
			if ( ! term_exists( $mandal, 'ags_mandal' ) ) {
				wp_insert_term( $mandal, 'ags_mandal' );
			}
		}
	}

	/**
	 * Pages the platform needs, each holding one shortcode.
	 *
	 * @return array<string,array{title:string,content:string}>
	 */
	public static function pages() {
		return array(
			'request'   => array(
				'title'   => __( 'Request a Service', 'ags-core' ),
				'content' => '[ags_request_form]',
			),
			'track'     => array(
				'title'   => __( 'Track Your Request', 'ags-core' ),
				'content' => '[ags_track_request]',
			),
			'account'   => array(
				'title'   => __( 'My Requests', 'ags-core' ),
				'content' => '[ags_customer_dashboard]',
			),
			'provider'  => array(
				'title'   => __( 'Provider Dashboard', 'ags-core' ),
				'content' => '[ags_provider_dashboard]',
			),
			'join'      => array(
				'title'   => __( 'Join as a Provider', 'ags-core' ),
				'content' => '[ags_provider_signup]',
			),
			'directory' => array(
				'title'   => __( 'Srikakulam Directory', 'ags-core' ),
				'content' => '[ags_directory]',
			),
		);
	}

	public static function create_pages() {
		$ids = get_option( 'ags_pages', array() );
		foreach ( self::pages() as $key => $page ) {
			if ( ! empty( $ids[ $key ] ) && get_post( $ids[ $key ] ) ) {
				continue;
			}
			$ids[ $key ] = wp_insert_post(
				array(
					'post_type'    => 'page',
					'post_status'  => 'publish',
					'post_title'   => $page['title'],
					'post_content' => $page['content'],
				)
			);
		}
		update_option( 'ags_pages', $ids );
	}

	public static function page_url( $key ) {
		$ids = get_option( 'ags_pages', array() );
		return ! empty( $ids[ $key ] ) ? get_permalink( $ids[ $key ] ) : home_url( '/' );
	}
}
