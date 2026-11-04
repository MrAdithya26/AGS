<?php
/**
 * Public shortcodes: request form, tracking, dashboards, provider sign-up, directory, lead form, service grid.
 *
 * @package AGS_Core
 */

defined( 'ABSPATH' ) || exit;

class AGS_Shortcodes {

	public static function init() {
		$codes = array(
			'ags_request_form'       => 'request_form',
			'ags_track_request'      => 'track_request',
			'ags_customer_dashboard' => 'customer_dashboard',
			'ags_provider_dashboard' => 'provider_dashboard',
			'ags_provider_signup'    => 'provider_signup',
			'ags_directory'          => 'directory',
			'ags_lead_form'          => 'lead_form',
			'ags_service_grid'       => 'service_grid',
		);
		foreach ( $codes as $tag => $method ) {
			add_shortcode( $tag, array( __CLASS__, $method ) );
		}
	}

	private static function get_param( $name ) {
		return isset( $_GET[ $name ] ) ? sanitize_text_field( wp_unslash( $_GET[ $name ] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification -- read-only display.
	}

	public static function notices() {
		$out   = '';
		$done  = self::get_param( 'ags_done' );
		$error = self::get_param( 'ags_error' );
		if ( 'provider' === $done ) {
			$out .= self::notice( 'success', __( 'Thank you! Your application is received. Our team will call you to verify. Check your email to set your password.', 'ags-core' ) );
		} elseif ( 'lead' === $done ) {
			$out .= self::notice( 'success', __( 'Thank you! We will contact you within one working day.', 'ags-core' ) );
		} elseif ( '' !== $done ) {
			$out .= self::notice(
				'success',
				sprintf(
					/* translators: %s: request reference */
					__( 'Request received! Your reference number is %s. We will call you shortly. Save this number to track your request.', 'ags-core' ),
					'<strong>' . esc_html( $done ) . '</strong>'
				)
			);
		}
		if ( self::get_param( 'ags_updated' ) ) {
			$out .= self::notice( 'success', __( 'Updated.', 'ags-core' ) );
		}
		$messages = array(
			'expired' => __( 'The form expired. Please try again.', 'ags-core' ),
			'missing' => __( 'Please fill all required fields with a valid 10-digit phone number and accept the consent.', 'ags-core' ),
			'limit'   => __( 'Too many submissions. Please wait a few minutes and try again.', 'ags-core' ),
			'spam'    => __( 'Submission blocked.', 'ags-core' ),
			'failed'  => __( 'Something went wrong. Please call or WhatsApp us.', 'ags-core' ),
			'denied'  => __( 'You do not have permission for that action.', 'ags-core' ),
			'exists'  => __( 'An account already exists with this email. Please log in first, then apply.', 'ags-core' ),
		);
		if ( isset( $messages[ $error ] ) ) {
			$out .= self::notice( 'error', $messages[ $error ] );
		}
		return $out;
	}

	private static function notice( $type, $html ) {
		return '<div class="ags-notice ags-notice--' . esc_attr( $type ) . '" role="status">' . wp_kses_post( $html ) . '</div>';
	}

	private static function term_select( $taxonomy, $name, $selected = 0, $placeholder = '', $required = false ) {
		$args = array(
			'taxonomy'          => $taxonomy,
			'name'              => $name,
			'id'                => 'ags-' . $name,
			'hide_empty'        => false,
			'hierarchical'      => true,
			'selected'          => (int) $selected,
			'show_option_none'  => $placeholder,
			'option_none_value' => '',
			'echo'              => false,
			'orderby'           => 'name',
			'class'             => 'ags-input',
			'required'          => $required,
		);
		return wp_dropdown_categories( $args );
	}

	private static function honeypot() {
		return '<div class="ags-hp" aria-hidden="true"><label>Website <input type="text" name="ags_website" tabindex="-1" autocomplete="off"></label></div>';
	}

	private static function consent_box() {
		return '<label class="ags-consent"><input type="checkbox" name="consent" value="1" required> ' .
			esc_html__( 'I agree that AGS may contact me by phone or WhatsApp about this request and share my details with the assigned provider.', 'ags-core' ) .
			'</label>';
	}

	private static function slug_term_id( $slug, $taxonomy ) {
		if ( '' === $slug ) {
			return 0;
		}
		$term = get_term_by( 'slug', sanitize_title( $slug ), $taxonomy );
		return $term ? (int) $term->term_id : 0;
	}

	public static function request_form( $atts ) {
		$atts       = shortcode_atts( array( 'service' => '' ), $atts );
		$service_id = self::slug_term_id( self::get_param( 'service' ) ? self::get_param( 'service' ) : $atts['service'], 'ags_service' );
		$mandal_id  = self::slug_term_id( self::get_param( 'mandal' ), 'ags_mandal' );
		$user       = wp_get_current_user();
		$source     = self::get_param( 'ref' ) ? self::get_param( 'ref' ) : 'agservices.in';

		ob_start();
		echo self::notices(); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped inside.
		?>
		<form class="ags-form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="ags_submit_request">
			<input type="hidden" name="source" value="<?php echo esc_attr( $source ); ?>">
			<?php wp_nonce_field( 'ags_submit_request', 'ags_nonce' ); ?>
			<?php echo self::honeypot(); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			<p><label for="ags-service_id"><?php esc_html_e( 'Service needed / ఏ సేవ కావాలి', 'ags-core' ); ?> *</label>
				<?php echo self::term_select( 'ags_service', 'service_id', $service_id, __( 'Choose a service', 'ags-core' ), true ); // phpcs:ignore WordPress.Security.EscapeOutput ?></p>
			<p><label for="ags-mandal_id"><?php esc_html_e( 'Mandal / మండలం', 'ags-core' ); ?></label>
				<?php echo self::term_select( 'ags_mandal', 'mandal_id', $mandal_id, __( 'Choose your mandal', 'ags-core' ) ); // phpcs:ignore WordPress.Security.EscapeOutput ?></p>
			<p><label for="ags-name"><?php esc_html_e( 'Your name / మీ పేరు', 'ags-core' ); ?> *</label>
				<input class="ags-input" id="ags-name" name="customer_name" required value="<?php echo esc_attr( $user->exists() ? $user->display_name : '' ); ?>"></p>
			<p><label for="ags-phone"><?php esc_html_e( 'Phone / WhatsApp number', 'ags-core' ); ?> *</label>
				<input class="ags-input" id="ags-phone" name="phone" type="tel" inputmode="numeric" pattern="[0-9+ ]{10,15}" required></p>
			<p><label for="ags-address"><?php esc_html_e( 'Address with landmark / చిరునామా', 'ags-core' ); ?></label>
				<textarea class="ags-input" id="ags-address" name="address" rows="2"></textarea></p>
			<p><label for="ags-details"><?php esc_html_e( 'What is the problem? / సమస్య ఏమిటి', 'ags-core' ); ?></label>
				<textarea class="ags-input" id="ags-details" name="details" rows="3"></textarea></p>
			<p><label for="ags-time"><?php esc_html_e( 'Preferred date and time', 'ags-core' ); ?></label>
				<input class="ags-input" id="ags-time" name="preferred_time" placeholder="<?php esc_attr_e( 'e.g. Tomorrow morning', 'ags-core' ); ?>"></p>
			<p><?php echo self::consent_box(); // phpcs:ignore WordPress.Security.EscapeOutput ?></p>
			<p><button class="ags-btn ags-btn--primary" type="submit"><?php esc_html_e( 'Send request', 'ags-core' ); ?></button></p>
			<?php if ( ! $user->exists() ) : ?>
				<p class="ags-muted"><?php esc_html_e( 'Tip: log in before sending to track all your requests in one place.', 'ags-core' ); ?>
					<a href="<?php echo esc_url( wp_login_url( get_permalink() ) ); ?>"><?php esc_html_e( 'Log in', 'ags-core' ); ?></a></p>
			<?php endif; ?>
		</form>
		<?php
		return ob_get_clean();
	}

	public static function render_timeline( $request_id ) {
		$rows = AGS_Requests::timeline( $request_id );
		$out  = '<ol class="ags-timeline">';
		foreach ( $rows as $row ) {
			$out .= '<li><span class="ags-timeline__status">' . esc_html( AGS_Statuses::request_label( $row->status ) ) . '</span> <span class="ags-muted">' . esc_html( mysql2date( 'd M, h:i A', $row->created_at ) ) . '</span></li>';
		}
		return $out . '</ol>';
	}

	public static function status_badge( $status ) {
		return '<span class="ags-badge ags-badge--' . esc_attr( $status ) . '">' . esc_html( AGS_Statuses::request_label( $status ) ) . '</span>';
	}

	public static function track_request() {
		$ref   = self::get_param( 'ref_no' );
		$phone = preg_replace( '/\D+/', '', self::get_param( 'phone' ) );
		ob_start();
		?>
		<form class="ags-form ags-form--inline" method="get">
			<input class="ags-input" name="ref_no" placeholder="<?php esc_attr_e( 'Reference e.g. AGS-00012', 'ags-core' ); ?>" value="<?php echo esc_attr( $ref ); ?>" required>
			<input class="ags-input" name="phone" type="tel" placeholder="<?php esc_attr_e( 'Phone number used', 'ags-core' ); ?>" required>
			<button class="ags-btn ags-btn--primary" type="submit"><?php esc_html_e( 'Track', 'ags-core' ); ?></button>
		</form>
		<?php
		if ( '' !== $ref ) {
			$id    = AGS_Requests::id_from_reference( $ref );
			$saved = preg_replace( '/\D+/', '', (string) AGS_Meta::get( $id, 'phone' ) );
			if ( $id && 'ags_request' === get_post_type( $id ) && '' !== $phone && substr( $saved, -10 ) === substr( $phone, -10 ) ) {
				echo '<div class="ags-card"><h3>' . esc_html( AGS_Requests::reference( $id ) ) . ' ' . self::status_badge( AGS_Meta::get( $id, 'status' ) ) . '</h3>'; // phpcs:ignore WordPress.Security.EscapeOutput
				echo self::render_timeline( $id ) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput
			} else {
				echo self::notice( 'error', __( 'No request found for that reference and phone number.', 'ags-core' ) ); // phpcs:ignore WordPress.Security.EscapeOutput
			}
		}
		return ob_get_clean();
	}

	private static function login_prompt( $message ) {
		return '<div class="ags-card"><p>' . esc_html( $message ) . '</p>' . wp_login_form(
			array(
				'echo'     => false,
				'redirect' => get_permalink(),
			)
		) . '</div>';
	}

	public static function customer_dashboard() {
		if ( ! is_user_logged_in() ) {
			return self::login_prompt( __( 'Log in to see your service requests.', 'ags-core' ) );
		}
		$requests = get_posts(
			array(
				'post_type'      => 'ags_request',
				'posts_per_page' => 50,
				'meta_key'       => AGS_Meta::key( 'customer_id' ), // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value'     => (string) get_current_user_id(), // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);
		ob_start();
		echo self::notices(); // phpcs:ignore WordPress.Security.EscapeOutput
		echo '<p><a class="ags-btn ags-btn--primary" href="' . esc_url( AGS_Install::page_url( 'request' ) ) . '">' . esc_html__( 'New request', 'ags-core' ) . '</a></p>';
		if ( ! $requests ) {
			echo '<p>' . esc_html__( 'You have no requests yet.', 'ags-core' ) . '</p>';
		}
		foreach ( $requests as $r ) {
			$status   = AGS_Meta::get( $r->ID, 'status' );
			$provider = (int) AGS_Meta::get( $r->ID, 'provider_id' );
			echo '<div class="ags-card">';
			echo '<h3>' . esc_html( $r->post_title ) . ' ' . self::status_badge( $status ) . '</h3>'; // phpcs:ignore WordPress.Security.EscapeOutput
			if ( $provider ) {
				echo '<p>' . esc_html__( 'Provider:', 'ags-core' ) . ' <a href="' . esc_url( get_permalink( $provider ) ) . '">' . esc_html( get_the_title( $provider ) ) . '</a></p>';
			}
			echo self::render_timeline( $r->ID ); // phpcs:ignore WordPress.Security.EscapeOutput
			if ( 'completed' === $status && ! AGS_Meta::get( $r->ID, 'rating' ) ) {
				?>
				<form class="ags-form ags-form--inline" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<input type="hidden" name="action" value="ags_rate_request">
					<input type="hidden" name="request_id" value="<?php echo (int) $r->ID; ?>">
					<?php wp_nonce_field( 'ags_rate_request', 'ags_nonce' ); ?>
					<label><?php esc_html_e( 'Rate this job', 'ags-core' ); ?>
						<select class="ags-input" name="rating"><option value="5">★★★★★</option><option value="4">★★★★</option><option value="3">★★★</option><option value="2">★★</option><option value="1">★</option></select></label>
					<button class="ags-btn" type="submit"><?php esc_html_e( 'Submit rating', 'ags-core' ); ?></button>
				</form>
				<?php
			}
			echo '</div>';
		}
		return ob_get_clean();
	}

	public static function provider_dashboard() {
		if ( ! is_user_logged_in() ) {
			return self::login_prompt( __( 'Providers: log in to see your jobs.', 'ags-core' ) );
		}
		$provider_id = AGS_Requests::provider_for_user( get_current_user_id() );
		if ( ! $provider_id ) {
			return '<div class="ags-card"><p>' . esc_html__( 'This account is not linked to a provider profile yet.', 'ags-core' ) . ' <a href="' . esc_url( AGS_Install::page_url( 'join' ) ) . '">' . esc_html__( 'Join as a provider', 'ags-core' ) . '</a></p></div>';
		}
		ob_start();
		echo self::notices(); // phpcs:ignore WordPress.Security.EscapeOutput
		$verified = 'yes' === AGS_Meta::get( $provider_id, 'verified' ) && 'publish' === get_post_status( $provider_id );
		echo '<div class="ags-card"><h3>' . esc_html( get_the_title( $provider_id ) ) . '</h3><p>' .
			( $verified ? '<span class="ags-badge ags-badge--completed">' . esc_html__( 'Verified', 'ags-core' ) . '</span>' : '<span class="ags-badge ags-badge--new">' . esc_html__( 'Waiting for verification', 'ags-core' ) . '</span>' ) .
			'</p></div>';

		$jobs = get_posts(
			array(
				'post_type'      => 'ags_request',
				'posts_per_page' => 50,
				'meta_key'       => AGS_Meta::key( 'provider_id' ), // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value'     => (string) $provider_id, // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);
		$earned = 0;
		echo '<h3>' . esc_html__( 'My jobs', 'ags-core' ) . '</h3>';
		if ( ! $jobs ) {
			echo '<p>' . esc_html__( 'No jobs yet. New jobs appear here and in your email.', 'ags-core' ) . '</p>';
		}
		$next = array(
			'assigned'    => array( 'accepted' => __( 'Accept job', 'ags-core' ), 'decline' => __( 'Decline', 'ags-core' ) ),
			'accepted'    => array( 'on_the_way' => __( 'I am on the way', 'ags-core' ) ),
			'on_the_way'  => array( 'in_progress' => __( 'Work started', 'ags-core' ) ),
			'in_progress' => array( 'completed' => __( 'Mark completed', 'ags-core' ) ),
		);
		foreach ( $jobs as $job ) {
			$status = AGS_Meta::get( $job->ID, 'status' );
			if ( 'completed' === $status ) {
				$earned += (float) AGS_Meta::get( $job->ID, 'amount' ) - (float) AGS_Meta::get( $job->ID, 'commission' );
			}
			echo '<div class="ags-card"><h4>' . esc_html( $job->post_title ) . ' ' . self::status_badge( $status ) . '</h4>'; // phpcs:ignore WordPress.Security.EscapeOutput
			if ( 'assigned' !== $status ) { // Customer contact shown only after acceptance.
				echo '<p>' . esc_html__( 'Customer:', 'ags-core' ) . ' ' . esc_html( AGS_Meta::get( $job->ID, 'customer_name' ) ) . ' · <a href="tel:' . esc_attr( AGS_Meta::get( $job->ID, 'phone' ) ) . '">' . esc_html( AGS_Meta::get( $job->ID, 'phone' ) ) . '</a></p>';
				echo '<p>' . esc_html( AGS_Meta::get( $job->ID, 'address' ) ) . '</p>';
			}
			echo '<p>' . esc_html( AGS_Meta::get( $job->ID, 'details' ) ) . '</p>';
			echo '<p class="ags-muted">' . esc_html__( 'Preferred time:', 'ags-core' ) . ' ' . esc_html( AGS_Meta::get( $job->ID, 'preferred_time' ) ) . '</p>';
			if ( isset( $next[ $status ] ) ) {
				foreach ( $next[ $status ] as $action => $label ) {
					?>
					<form class="ags-inline" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
						<input type="hidden" name="action" value="ags_provider_update">
						<input type="hidden" name="request_id" value="<?php echo (int) $job->ID; ?>">
						<input type="hidden" name="job_action" value="<?php echo esc_attr( $action ); ?>">
						<?php wp_nonce_field( 'ags_provider_update', 'ags_nonce' ); ?>
						<button class="ags-btn <?php echo 'decline' === $action ? '' : 'ags-btn--primary'; ?>" type="submit"><?php echo esc_html( $label ); ?></button>
					</form>
					<?php
				}
			}
			echo '</div>';
		}
		/* translators: %s: amount */
		echo '<p class="ags-card"><strong>' . esc_html( sprintf( __( 'Earnings from completed jobs: ₹%s', 'ags-core' ), number_format_i18n( $earned ) ) ) . '</strong></p>';
		return ob_get_clean();
	}

	public static function provider_signup() {
		if ( is_user_logged_in() && AGS_Requests::provider_for_user( get_current_user_id() ) ) {
			return '<div class="ags-card"><p>' . esc_html__( 'You already have a provider profile.', 'ags-core' ) . ' <a href="' . esc_url( AGS_Install::page_url( 'provider' ) ) . '">' . esc_html__( 'Go to your dashboard', 'ags-core' ) . '</a></p></div>';
		}
		$user  = wp_get_current_user();
		$terms = get_terms(
			array(
				'taxonomy'   => 'ags_mandal',
				'hide_empty' => false,
			)
		);
		ob_start();
		echo self::notices(); // phpcs:ignore WordPress.Security.EscapeOutput
		?>
		<form class="ags-form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="ags_provider_signup">
			<?php wp_nonce_field( 'ags_provider_signup', 'ags_nonce' ); ?>
			<?php echo self::honeypot(); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			<p><label for="ags-pname"><?php esc_html_e( 'Your name or business name', 'ags-core' ); ?> *</label>
				<input class="ags-input" id="ags-pname" name="provider_name" required></p>
			<p><label for="ags-service_id"><?php esc_html_e( 'Main service', 'ags-core' ); ?> *</label>
				<?php echo self::term_select( 'ags_service', 'service_id', 0, __( 'Choose a service', 'ags-core' ), true ); // phpcs:ignore WordPress.Security.EscapeOutput ?></p>
			<fieldset class="ags-fieldset"><legend><?php esc_html_e( 'Mandals you serve', 'ags-core' ); ?></legend>
				<?php if ( ! is_wp_error( $terms ) ) : foreach ( $terms as $t ) : ?>
					<label class="ags-check"><input type="checkbox" name="mandal_ids[]" value="<?php echo (int) $t->term_id; ?>"> <?php echo esc_html( $t->name ); ?></label>
				<?php endforeach; endif; ?>
			</fieldset>
			<p><label for="ags-pphone"><?php esc_html_e( 'Phone', 'ags-core' ); ?> *</label>
				<input class="ags-input" id="ags-pphone" name="phone" type="tel" required></p>
			<p><label for="ags-pwa"><?php esc_html_e( 'WhatsApp (if different)', 'ags-core' ); ?></label>
				<input class="ags-input" id="ags-pwa" name="whatsapp" type="tel"></p>
			<p><label for="ags-pemail"><?php esc_html_e( 'Email (for your login)', 'ags-core' ); ?> *</label>
				<input class="ags-input" id="ags-pemail" name="email" type="email" required value="<?php echo esc_attr( $user->exists() ? $user->user_email : '' ); ?>"></p>
			<p><label for="ags-pexp"><?php esc_html_e( 'Years of experience', 'ags-core' ); ?></label>
				<input class="ags-input" id="ags-pexp" name="experience" type="number" min="0" max="60"></p>
			<p><label for="ags-pprice"><?php esc_html_e( 'Your charges (visiting charge, common jobs)', 'ags-core' ); ?></label>
				<textarea class="ags-input" id="ags-pprice" name="price_note" rows="2"></textarea></p>
			<p><label for="ags-pabout"><?php esc_html_e( 'About your work', 'ags-core' ); ?></label>
				<textarea class="ags-input" id="ags-pabout" name="about" rows="3"></textarea></p>
			<p><label class="ags-consent"><input type="checkbox" name="consent" value="1" required> <?php esc_html_e( 'I agree to the AGS provider terms and to verification of my ID and phone number.', 'ags-core' ); ?></label></p>
			<p><button class="ags-btn ags-btn--primary" type="submit"><?php esc_html_e( 'Apply to join AGS', 'ags-core' ); ?></button></p>
		</form>
		<?php
		return ob_get_clean();
	}

	public static function directory( $atts ) {
		$atts      = shortcode_atts( array( 'per_page' => 24 ), $atts );
		$q         = self::get_param( 'q' );
		$service   = absint( self::get_param( 'service_id' ) );
		$mandal    = absint( self::get_param( 'mandal_id' ) );
		$tax_query = array();
		if ( $service ) {
			$tax_query[] = array(
				'taxonomy' => 'ags_service',
				'terms'    => $service,
			);
		}
		if ( $mandal ) {
			$tax_query[] = array(
				'taxonomy' => 'ags_mandal',
				'terms'    => $mandal,
			);
		}
		$query = new WP_Query(
			array(
				'post_type'      => array( 'ags_listing', 'ags_provider' ),
				'post_status'    => 'publish',
				's'              => $q,
				'tax_query'      => $tax_query, // phpcs:ignore WordPress.DB.SlowDBQuery
				'posts_per_page' => (int) $atts['per_page'],
				'paged'          => max( 1, absint( self::get_param( 'pg' ) ) ),
			)
		);
		ob_start();
		?>
		<form class="ags-form ags-form--inline ags-search" method="get">
			<input class="ags-input" name="q" value="<?php echo esc_attr( $q ); ?>" placeholder="<?php esc_attr_e( 'Search: hospital, electrician, mobile store…', 'ags-core' ); ?>">
			<?php echo self::term_select( 'ags_service', 'service_id', $service, __( 'All services', 'ags-core' ) ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			<?php echo self::term_select( 'ags_mandal', 'mandal_id', $mandal, __( 'All mandals', 'ags-core' ) ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			<button class="ags-btn ags-btn--primary" type="submit"><?php esc_html_e( 'Search', 'ags-core' ); ?></button>
		</form>
		<div class="ags-grid">
		<?php
		if ( ! $query->have_posts() ) {
			echo '<p>' . esc_html__( 'Nothing found yet. Try another search, or send a request and we will find someone for you.', 'ags-core' ) . '</p>';
		}
		while ( $query->have_posts() ) {
			$query->the_post();
			echo AGS_Frontend::card( get_the_ID() ); // phpcs:ignore WordPress.Security.EscapeOutput
		}
		wp_reset_postdata();
		echo '</div>';
		if ( $query->max_num_pages > 1 ) {
			$current = max( 1, absint( self::get_param( 'pg' ) ) );
			echo '<nav class="ags-pager">';
			if ( $current > 1 ) {
				echo '<a class="ags-btn" href="' . esc_url( add_query_arg( 'pg', $current - 1 ) ) . '">' . esc_html__( 'Previous', 'ags-core' ) . '</a> ';
			}
			if ( $current < $query->max_num_pages ) {
				echo '<a class="ags-btn" href="' . esc_url( add_query_arg( 'pg', $current + 1 ) ) . '">' . esc_html__( 'Next', 'ags-core' ) . '</a>';
			}
			echo '</nav>';
		}
		return ob_get_clean();
	}

	public static function lead_form( $atts ) {
		$atts = shortcode_atts( array( 'source' => 'agservices.in' ), $atts );
		ob_start();
		echo self::notices(); // phpcs:ignore WordPress.Security.EscapeOutput
		?>
		<form class="ags-form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="ags_submit_lead">
			<input type="hidden" name="source" value="<?php echo esc_attr( $atts['source'] ); ?>">
			<?php wp_nonce_field( 'ags_submit_lead', 'ags_nonce' ); ?>
			<?php echo self::honeypot(); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			<p><label for="ags-lname"><?php esc_html_e( 'Name', 'ags-core' ); ?> *</label><input class="ags-input" id="ags-lname" name="name" required></p>
			<p><label for="ags-lphone"><?php esc_html_e( 'Phone / WhatsApp', 'ags-core' ); ?> *</label><input class="ags-input" id="ags-lphone" name="phone" type="tel" required></p>
			<p><label for="ags-lemail"><?php esc_html_e( 'Email', 'ags-core' ); ?></label><input class="ags-input" id="ags-lemail" name="email" type="email"></p>
			<p><label for="ags-lbiz"><?php esc_html_e( 'Business name', 'ags-core' ); ?></label><input class="ags-input" id="ags-lbiz" name="business"></p>
			<p><label for="ags-lneed"><?php esc_html_e( 'What do you need? (website, WhatsApp bot, app, course…)', 'ags-core' ); ?></label><textarea class="ags-input" id="ags-lneed" name="need" rows="3"></textarea></p>
			<p><?php echo self::consent_box(); // phpcs:ignore WordPress.Security.EscapeOutput ?></p>
			<p><button class="ags-btn ags-btn--primary" type="submit"><?php esc_html_e( 'Get a free quote', 'ags-core' ); ?></button></p>
		</form>
		<?php
		return ob_get_clean();
	}

	public static function service_grid( $atts ) {
		$atts  = shortcode_atts( array( 'parent' => '' ), $atts );
		$args  = array(
			'taxonomy'   => 'ags_service',
			'hide_empty' => false,
			'parent'     => 0,
		);
		$terms = get_terms( $args );
		if ( is_wp_error( $terms ) ) {
			return '';
		}
		$out = '<div class="ags-service-grid">';
		foreach ( $terms as $parent ) {
			$children = get_terms(
				array(
					'taxonomy'   => 'ags_service',
					'hide_empty' => false,
					'parent'     => $parent->term_id,
				)
			);
			$out .= '<div class="ags-service-group"><h3>' . esc_html( $parent->name ) . '</h3><ul>';
			foreach ( (array) $children as $child ) {
				$out .= '<li><a href="' . esc_url( get_term_link( $child ) ) . '">' . esc_html( $child->name ) . '</a></li>';
			}
			$out .= '</ul></div>';
		}
		return $out . '</div>';
	}
}
