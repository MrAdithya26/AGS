<?php
/**
 * Service request workflow: create, assign, status updates, timeline, provider sign-up, leads.
 *
 * @package AGS_Core
 */

defined( 'ABSPATH' ) || exit;

class AGS_Requests {

	public static function init() {
		$actions = array(
			'ags_submit_request'  => 'handle_submit_request',
			'ags_provider_update' => 'handle_provider_update',
			'ags_provider_signup' => 'handle_provider_signup',
			'ags_submit_lead'     => 'handle_submit_lead',
			'ags_rate_request'    => 'handle_rate_request',
		);
		foreach ( $actions as $action => $method ) {
			add_action( 'admin_post_' . $action, array( __CLASS__, $method ) );
			add_action( 'admin_post_nopriv_' . $action, array( __CLASS__, $method ) );
		}
	}

	public static function reference( $request_id ) {
		return 'AGS-' . str_pad( (string) $request_id, 5, '0', STR_PAD_LEFT );
	}

	public static function id_from_reference( $ref ) {
		$ref = strtoupper( trim( (string) $ref ) );
		if ( preg_match( '/^(AGS-)?0*(\d+)$/', $ref, $m ) ) {
			return (int) $m[2];
		}
		return 0;
	}

	/**
	 * Create a service request.
	 *
	 * @param array $data customer_name, phone, address, details, preferred_time, service_id, mandal_id, source, customer_id.
	 * @return int|WP_Error
	 */
	public static function create( array $data ) {
		$service = ! empty( $data['service_id'] ) ? get_term( (int) $data['service_id'], 'ags_service' ) : null;
		$title   = sprintf(
			/* translators: 1: service, 2: customer name */
			__( '%1$s for %2$s', 'ags-core' ),
			( $service && ! is_wp_error( $service ) ) ? $service->name : __( 'Service', 'ags-core' ),
			$data['customer_name']
		);
		$id = wp_insert_post(
			array(
				'post_type'   => 'ags_request',
				'post_status' => 'publish',
				'post_title'  => $title,
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return $id;
		}
		foreach ( array( 'customer_name', 'phone', 'address', 'details', 'preferred_time', 'source', 'customer_id' ) as $field ) {
			if ( isset( $data[ $field ] ) ) {
				AGS_Meta::set( $id, $field, $data[ $field ] );
			}
		}
		AGS_Meta::set( $id, 'status', 'new' );
		if ( $service && ! is_wp_error( $service ) ) {
			wp_set_object_terms( $id, array( (int) $service->term_id ), 'ags_service' );
		}
		if ( ! empty( $data['mandal_id'] ) ) {
			wp_set_object_terms( $id, array( (int) $data['mandal_id'] ), 'ags_mandal' );
		}
		wp_update_post(
			array(
				'ID'         => $id,
				'post_title' => self::reference( $id ) . ' · ' . $title,
			)
		);
		self::log( $id, 'new', __( 'Request received', 'ags-core' ) );
		do_action( 'ags_request_created', $id );
		return $id;
	}

	public static function log( $request_id, $status, $note = '', $user_id = null ) {
		global $wpdb;
		$wpdb->insert(
			AGS_Install::log_table(),
			array(
				'request_id' => (int) $request_id,
				'status'     => sanitize_key( $status ),
				'note'       => $note,
				'user_id'    => null === $user_id ? get_current_user_id() : (int) $user_id,
				'created_at' => current_time( 'mysql' ),
			),
			array( '%d', '%s', '%s', '%d', '%s' )
		);
	}

	public static function timeline( $request_id ) {
		global $wpdb;
		$table = AGS_Install::log_table();
		return $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} WHERE request_id = %d ORDER BY id ASC", $request_id ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	}

	public static function set_status( $request_id, $status, $note = '' ) {
		if ( ! AGS_Statuses::is_request_status( $status ) ) {
			return false;
		}
		$old = AGS_Meta::get( $request_id, 'status' );
		AGS_Meta::set( $request_id, 'status', $status );
		self::log( $request_id, $status, $note );
		do_action( 'ags_request_status_changed', $request_id, $status, $old );
		return true;
	}

	public static function assign( $request_id, $provider_id, $save_meta = true ) {
		if ( $save_meta ) {
			AGS_Meta::set( $request_id, 'provider_id', (int) $provider_id );
		}
		$old = AGS_Meta::get( $request_id, 'status' );
		AGS_Meta::set( $request_id, 'status', 'assigned' );
		self::log(
			$request_id,
			'assigned',
			/* translators: %s: provider name */
			sprintf( __( 'Assigned to %s', 'ags-core' ), get_the_title( $provider_id ) )
		);
		do_action( 'ags_request_assigned', $request_id, $provider_id );
		do_action( 'ags_request_status_changed', $request_id, 'assigned', $old );
	}

	/**
	 * Provider post linked to a user.
	 */
	public static function provider_for_user( $user_id ) {
		if ( ! $user_id ) {
			return 0;
		}
		$posts = get_posts(
			array(
				'post_type'      => 'ags_provider',
				'post_status'    => array( 'publish', 'pending' ),
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'meta_key'       => AGS_Meta::key( 'user_id' ), // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value'     => (string) $user_id, // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);
		return $posts ? (int) $posts[0] : 0;
	}

	private static function back( $url, $args ) {
		wp_safe_redirect( add_query_arg( $args, $url ) );
		exit;
	}

	private static function referer() {
		$ref = wp_get_referer();
		return $ref ? $ref : home_url( '/' );
	}

	/**
	 * Very small flood guard: max 5 form posts per 10 minutes per visitor.
	 */
	private static function too_many_posts() {
		$ip  = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
		$key = 'ags_rl_' . md5( $ip . wp_salt() );
		$n   = (int) get_transient( $key );
		if ( $n >= 5 ) {
			return true;
		}
		set_transient( $key, $n + 1, 10 * MINUTE_IN_SECONDS );
		return false;
	}

	private static function post_field( $name ) {
		return isset( $_POST[ $name ] ) ? sanitize_text_field( wp_unslash( $_POST[ $name ] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification -- verified by callers.
	}

	private static function post_textarea( $name ) {
		return isset( $_POST[ $name ] ) ? sanitize_textarea_field( wp_unslash( $_POST[ $name ] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
	}

	public static function valid_phone( $phone ) {
		$digits = preg_replace( '/\D+/', '', $phone );
		return strlen( $digits ) >= 10 && strlen( $digits ) <= 13;
	}

	public static function handle_submit_request() {
		$back = self::referer();
		if ( ! isset( $_POST['ags_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['ags_nonce'] ) ), 'ags_submit_request' ) ) {
			self::back( $back, array( 'ags_error' => 'expired' ) );
		}
		if ( '' !== self::post_field( 'ags_website' ) ) { // Honeypot.
			self::back( $back, array( 'ags_error' => 'spam' ) );
		}
		if ( self::too_many_posts() ) {
			self::back( $back, array( 'ags_error' => 'limit' ) );
		}
		$data = array(
			'customer_name'  => self::post_field( 'customer_name' ),
			'phone'          => self::post_field( 'phone' ),
			'address'        => self::post_textarea( 'address' ),
			'details'        => self::post_textarea( 'details' ),
			'preferred_time' => self::post_field( 'preferred_time' ),
			'service_id'     => absint( self::post_field( 'service_id' ) ),
			'mandal_id'      => absint( self::post_field( 'mandal_id' ) ),
			'source'         => self::post_field( 'source' ),
			'customer_id'    => get_current_user_id(),
		);
		if ( '' === $data['customer_name'] || ! self::valid_phone( $data['phone'] ) || ! $data['service_id'] || '' === self::post_field( 'consent' ) ) {
			self::back( $back, array( 'ags_error' => 'missing' ) );
		}
		$id = self::create( $data );
		if ( is_wp_error( $id ) ) {
			self::back( $back, array( 'ags_error' => 'failed' ) );
		}
		self::back( $back, array( 'ags_done' => self::reference( $id ) ) );
	}

	public static function handle_provider_update() {
		$back = self::referer();
		if ( ! is_user_logged_in() || ! isset( $_POST['ags_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['ags_nonce'] ) ), 'ags_provider_update' ) ) {
			self::back( $back, array( 'ags_error' => 'expired' ) );
		}
		$request_id  = absint( self::post_field( 'request_id' ) );
		$action      = sanitize_key( self::post_field( 'job_action' ) );
		$provider_id = self::provider_for_user( get_current_user_id() );
		if ( ! $provider_id || 'ags_request' !== get_post_type( $request_id ) || (int) AGS_Meta::get( $request_id, 'provider_id' ) !== $provider_id ) {
			self::back( $back, array( 'ags_error' => 'denied' ) );
		}
		if ( 'decline' === $action ) {
			AGS_Meta::set( $request_id, 'provider_id', '' );
			self::set_status( $request_id, 'new', __( 'Declined by provider, needs reassignment', 'ags-core' ) );
		} elseif ( in_array( $action, AGS_Statuses::provider_allowed(), true ) ) {
			self::set_status( $request_id, $action, __( 'Updated by provider', 'ags-core' ) );
		} else {
			self::back( $back, array( 'ags_error' => 'denied' ) );
		}
		self::back( $back, array( 'ags_updated' => 1 ) );
	}

	public static function handle_rate_request() {
		$back = self::referer();
		if ( ! is_user_logged_in() || ! isset( $_POST['ags_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['ags_nonce'] ) ), 'ags_rate_request' ) ) {
			self::back( $back, array( 'ags_error' => 'expired' ) );
		}
		$request_id = absint( self::post_field( 'request_id' ) );
		$rating     = max( 1, min( 5, absint( self::post_field( 'rating' ) ) ) );
		if ( 'ags_request' !== get_post_type( $request_id ) || (int) AGS_Meta::get( $request_id, 'customer_id' ) !== get_current_user_id() || 'completed' !== AGS_Meta::get( $request_id, 'status' ) ) {
			self::back( $back, array( 'ags_error' => 'denied' ) );
		}
		AGS_Meta::set( $request_id, 'rating', (string) $rating );
		/* translators: %d: stars */
		self::log( $request_id, 'completed', sprintf( __( 'Customer rated %d/5', 'ags-core' ), $rating ) );
		self::back( $back, array( 'ags_updated' => 1 ) );
	}

	public static function handle_provider_signup() {
		$back = self::referer();
		if ( ! isset( $_POST['ags_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['ags_nonce'] ) ), 'ags_provider_signup' ) ) {
			self::back( $back, array( 'ags_error' => 'expired' ) );
		}
		if ( '' !== self::post_field( 'ags_website' ) || self::too_many_posts() ) {
			self::back( $back, array( 'ags_error' => 'limit' ) );
		}
		$name       = self::post_field( 'provider_name' );
		$phone      = self::post_field( 'phone' );
		$email      = sanitize_email( self::post_field( 'email' ) );
		$service_id = absint( self::post_field( 'service_id' ) );
		$mandal_ids = isset( $_POST['mandal_ids'] ) ? array_map( 'absint', (array) wp_unslash( $_POST['mandal_ids'] ) ) : array(); // phpcs:ignore WordPress.Security.NonceVerification
		if ( '' === $name || ! self::valid_phone( $phone ) || ! is_email( $email ) || ! $service_id || '' === self::post_field( 'consent' ) ) {
			self::back( $back, array( 'ags_error' => 'missing' ) );
		}

		$user_id = get_current_user_id();
		if ( ! $user_id ) {
			if ( email_exists( $email ) ) {
				self::back( $back, array( 'ags_error' => 'exists' ) );
			}
			$user_id = wp_insert_user(
				array(
					'user_login'   => sanitize_user( 'p' . preg_replace( '/\D+/', '', $phone ) . wp_rand( 10, 99 ), true ),
					'user_email'   => $email,
					'user_pass'    => wp_generate_password( 20 ),
					'display_name' => $name,
					'role'         => 'ags_provider',
				)
			);
			if ( is_wp_error( $user_id ) ) {
				self::back( $back, array( 'ags_error' => 'failed' ) );
			}
			wp_new_user_notification( $user_id, null, 'user' ); // Sends the set-password email.
		} else {
			$user = wp_get_current_user();
			if ( ! in_array( 'administrator', (array) $user->roles, true ) ) {
				$user->add_role( 'ags_provider' );
			}
		}

		if ( self::provider_for_user( $user_id ) ) {
			self::back( $back, array( 'ags_error' => 'exists' ) );
		}

		$provider_id = wp_insert_post(
			array(
				'post_type'    => 'ags_provider',
				'post_status'  => 'pending',
				'post_title'   => $name,
				'post_content' => self::post_textarea( 'about' ),
			)
		);
		if ( is_wp_error( $provider_id ) ) {
			self::back( $back, array( 'ags_error' => 'failed' ) );
		}
		AGS_Meta::set( $provider_id, 'user_id', (string) $user_id );
		AGS_Meta::set( $provider_id, 'phone', $phone );
		AGS_Meta::set( $provider_id, 'whatsapp', self::post_field( 'whatsapp' ) );
		AGS_Meta::set( $provider_id, 'experience', (string) absint( self::post_field( 'experience' ) ) );
		AGS_Meta::set( $provider_id, 'price_note', self::post_textarea( 'price_note' ) );
		AGS_Meta::set( $provider_id, 'verified', 'no' );
		wp_set_object_terms( $provider_id, array( $service_id ), 'ags_service' );
		if ( $mandal_ids ) {
			wp_set_object_terms( $provider_id, $mandal_ids, 'ags_mandal' );
		}
		do_action( 'ags_provider_signed_up', $provider_id );
		self::back( $back, array( 'ags_done' => 'provider' ) );
	}

	/**
	 * Create a lead (used by the lead form and the REST endpoint).
	 *
	 * @return int|WP_Error
	 */
	public static function create_lead( array $data ) {
		$id = wp_insert_post(
			array(
				'post_type'   => 'ags_lead',
				'post_status' => 'publish',
				'post_title'  => trim( $data['name'] . ( ! empty( $data['business'] ) ? ' · ' . $data['business'] : '' ) ),
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return $id;
		}
		foreach ( array( 'name', 'phone', 'email', 'business', 'need', 'source' ) as $field ) {
			AGS_Meta::set( $id, $field, isset( $data[ $field ] ) ? $data[ $field ] : '' );
		}
		AGS_Meta::set( $id, 'status', 'new' );
		AGS_Meta::set( $id, 'follow_up', current_time( 'Y-m-d' ) );
		do_action( 'ags_lead_created', $id );
		return $id;
	}

	public static function handle_submit_lead() {
		$back = self::referer();
		if ( ! isset( $_POST['ags_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['ags_nonce'] ) ), 'ags_submit_lead' ) ) {
			self::back( $back, array( 'ags_error' => 'expired' ) );
		}
		if ( '' !== self::post_field( 'ags_website' ) || self::too_many_posts() ) {
			self::back( $back, array( 'ags_error' => 'limit' ) );
		}
		$data = array(
			'name'     => self::post_field( 'name' ),
			'phone'    => self::post_field( 'phone' ),
			'email'    => sanitize_email( self::post_field( 'email' ) ),
			'business' => self::post_field( 'business' ),
			'need'     => self::post_textarea( 'need' ),
			'source'   => self::post_field( 'source' ),
		);
		if ( '' === $data['name'] || ! self::valid_phone( $data['phone'] ) || '' === self::post_field( 'consent' ) ) {
			self::back( $back, array( 'ags_error' => 'missing' ) );
		}
		$id = self::create_lead( $data );
		self::back( $back, is_wp_error( $id ) ? array( 'ags_error' => 'failed' ) : array( 'ags_done' => 'lead' ) );
	}
}
