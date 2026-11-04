<?php
/**
 * Front-end output: styles, listing/provider cards and detail boxes, call-to-action buttons, schema, WhatsApp button.
 *
 * @package AGS_Core
 */

defined( 'ABSPATH' ) || exit;

class AGS_Frontend {

	public static function init() {
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'assets' ) );
		add_filter( 'the_content', array( __CLASS__, 'single_details' ), 20 );
		add_filter( 'get_the_archive_description', array( __CLASS__, 'archive_cta' ) );
		add_filter( 'render_block_core/query-title', array( __CLASS__, 'archive_cta_block' ) );
		add_action( 'wp_head', array( __CLASS__, 'schema' ) );
		add_action( 'wp_footer', array( __CLASS__, 'whatsapp_button' ) );
	}

	public static function assets() {
		wp_enqueue_style( 'ags-core', AGS_URL . 'assets/ags.css', array(), AGS_VERSION );
	}

	private static function terms( $post_id, $tax ) {
		$terms = get_the_terms( $post_id, $tax );
		return ( $terms && ! is_wp_error( $terms ) ) ? $terms : array();
	}

	public static function verified_badge( $post_id ) {
		if ( 'yes' === AGS_Meta::get( $post_id, 'verified' ) ) {
			return '<span class="ags-badge ags-badge--completed">✔ ' . esc_html__( 'Verified', 'ags-core' ) . '</span>';
		}
		return '<span class="ags-badge ags-badge--muted">' . esc_html__( 'To be verified', 'ags-core' ) . '</span>';
	}

	private static function wa_link( $number, $text = '' ) {
		$digits = preg_replace( '/\D+/', '', (string) $number );
		if ( 10 === strlen( $digits ) ) {
			$digits = '91' . $digits;
		}
		return 'https://wa.me/' . $digits . ( $text ? '?text=' . rawurlencode( $text ) : '' );
	}

	public static function request_url( $post_id ) {
		$services = self::terms( $post_id, 'ags_service' );
		$args     = array( 'ref' => 'listing-' . $post_id );
		if ( $services ) {
			$args['service'] = $services[0]->slug;
		}
		$mandals = self::terms( $post_id, 'ags_mandal' );
		if ( $mandals ) {
			$args['mandal'] = $mandals[0]->slug;
		}
		return add_query_arg( $args, AGS_Install::page_url( 'request' ) );
	}

	/**
	 * Compact card used in the directory grid and by other templates.
	 */
	public static function card( $post_id ) {
		$type     = get_post_type( $post_id );
		$services = wp_list_pluck( self::terms( $post_id, 'ags_service' ), 'name' );
		$mandals  = wp_list_pluck( self::terms( $post_id, 'ags_mandal' ), 'name' );
		$phone    = AGS_Meta::get( $post_id, 'phone' );
		$out      = '<article class="ags-card ags-listing-card">';
		if ( has_post_thumbnail( $post_id ) ) {
			$out .= '<a href="' . esc_url( get_permalink( $post_id ) ) . '">' . get_the_post_thumbnail( $post_id, 'medium', array( 'class' => 'ags-card__img', 'loading' => 'lazy' ) ) . '</a>';
		}
		$out .= '<h3 class="ags-card__title"><a href="' . esc_url( get_permalink( $post_id ) ) . '">' . esc_html( get_the_title( $post_id ) ) . '</a></h3>';
		$out .= '<p class="ags-muted">' . esc_html( implode( ', ', $services ) ) . ( $mandals ? ' · ' . esc_html( implode( ', ', $mandals ) ) : '' ) . '</p>';
		$out .= '<p>' . self::verified_badge( $post_id ) . ( 'ags_provider' === $type ? ' <span class="ags-badge">' . esc_html__( 'Service provider', 'ags-core' ) . '</span>' : '' ) . '</p>';
		if ( 'ags_listing' === $type && AGS_Meta::get( $post_id, 'timings' ) ) {
			$out .= '<p class="ags-muted">🕒 ' . esc_html( AGS_Meta::get( $post_id, 'timings' ) ) . '</p>';
		}
		$out .= '<div class="ags-card__actions">';
		if ( 'ags_listing' === $type && $phone ) {
			$out .= '<a class="ags-btn" href="tel:' . esc_attr( $phone ) . '">' . esc_html__( 'Call', 'ags-core' ) . '</a>';
		}
		$out .= '<a class="ags-btn ags-btn--primary" href="' . esc_url( self::request_url( $post_id ) ) . '">' . esc_html__( 'Request service', 'ags-core' ) . '</a>';
		$out .= '</div></article>';
		return $out;
	}

	public static function single_details( $content ) {
		if ( ! is_singular( array( 'ags_listing', 'ags_provider' ) ) || ! in_the_loop() || ! is_main_query() ) {
			return $content;
		}
		$id   = get_the_ID();
		$type = get_post_type( $id );
		$rows = array();
		$map  = array(
			'ags_listing'  => array( 'address', 'landmark', 'timings', 'services', 'price_range' ),
			'ags_provider' => array( 'experience', 'price_note', 'area_note' ),
		);
		$fields = AGS_Meta::fields();
		foreach ( $map[ $type ] as $field ) {
			$value = AGS_Meta::get( $id, $field );
			if ( '' !== (string) $value ) {
				$rows[] = '<tr><th>' . esc_html( $fields[ $type ][ $field ]['label'] ) . '</th><td>' . nl2br( esc_html( $value ) ) . '</td></tr>';
			}
		}
		$mandals = wp_list_pluck( self::terms( $id, 'ags_mandal' ), 'name' );
		if ( $mandals ) {
			$rows[] = '<tr><th>' . esc_html__( 'Mandal', 'ags-core' ) . '</th><td>' . esc_html( implode( ', ', $mandals ) ) . '</td></tr>';
		}
		$last = AGS_Meta::get( $id, 'last_checked' );
		if ( $last ) {
			$rows[] = '<tr><th>' . esc_html__( 'Last checked', 'ags-core' ) . '</th><td>' . esc_html( mysql2date( 'd M Y', $last ) ) . '</td></tr>';
		}

		$box  = '<div class="ags-card ags-details"><p>' . self::verified_badge( $id ) . '</p>';
		$box .= $rows ? '<table class="ags-details__table">' . implode( '', $rows ) . '</table>' : '';
		$box .= '<div class="ags-card__actions">';
		$phone = AGS_Meta::get( $id, 'phone' );
		if ( 'ags_listing' === $type && $phone ) {
			$box .= '<a class="ags-btn" href="tel:' . esc_attr( $phone ) . '">📞 ' . esc_html( $phone ) . '</a>';
		}
		$wa = AGS_Meta::get( $id, 'whatsapp' );
		if ( 'ags_listing' === $type && $wa ) {
			$box .= '<a class="ags-btn" href="' . esc_url( self::wa_link( $wa ) ) . '" target="_blank" rel="noopener">WhatsApp</a>';
		}
		$map_url = AGS_Meta::get( $id, 'map_url' );
		if ( $map_url ) {
			$box .= '<a class="ags-btn" href="' . esc_url( $map_url ) . '" target="_blank" rel="noopener">' . esc_html__( 'Directions', 'ags-core' ) . '</a>';
		}
		$box .= '<a class="ags-btn ags-btn--primary" href="' . esc_url( self::request_url( $id ) ) . '">' . esc_html__( 'Request this service', 'ags-core' ) . '</a>';
		$box .= '</div>';
		if ( 'ags_provider' === $type ) {
			$box .= '<p class="ags-muted">' . esc_html__( 'Provider phone numbers are shared after AGS confirms your booking.', 'ags-core' ) . '</p>';
		}
		$box .= '</div>';
		return $box . $content;
	}

	/**
	 * Block themes print the archive title with the query-title block.
	 */
	public static function archive_cta_block( $html ) {
		return $html . self::archive_cta( '' );
	}

	public static function archive_cta( $description ) {
		static $printed = false;
		if ( $printed || is_admin() || doing_action( 'wp_head' ) || ! is_tax( array( 'ags_service', 'ags_mandal' ) ) ) {
			return $description;
		}
		$printed = true;
		$term = get_queried_object();
		$args = array( 'ref' => 'archive' );
		if ( $term && 'ags_service' === $term->taxonomy ) {
			$args['service'] = $term->slug;
		} elseif ( $term ) {
			$args['mandal'] = $term->slug;
		}
		return $description . '<p><a class="ags-btn ags-btn--primary" href="' . esc_url( add_query_arg( $args, AGS_Install::page_url( 'request' ) ) ) . '">' . esc_html__( 'Request this service now', 'ags-core' ) . '</a></p>';
	}

	/**
	 * LocalBusiness structured data for verified listings.
	 */
	public static function schema() {
		if ( ! is_singular( 'ags_listing' ) ) {
			return;
		}
		$id = get_queried_object_id();
		if ( 'yes' !== AGS_Meta::get( $id, 'verified' ) ) {
			return;
		}
		$data = array(
			'@context'  => 'https://schema.org',
			'@type'     => 'LocalBusiness',
			'name'      => get_the_title( $id ),
			'url'       => get_permalink( $id ),
			'telephone' => AGS_Meta::get( $id, 'phone' ),
			'address'   => array(
				'@type'           => 'PostalAddress',
				'streetAddress'   => AGS_Meta::get( $id, 'address' ),
				'addressRegion'   => 'Andhra Pradesh',
				'addressCountry'  => 'IN',
			),
		);
		if ( has_post_thumbnail( $id ) ) {
			$data['image'] = get_the_post_thumbnail_url( $id, 'large' );
		}
		echo '<script type="application/ld+json">' . wp_json_encode( array_filter( $data ) ) . '</script>' . "\n";
	}

	public static function whatsapp_button() {
		$s = AGS_Notify::settings();
		if ( '' === $s['whatsapp_number'] || is_admin() ) {
			return;
		}
		printf(
			'<a class="ags-wa-float" href="%s" target="_blank" rel="noopener" aria-label="%s">WhatsApp</a>',
			esc_url( self::wa_link( $s['whatsapp_number'], __( 'Hi AGS, I need a service.', 'ags-core' ) ) ),
			esc_attr__( 'Chat with AGS on WhatsApp', 'ags-core' )
		);
	}
}
