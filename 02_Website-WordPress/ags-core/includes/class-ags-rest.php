<?php
/**
 * REST API for other ABCD sites:
 *  GET  /wp-json/ags/v1/listings  – verified public directory (sklm.in reads this).
 *  POST /wp-json/ags/v1/leads     – leads from the tech site (needs the Lead API key).
 *
 * @package AGS_Core
 */

defined( 'ABSPATH' ) || exit;

class AGS_Rest {

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
	}

	public static function routes() {
		register_rest_route(
			'ags/v1',
			'/listings',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'listings' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'service'  => array( 'sanitize_callback' => 'sanitize_title' ),
					'mandal'   => array( 'sanitize_callback' => 'sanitize_title' ),
					'search'   => array( 'sanitize_callback' => 'sanitize_text_field' ),
					'per_page' => array(
						'default'           => 20,
						'sanitize_callback' => 'absint',
					),
					'page'     => array(
						'default'           => 1,
						'sanitize_callback' => 'absint',
					),
				),
			)
		);
		register_rest_route(
			'ags/v1',
			'/leads',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'create_lead' ),
				'permission_callback' => array( __CLASS__, 'check_key' ),
			)
		);
	}

	public static function listings( WP_REST_Request $req ) {
		$tax = array();
		foreach ( array( 'service' => 'ags_service', 'mandal' => 'ags_mandal' ) as $param => $taxonomy ) {
			if ( $req[ $param ] ) {
				$tax[] = array(
					'taxonomy' => $taxonomy,
					'field'    => 'slug',
					'terms'    => $req[ $param ],
				);
			}
		}
		$q   = new WP_Query(
			array(
				'post_type'      => 'ags_listing',
				'post_status'    => 'publish',
				's'              => $req['search'],
				'tax_query'      => $tax, // phpcs:ignore WordPress.DB.SlowDBQuery
				'posts_per_page' => min( 50, max( 1, (int) $req['per_page'] ) ),
				'paged'          => max( 1, (int) $req['page'] ),
			)
		);
		$out = array();
		foreach ( $q->posts as $p ) {
			$out[] = array(
				'id'           => $p->ID,
				'name'         => get_the_title( $p ),
				'url'          => get_permalink( $p ),
				'request_url'  => AGS_Frontend::request_url( $p->ID ),
				'image'        => get_the_post_thumbnail_url( $p, 'medium' ),
				'services'     => wp_get_post_terms( $p->ID, 'ags_service', array( 'fields' => 'names' ) ),
				'mandals'      => wp_get_post_terms( $p->ID, 'ags_mandal', array( 'fields' => 'names' ) ),
				'phone'        => AGS_Meta::get( $p->ID, 'phone' ),
				'address'      => AGS_Meta::get( $p->ID, 'address' ),
				'landmark'     => AGS_Meta::get( $p->ID, 'landmark' ),
				'timings'      => AGS_Meta::get( $p->ID, 'timings' ),
				'verified'     => 'yes' === AGS_Meta::get( $p->ID, 'verified' ),
				'last_checked' => AGS_Meta::get( $p->ID, 'last_checked' ),
			);
		}
		$res = rest_ensure_response( $out );
		$res->header( 'X-WP-Total', (string) $q->found_posts );
		$res->header( 'X-WP-TotalPages', (string) $q->max_num_pages );
		return $res;
	}

	public static function check_key( WP_REST_Request $req ) {
		$key = AGS_Notify::settings()['lead_api_key'];
		return '' !== $key && hash_equals( $key, (string) $req->get_header( 'x-ags-key' ) );
	}

	public static function create_lead( WP_REST_Request $req ) {
		$data = array(
			'name'     => sanitize_text_field( (string) $req['name'] ),
			'phone'    => sanitize_text_field( (string) $req['phone'] ),
			'email'    => sanitize_email( (string) $req['email'] ),
			'business' => sanitize_text_field( (string) $req['business'] ),
			'need'     => sanitize_textarea_field( (string) $req['need'] ),
			'source'   => sanitize_text_field( (string) $req['source'] ),
		);
		if ( '' === $data['name'] || ! AGS_Requests::valid_phone( $data['phone'] ) ) {
			return new WP_Error( 'ags_invalid', 'Name and a valid phone number are required.', array( 'status' => 400 ) );
		}
		$id = AGS_Requests::create_lead( $data );
		if ( is_wp_error( $id ) ) {
			return $id;
		}
		return rest_ensure_response( array( 'ok' => true, 'id' => $id ) );
	}
}
