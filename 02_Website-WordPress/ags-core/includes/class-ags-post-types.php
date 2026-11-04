<?php
/**
 * Content types and taxonomies.
 *
 * @package AGS_Core
 */

defined( 'ABSPATH' ) || exit;

class AGS_Post_Types {

	public static function init() {
		add_action( 'init', array( __CLASS__, 'register' ) );
	}

	public static function register() {
		register_post_type(
			'ags_listing',
			array(
				'labels'       => self::labels( __( 'Listing', 'ags-core' ), __( 'Listings', 'ags-core' ) ),
				'public'       => true,
				'has_archive'  => 'directory',
				'rewrite'      => array( 'slug' => 'listing' ),
				'menu_icon'    => 'dashicons-store',
				'supports'     => array( 'title', 'editor', 'thumbnail', 'excerpt' ),
				'show_in_rest' => true,
				'show_in_menu' => 'ags',
				'capability_type' => 'post',
			)
		);

		register_post_type(
			'ags_provider',
			array(
				'labels'       => self::labels( __( 'Provider', 'ags-core' ), __( 'Providers', 'ags-core' ) ),
				'public'       => true,
				'has_archive'  => 'providers',
				'rewrite'      => array( 'slug' => 'provider' ),
				'supports'     => array( 'title', 'editor', 'thumbnail', 'excerpt' ),
				'show_in_rest' => true,
				'show_in_menu' => 'ags',
			)
		);

		register_post_type(
			'ags_request',
			array(
				'labels'              => self::labels( __( 'Service request', 'ags-core' ), __( 'Service requests', 'ags-core' ) ),
				'public'              => false,
				'show_ui'             => true,
				'show_in_menu'        => 'ags',
				'exclude_from_search' => true,
				'supports'            => array( 'title' ),
				'capability_type'     => 'post',
			)
		);

		register_post_type(
			'ags_lead',
			array(
				'labels'              => self::labels( __( 'Lead', 'ags-core' ), __( 'Leads', 'ags-core' ) ),
				'public'              => false,
				'show_ui'             => true,
				'show_in_menu'        => 'ags',
				'exclude_from_search' => true,
				'supports'            => array( 'title' ),
			)
		);

		$objects = array( 'ags_listing', 'ags_provider', 'ags_request' );

		register_taxonomy(
			'ags_service',
			$objects,
			array(
				'labels'            => array(
					'name'          => __( 'Service categories', 'ags-core' ),
					'singular_name' => __( 'Service category', 'ags-core' ),
					'menu_name'     => __( 'Service categories', 'ags-core' ),
				),
				'hierarchical'      => true,
				'public'            => true,
				'rewrite'           => array( 'slug' => 'services' ),
				'show_in_rest'      => true,
				'show_admin_column' => true,
			)
		);

		register_taxonomy(
			'ags_mandal',
			$objects,
			array(
				'labels'            => array(
					'name'          => __( 'Mandals', 'ags-core' ),
					'singular_name' => __( 'Mandal', 'ags-core' ),
				),
				'hierarchical'      => true,
				'public'            => true,
				'rewrite'           => array( 'slug' => 'mandal' ),
				'show_in_rest'      => true,
				'show_admin_column' => true,
			)
		);
	}

	private static function labels( $singular, $plural ) {
		return array(
			'name'               => $plural,
			'singular_name'      => $singular,
			/* translators: %s: item name */
			'add_new_item'       => sprintf( __( 'Add new %s', 'ags-core' ), strtolower( $singular ) ),
			/* translators: %s: item name */
			'edit_item'          => sprintf( __( 'Edit %s', 'ags-core' ), strtolower( $singular ) ),
			'all_items'          => $plural,
			/* translators: %s: items name */
			'search_items'       => sprintf( __( 'Search %s', 'ags-core' ), strtolower( $plural ) ),
			/* translators: %s: items name */
			'not_found'          => sprintf( __( 'No %s found', 'ags-core' ), strtolower( $plural ) ),
			'menu_name'          => $plural,
		);
	}
}
