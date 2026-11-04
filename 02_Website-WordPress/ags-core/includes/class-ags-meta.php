<?php
/**
 * Custom fields for listings, providers, requests and leads.
 *
 * @package AGS_Core
 */

defined( 'ABSPATH' ) || exit;

class AGS_Meta {

	/**
	 * Field definitions per content type.
	 * type: text | textarea | tel | url | email | date | yesno | select | number
	 *
	 * @return array<string,array<string,array>>
	 */
	public static function fields() {
		return array(
			'ags_listing'  => array(
				'phone'        => array( 'label' => __( 'Phone', 'ags-core' ), 'type' => 'tel' ),
				'whatsapp'     => array( 'label' => __( 'WhatsApp', 'ags-core' ), 'type' => 'tel' ),
				'address'      => array( 'label' => __( 'Full address', 'ags-core' ), 'type' => 'textarea' ),
				'landmark'     => array( 'label' => __( 'Landmark', 'ags-core' ), 'type' => 'text' ),
				'timings'      => array( 'label' => __( 'Timings', 'ags-core' ), 'type' => 'text' ),
				'services'     => array( 'label' => __( 'Services offered', 'ags-core' ), 'type' => 'textarea' ),
				'price_range'  => array( 'label' => __( 'Price range (only if given by the business)', 'ags-core' ), 'type' => 'text' ),
				'map_url'      => array( 'label' => __( 'Google Maps link (only if provided)', 'ags-core' ), 'type' => 'url' ),
				'verified'     => array( 'label' => __( 'Verified', 'ags-core' ), 'type' => 'yesno' ),
				'last_checked' => array( 'label' => __( 'Last checked date', 'ags-core' ), 'type' => 'date' ),
			),
			'ags_provider' => array(
				'user_id'        => array( 'label' => __( 'Linked user ID', 'ags-core' ), 'type' => 'number' ),
				'phone'          => array( 'label' => __( 'Phone', 'ags-core' ), 'type' => 'tel' ),
				'whatsapp'       => array( 'label' => __( 'WhatsApp', 'ags-core' ), 'type' => 'tel' ),
				'experience'     => array( 'label' => __( 'Experience (years)', 'ags-core' ), 'type' => 'number' ),
				'price_note'     => array( 'label' => __( 'Prices / visiting charge', 'ags-core' ), 'type' => 'textarea' ),
				'area_note'      => array( 'label' => __( 'Areas served (notes)', 'ags-core' ), 'type' => 'textarea' ),
				'id_checked'     => array( 'label' => __( 'ID proof checked', 'ags-core' ), 'type' => 'yesno' ),
				'verified'       => array( 'label' => __( 'Verified', 'ags-core' ), 'type' => 'yesno' ),
				'last_checked'   => array( 'label' => __( 'Last checked date', 'ags-core' ), 'type' => 'date' ),
				'verified_by'    => array( 'label' => __( 'Verified by (team member)', 'ags-core' ), 'type' => 'text' ),
			),
			'ags_request'  => array(
				'customer_name'  => array( 'label' => __( 'Customer name', 'ags-core' ), 'type' => 'text' ),
				'phone'          => array( 'label' => __( 'Phone', 'ags-core' ), 'type' => 'tel' ),
				'address'        => array( 'label' => __( 'Address', 'ags-core' ), 'type' => 'textarea' ),
				'details'        => array( 'label' => __( 'Problem / details', 'ags-core' ), 'type' => 'textarea' ),
				'preferred_time' => array( 'label' => __( 'Preferred time', 'ags-core' ), 'type' => 'text' ),
				'status'         => array( 'label' => __( 'Status', 'ags-core' ), 'type' => 'select', 'options' => AGS_Statuses::request() ),
				'provider_id'    => array( 'label' => __( 'Assigned provider', 'ags-core' ), 'type' => 'provider' ),
				'customer_id'    => array( 'label' => __( 'Customer user ID', 'ags-core' ), 'type' => 'number' ),
				'amount'         => array( 'label' => __( 'Job amount (₹)', 'ags-core' ), 'type' => 'number' ),
				'commission'     => array( 'label' => __( 'AGS commission (₹)', 'ags-core' ), 'type' => 'number' ),
				'source'         => array( 'label' => __( 'Source', 'ags-core' ), 'type' => 'text' ),
				'rating'         => array( 'label' => __( 'Customer rating (1-5)', 'ags-core' ), 'type' => 'number' ),
			),
			'ags_lead'     => array(
				'name'      => array( 'label' => __( 'Name', 'ags-core' ), 'type' => 'text' ),
				'phone'     => array( 'label' => __( 'Phone', 'ags-core' ), 'type' => 'tel' ),
				'email'     => array( 'label' => __( 'Email', 'ags-core' ), 'type' => 'email' ),
				'business'  => array( 'label' => __( 'Business', 'ags-core' ), 'type' => 'text' ),
				'need'      => array( 'label' => __( 'What they need', 'ags-core' ), 'type' => 'textarea' ),
				'source'    => array( 'label' => __( 'Source site', 'ags-core' ), 'type' => 'text' ),
				'status'    => array( 'label' => __( 'Status', 'ags-core' ), 'type' => 'select', 'options' => AGS_Statuses::lead() ),
				'follow_up' => array( 'label' => __( 'Next follow-up', 'ags-core' ), 'type' => 'date' ),
				'notes'     => array( 'label' => __( 'Notes', 'ags-core' ), 'type' => 'textarea' ),
			),
		);
	}

	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_meta' ) );
		add_action( 'add_meta_boxes', array( __CLASS__, 'add_boxes' ) );
		add_action( 'save_post', array( __CLASS__, 'save' ), 10, 2 );
	}

	public static function key( $field ) {
		return '_ags_' . $field;
	}

	public static function get( $post_id, $field ) {
		return get_post_meta( $post_id, self::key( $field ), true );
	}

	public static function set( $post_id, $field, $value ) {
		update_post_meta( $post_id, self::key( $field ), $value );
	}

	/**
	 * Public listing fields are exposed in the REST API so sklm.in can read them.
	 */
	public static function register_meta() {
		$public = array( 'phone', 'whatsapp', 'address', 'landmark', 'timings', 'services', 'price_range', 'map_url', 'verified', 'last_checked' );
		foreach ( $public as $field ) {
			register_post_meta(
				'ags_listing',
				self::key( $field ),
				array(
					'type'          => 'string',
					'single'        => true,
					'show_in_rest'  => true,
					'auth_callback' => static function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);
		}
	}

	public static function add_boxes() {
		foreach ( array_keys( self::fields() ) as $type ) {
			add_meta_box( 'ags_fields', __( 'AGS details', 'ags-core' ), array( __CLASS__, 'render_box' ), $type, 'normal', 'high' );
		}
		add_meta_box( 'ags_timeline', __( 'Request timeline', 'ags-core' ), array( __CLASS__, 'render_timeline' ), 'ags_request', 'side' );
	}

	public static function render_box( $post ) {
		$fields = self::fields();
		if ( empty( $fields[ $post->post_type ] ) ) {
			return;
		}
		wp_nonce_field( 'ags_save_meta', 'ags_meta_nonce' );
		echo '<table class="form-table ags-fields">';
		foreach ( $fields[ $post->post_type ] as $name => $def ) {
			$value = self::get( $post->ID, $name );
			echo '<tr><th><label for="ags_' . esc_attr( $name ) . '">' . esc_html( $def['label'] ) . '</label></th><td>';
			self::render_input( 'ags_meta[' . $name . ']', 'ags_' . $name, $def, $value );
			echo '</td></tr>';
		}
		echo '</table>';
	}

	public static function render_input( $input_name, $id, $def, $value ) {
		$type = $def['type'];
		switch ( $type ) {
			case 'textarea':
				printf( '<textarea class="large-text" rows="3" name="%s" id="%s">%s</textarea>', esc_attr( $input_name ), esc_attr( $id ), esc_textarea( $value ) );
				break;
			case 'yesno':
				printf(
					'<select name="%1$s" id="%2$s"><option value="no" %3$s>%4$s</option><option value="yes" %5$s>%6$s</option></select>',
					esc_attr( $input_name ),
					esc_attr( $id ),
					selected( $value, 'no', false ),
					esc_html__( 'No / To be verified', 'ags-core' ),
					selected( $value, 'yes', false ),
					esc_html__( 'Yes', 'ags-core' )
				);
				break;
			case 'select':
				printf( '<select name="%s" id="%s">', esc_attr( $input_name ), esc_attr( $id ) );
				foreach ( $def['options'] as $opt => $label ) {
					printf( '<option value="%s" %s>%s</option>', esc_attr( $opt ), selected( $value, $opt, false ), esc_html( $label ) );
				}
				echo '</select>';
				break;
			case 'provider':
				printf( '<select name="%s" id="%s"><option value="">%s</option>', esc_attr( $input_name ), esc_attr( $id ), esc_html__( 'Not assigned', 'ags-core' ) );
				foreach ( self::provider_options() as $pid => $label ) {
					printf( '<option value="%d" %s>%s</option>', (int) $pid, selected( (int) $value, (int) $pid, false ), esc_html( $label ) );
				}
				echo '</select>';
				break;
			default:
				$html_type = in_array( $type, array( 'tel', 'url', 'email', 'date', 'number' ), true ) ? $type : 'text';
				printf( '<input class="regular-text" type="%s" name="%s" id="%s" value="%s" />', esc_attr( $html_type ), esc_attr( $input_name ), esc_attr( $id ), esc_attr( $value ) );
		}
	}

	/**
	 * Published providers for assignment dropdowns.
	 *
	 * @return array<int,string>
	 */
	public static function provider_options() {
		$posts = get_posts(
			array(
				'post_type'      => 'ags_provider',
				'post_status'    => 'publish',
				'posts_per_page' => 500,
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);
		$out = array();
		foreach ( $posts as $p ) {
			$terms           = wp_get_post_terms( $p->ID, 'ags_service', array( 'fields' => 'names' ) );
			$out[ $p->ID ] = $p->post_title . ( $terms ? ' (' . implode( ', ', $terms ) . ')' : '' );
		}
		return $out;
	}

	public static function sanitize( $def, $raw ) {
		$raw = wp_unslash( $raw );
		switch ( $def['type'] ) {
			case 'textarea':
				return sanitize_textarea_field( $raw );
			case 'url':
				return esc_url_raw( $raw );
			case 'email':
				return sanitize_email( $raw );
			case 'number':
			case 'provider':
				return '' === $raw ? '' : (string) absint( $raw );
			case 'yesno':
				return 'yes' === $raw ? 'yes' : 'no';
			case 'select':
				return array_key_exists( $raw, $def['options'] ) ? $raw : '';
			case 'date':
				return preg_match( '/^\d{4}-\d{2}-\d{2}$/', $raw ) ? $raw : '';
			default:
				return sanitize_text_field( $raw );
		}
	}

	public static function save( $post_id, $post ) {
		if ( ! isset( $_POST['ags_meta_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['ags_meta_nonce'] ) ), 'ags_save_meta' ) ) {
			return;
		}
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		$fields = self::fields();
		if ( empty( $fields[ $post->post_type ] ) || empty( $_POST['ags_meta'] ) || ! is_array( $_POST['ags_meta'] ) ) {
			return;
		}
		$input = $_POST['ags_meta']; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- sanitized per field below.

		$old_status   = self::get( $post_id, 'status' );
		$old_provider = (int) self::get( $post_id, 'provider_id' );

		foreach ( $fields[ $post->post_type ] as $name => $def ) {
			if ( ! isset( $input[ $name ] ) ) {
				continue;
			}
			self::set( $post_id, $name, self::sanitize( $def, $input[ $name ] ) );
		}

		if ( 'ags_request' === $post->post_type ) {
			$new_status   = self::get( $post_id, 'status' );
			$new_provider = (int) self::get( $post_id, 'provider_id' );
			if ( $new_provider && $new_provider !== $old_provider ) {
				AGS_Requests::assign( $post_id, $new_provider, false );
			} elseif ( $new_status !== $old_status ) {
				AGS_Requests::log( $post_id, $new_status, __( 'Status changed in admin', 'ags-core' ) );
				do_action( 'ags_request_status_changed', $post_id, $new_status, $old_status );
			}
		}
	}

	public static function render_timeline( $post ) {
		$rows = AGS_Requests::timeline( $post->ID );
		if ( ! $rows ) {
			echo '<p>' . esc_html__( 'No updates yet.', 'ags-core' ) . '</p>';
			return;
		}
		echo '<ol class="ags-timeline">';
		foreach ( $rows as $row ) {
			printf(
				'<li><strong>%s</strong><br><small>%s</small>%s</li>',
				esc_html( AGS_Statuses::request_label( $row->status ) ),
				esc_html( mysql2date( 'd M Y, h:i A', $row->created_at ) ),
				$row->note ? '<br>' . esc_html( $row->note ) : ''
			);
		}
		echo '</ol>';
	}
}
