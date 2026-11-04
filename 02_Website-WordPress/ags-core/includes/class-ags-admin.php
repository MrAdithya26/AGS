<?php
/**
 * Admin: AGS menu, dashboard, requests board, leads CRM, settings.
 *
 * @package AGS_Core
 */

defined( 'ABSPATH' ) || exit;

class AGS_Admin {

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );
		add_action( 'admin_post_ags_admin_update', array( __CLASS__, 'handle_request_update' ) );
		add_action( 'admin_post_ags_lead_update', array( __CLASS__, 'handle_lead_update' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'assets' ) );
		add_filter( 'manage_ags_request_posts_columns', array( __CLASS__, 'request_columns' ) );
		add_action( 'manage_ags_request_posts_custom_column', array( __CLASS__, 'request_column' ), 10, 2 );
	}

	public static function assets( $hook ) {
		if ( false !== strpos( (string) $hook, 'ags' ) ) {
			wp_enqueue_style( 'ags-admin', AGS_URL . 'assets/ags-admin.css', array(), AGS_VERSION );
		}
	}

	public static function menu() {
		add_menu_page( __( 'AGS', 'ags-core' ), __( 'AGS', 'ags-core' ), 'manage_ags', 'ags', array( __CLASS__, 'dashboard' ), 'dashicons-hammer', 3 );
		add_submenu_page( 'ags', __( 'AGS Dashboard', 'ags-core' ), __( 'Dashboard', 'ags-core' ), 'manage_ags', 'ags', array( __CLASS__, 'dashboard' ) );
		add_submenu_page( 'ags', __( 'Requests board', 'ags-core' ), __( 'Requests board', 'ags-core' ), 'manage_ags', 'ags-board', array( __CLASS__, 'board' ) );
		add_submenu_page( 'ags', __( 'Leads CRM', 'ags-core' ), __( 'Leads CRM', 'ags-core' ), 'manage_ags', 'ags-leads', array( __CLASS__, 'leads' ) );
		add_submenu_page( 'ags', __( 'Service categories', 'ags-core' ), __( 'Service categories', 'ags-core' ), 'manage_categories', 'edit-tags.php?taxonomy=ags_service&post_type=ags_listing' );
		add_submenu_page( 'ags', __( 'Mandals', 'ags-core' ), __( 'Mandals', 'ags-core' ), 'manage_categories', 'edit-tags.php?taxonomy=ags_mandal&post_type=ags_listing' );
		add_submenu_page( 'ags', __( 'AGS Settings', 'ags-core' ), __( 'Settings', 'ags-core' ), 'manage_options', 'ags-settings', array( __CLASS__, 'settings_page' ) );
	}

	private static function count_by_status() {
		$counts = array_fill_keys( array_keys( AGS_Statuses::request() ), 0 );
		$ids    = get_posts(
			array(
				'post_type'      => 'ags_request',
				'posts_per_page' => -1,
				'fields'         => 'ids',
			)
		);
		foreach ( $ids as $id ) {
			$s = AGS_Meta::get( $id, 'status' );
			if ( isset( $counts[ $s ] ) ) {
				++$counts[ $s ];
			}
		}
		return $counts;
	}

	public static function dashboard() {
		$counts     = self::count_by_status();
		$open       = $counts['new'] + $counts['assigned'] + $counts['accepted'] + $counts['on_the_way'] + $counts['in_progress'];
		$completed  = get_posts(
			array(
				'post_type'      => 'ags_request',
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'meta_key'       => AGS_Meta::key( 'status' ), // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value'     => 'completed', // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);
		$commission = 0;
		foreach ( $completed as $id ) {
			$commission += (float) AGS_Meta::get( $id, 'commission' );
		}
		$pending_providers = wp_count_posts( 'ags_provider' )->pending;
		$listings          = wp_count_posts( 'ags_listing' )->publish;
		$new_leads         = count(
			get_posts(
				array(
					'post_type'      => 'ags_lead',
					'posts_per_page' => -1,
					'fields'         => 'ids',
					'meta_key'       => AGS_Meta::key( 'status' ), // phpcs:ignore WordPress.DB.SlowDBQuery
					'meta_value'     => 'new', // phpcs:ignore WordPress.DB.SlowDBQuery
				)
			)
		);
		$tiles = array(
			array( __( 'New requests', 'ags-core' ), $counts['new'], admin_url( 'admin.php?page=ags-board&status=new' ) ),
			array( __( 'Open jobs', 'ags-core' ), $open, admin_url( 'admin.php?page=ags-board' ) ),
			array( __( 'Completed jobs', 'ags-core' ), $counts['completed'], admin_url( 'admin.php?page=ags-board&status=completed' ) ),
			array( __( 'Commission earned (₹)', 'ags-core' ), number_format_i18n( $commission ), '' ),
			array( __( 'Providers to verify', 'ags-core' ), $pending_providers, admin_url( 'edit.php?post_status=pending&post_type=ags_provider' ) ),
			array( __( 'Live listings', 'ags-core' ), $listings, admin_url( 'edit.php?post_type=ags_listing' ) ),
			array( __( 'New leads', 'ags-core' ), $new_leads, admin_url( 'admin.php?page=ags-leads' ) ),
		);
		echo '<div class="wrap ags-admin"><h1>' . esc_html__( 'AGS Dashboard', 'ags-core' ) . '</h1><div class="ags-tiles">';
		foreach ( $tiles as $t ) {
			$inner = '<span class="ags-tile__num">' . esc_html( (string) $t[1] ) . '</span><span class="ags-tile__label">' . esc_html( $t[0] ) . '</span>';
			echo $t[2] ? '<a class="ags-tile" href="' . esc_url( $t[2] ) . '">' . $inner . '</a>' : '<div class="ags-tile">' . $inner . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput
		}
		echo '</div><h2>' . esc_html__( 'Daily routine', 'ags-core' ) . '</h2><ol>';
		echo '<li>' . esc_html__( 'Assign every new request within 30 minutes.', 'ags-core' ) . '</li>';
		echo '<li>' . esc_html__( 'Call providers waiting for verification.', 'ags-core' ) . '</li>';
		echo '<li>' . esc_html__( 'Reply to every new lead the same day.', 'ags-core' ) . '</li>';
		echo '<li>' . esc_html__( 'In the evening, close completed jobs and record amount and commission.', 'ags-core' ) . '</li>';
		echo '</ol></div>';
	}

	public static function board() {
		$status   = isset( $_GET['status'] ) ? sanitize_key( wp_unslash( $_GET['status'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
		$counts   = self::count_by_status();
		$args     = array(
			'post_type'      => 'ags_request',
			'posts_per_page' => 100,
		);
		if ( AGS_Statuses::is_request_status( $status ) ) {
			$args['meta_key']   = AGS_Meta::key( 'status' ); // phpcs:ignore WordPress.DB.SlowDBQuery
			$args['meta_value'] = $status; // phpcs:ignore WordPress.DB.SlowDBQuery
		}
		$requests  = get_posts( $args );
		$providers = AGS_Meta::provider_options();

		echo '<div class="wrap ags-admin"><h1>' . esc_html__( 'Requests board', 'ags-core' ) . '</h1>';
		if ( isset( $_GET['updated'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			echo '<div class="notice notice-success"><p>' . esc_html__( 'Request updated.', 'ags-core' ) . '</p></div>';
		}
		echo '<ul class="subsubsub"><li><a href="' . esc_url( admin_url( 'admin.php?page=ags-board' ) ) . '">' . esc_html__( 'All', 'ags-core' ) . '</a></li>';
		foreach ( AGS_Statuses::request() as $key => $label ) {
			echo ' | <li><a href="' . esc_url( admin_url( 'admin.php?page=ags-board&status=' . $key ) ) . '"' . ( $status === $key ? ' class="current"' : '' ) . '>' . esc_html( $label ) . ' <span class="count">(' . (int) $counts[ $key ] . ')</span></a></li>';
		}
		echo '</ul><table class="widefat striped ags-board"><thead><tr>';
		foreach ( array( __( 'Request', 'ags-core' ), __( 'Service / Mandal', 'ags-core' ), __( 'Customer', 'ags-core' ), __( 'Preferred time', 'ags-core' ), __( 'Update', 'ags-core' ) ) as $h ) {
			echo '<th>' . esc_html( $h ) . '</th>';
		}
		echo '</tr></thead><tbody>';
		if ( ! $requests ) {
			echo '<tr><td colspan="5">' . esc_html__( 'No requests here.', 'ags-core' ) . '</td></tr>';
		}
		foreach ( $requests as $r ) {
			$s        = AGS_Meta::get( $r->ID, 'status' );
			$services = wp_get_post_terms( $r->ID, 'ags_service', array( 'fields' => 'names' ) );
			$mandals  = wp_get_post_terms( $r->ID, 'ags_mandal', array( 'fields' => 'names' ) );
			echo '<tr><td><a href="' . esc_url( get_edit_post_link( $r->ID ) ) . '"><strong>' . esc_html( AGS_Requests::reference( $r->ID ) ) . '</strong></a><br>' . AGS_Shortcodes::status_badge( $s ) . '<br><small>' . esc_html( get_the_date( 'd M, h:i A', $r ) ) . '</small></td>'; // phpcs:ignore WordPress.Security.EscapeOutput
			echo '<td>' . esc_html( implode( ', ', $services ) ) . '<br><small>' . esc_html( implode( ', ', $mandals ) ) . '</small></td>';
			echo '<td>' . esc_html( AGS_Meta::get( $r->ID, 'customer_name' ) ) . '<br><a href="tel:' . esc_attr( AGS_Meta::get( $r->ID, 'phone' ) ) . '">' . esc_html( AGS_Meta::get( $r->ID, 'phone' ) ) . '</a><br><small>' . esc_html( wp_trim_words( AGS_Meta::get( $r->ID, 'details' ), 15 ) ) . '</small></td>';
			echo '<td>' . esc_html( AGS_Meta::get( $r->ID, 'preferred_time' ) ) . '</td><td>';
			echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" class="ags-board__form">';
			echo '<input type="hidden" name="action" value="ags_admin_update"><input type="hidden" name="request_id" value="' . (int) $r->ID . '">';
			wp_nonce_field( 'ags_admin_update_' . $r->ID, 'ags_nonce' );
			echo '<select name="provider_id"><option value="">' . esc_html__( 'Assign provider…', 'ags-core' ) . '</option>';
			$current = (int) AGS_Meta::get( $r->ID, 'provider_id' );
			foreach ( $providers as $pid => $label ) {
				echo '<option value="' . (int) $pid . '"' . selected( $current, $pid, false ) . '>' . esc_html( $label ) . '</option>';
			}
			echo '</select> <select name="status">';
			foreach ( AGS_Statuses::request() as $key => $label ) {
				echo '<option value="' . esc_attr( $key ) . '"' . selected( $s, $key, false ) . '>' . esc_html( $label ) . '</option>';
			}
			echo '</select> <input type="number" name="amount" min="0" placeholder="₹ amount" value="' . esc_attr( AGS_Meta::get( $r->ID, 'amount' ) ) . '" class="small-text">';
			submit_button( __( 'Save', 'ags-core' ), 'small', 'submit', false );
			echo '</form></td></tr>';
		}
		echo '</tbody></table></div>';
	}

	public static function handle_request_update() {
		$request_id = isset( $_POST['request_id'] ) ? absint( $_POST['request_id'] ) : 0;
		if ( ! current_user_can( 'manage_ags' ) || ! isset( $_POST['ags_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['ags_nonce'] ) ), 'ags_admin_update_' . $request_id ) || 'ags_request' !== get_post_type( $request_id ) ) {
			wp_die( esc_html__( 'Not allowed.', 'ags-core' ) );
		}
		$provider = isset( $_POST['provider_id'] ) ? absint( $_POST['provider_id'] ) : 0;
		$status   = isset( $_POST['status'] ) ? sanitize_key( wp_unslash( $_POST['status'] ) ) : '';
		$amount   = isset( $_POST['amount'] ) ? sanitize_text_field( wp_unslash( $_POST['amount'] ) ) : '';
		$current  = (int) AGS_Meta::get( $request_id, 'provider_id' );
		$old      = AGS_Meta::get( $request_id, 'status' );

		if ( $provider && $provider !== $current && 'ags_provider' === get_post_type( $provider ) ) {
			AGS_Requests::assign( $request_id, $provider );
		} elseif ( $status && $status !== $old ) {
			AGS_Requests::set_status( $request_id, $status, __( 'Updated on requests board', 'ags-core' ) );
		}
		if ( '' !== $amount ) {
			$amount = (float) $amount;
			AGS_Meta::set( $request_id, 'amount', (string) $amount );
			$pct = (float) AGS_Notify::settings()['commission_percent'];
			AGS_Meta::set( $request_id, 'commission', (string) round( $amount * $pct / 100, 2 ) );
		}
		$back = wp_get_referer() ? wp_get_referer() : admin_url( 'admin.php?page=ags-board' );
		wp_safe_redirect( add_query_arg( 'updated', 1, $back ) );
		exit;
	}

	public static function leads() {
		$leads = get_posts(
			array(
				'post_type'      => 'ags_lead',
				'posts_per_page' => 200,
			)
		);
		echo '<div class="wrap ags-admin"><h1>' . esc_html__( 'Leads CRM', 'ags-core' ) . '</h1>';
		echo '<p>' . esc_html__( 'Leads from the tech site, courses and AGS forms. Reply the same day and keep a follow-up date on every open lead.', 'ags-core' ) . '</p>';
		echo '<table class="widefat striped"><thead><tr><th>' . esc_html__( 'Lead', 'ags-core' ) . '</th><th>' . esc_html__( 'Need', 'ags-core' ) . '</th><th>' . esc_html__( 'Source', 'ags-core' ) . '</th><th>' . esc_html__( 'Status and follow-up', 'ags-core' ) . '</th></tr></thead><tbody>';
		if ( ! $leads ) {
			echo '<tr><td colspan="4">' . esc_html__( 'No leads yet.', 'ags-core' ) . '</td></tr>';
		}
		$today = current_time( 'Y-m-d' );
		foreach ( $leads as $l ) {
			$follow = AGS_Meta::get( $l->ID, 'follow_up' );
			$due    = $follow && $follow <= $today && ! in_array( AGS_Meta::get( $l->ID, 'status' ), array( 'won', 'lost' ), true );
			echo '<tr' . ( $due ? ' class="ags-due"' : '' ) . '><td><a href="' . esc_url( get_edit_post_link( $l->ID ) ) . '"><strong>' . esc_html( $l->post_title ) . '</strong></a><br><a href="tel:' . esc_attr( AGS_Meta::get( $l->ID, 'phone' ) ) . '">' . esc_html( AGS_Meta::get( $l->ID, 'phone' ) ) . '</a> ' . esc_html( AGS_Meta::get( $l->ID, 'email' ) ) . '</td>';
			echo '<td>' . esc_html( AGS_Meta::get( $l->ID, 'need' ) ) . '</td><td>' . esc_html( AGS_Meta::get( $l->ID, 'source' ) ) . '<br><small>' . esc_html( get_the_date( 'd M Y', $l ) ) . '</small></td><td>';
			echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '"><input type="hidden" name="action" value="ags_lead_update"><input type="hidden" name="lead_id" value="' . (int) $l->ID . '">';
			wp_nonce_field( 'ags_lead_update_' . $l->ID, 'ags_nonce' );
			echo '<select name="status">';
			foreach ( AGS_Statuses::lead() as $key => $label ) {
				echo '<option value="' . esc_attr( $key ) . '"' . selected( AGS_Meta::get( $l->ID, 'status' ), $key, false ) . '>' . esc_html( $label ) . '</option>';
			}
			echo '</select> <input type="date" name="follow_up" value="' . esc_attr( $follow ) . '"> ';
			submit_button( __( 'Save', 'ags-core' ), 'small', 'submit', false );
			echo '</form></td></tr>';
		}
		echo '</tbody></table></div>';
	}

	public static function handle_lead_update() {
		$lead_id = isset( $_POST['lead_id'] ) ? absint( $_POST['lead_id'] ) : 0;
		if ( ! current_user_can( 'manage_ags' ) || ! isset( $_POST['ags_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['ags_nonce'] ) ), 'ags_lead_update_' . $lead_id ) || 'ags_lead' !== get_post_type( $lead_id ) ) {
			wp_die( esc_html__( 'Not allowed.', 'ags-core' ) );
		}
		$status = isset( $_POST['status'] ) ? sanitize_key( wp_unslash( $_POST['status'] ) ) : '';
		if ( array_key_exists( $status, AGS_Statuses::lead() ) ) {
			AGS_Meta::set( $lead_id, 'status', $status );
		}
		$date = isset( $_POST['follow_up'] ) ? sanitize_text_field( wp_unslash( $_POST['follow_up'] ) ) : '';
		if ( '' === $date || preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) ) {
			AGS_Meta::set( $lead_id, 'follow_up', $date );
		}
		wp_safe_redirect( admin_url( 'admin.php?page=ags-leads' ) );
		exit;
	}

	public static function register_settings() {
		register_setting(
			'ags_settings',
			'ags_settings',
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitize_settings' ),
			)
		);
	}

	public static function sanitize_settings( $input ) {
		$input = is_array( $input ) ? $input : array();
		return array(
			'team_email'         => sanitize_email( isset( $input['team_email'] ) ? $input['team_email'] : '' ),
			'telegram_bot_token' => sanitize_text_field( isset( $input['telegram_bot_token'] ) ? $input['telegram_bot_token'] : '' ),
			'telegram_chat_id'   => sanitize_text_field( isset( $input['telegram_chat_id'] ) ? $input['telegram_chat_id'] : '' ),
			'whatsapp_number'    => preg_replace( '/[^0-9+]/', '', isset( $input['whatsapp_number'] ) ? $input['whatsapp_number'] : '' ),
			'commission_percent' => (string) min( 100, max( 0, (float) ( isset( $input['commission_percent'] ) ? $input['commission_percent'] : 10 ) ) ),
			'lead_api_key'       => sanitize_text_field( isset( $input['lead_api_key'] ) ? $input['lead_api_key'] : '' ),
		);
	}

	public static function settings_page() {
		$s      = AGS_Notify::settings();
		$fields = array(
			'team_email'         => array( __( 'Team email for alerts', 'ags-core' ), 'email', '' ),
			'telegram_bot_token' => array( __( 'Telegram bot token (optional)', 'ags-core' ), 'password', __( 'Create a bot with @BotFather. New requests, providers and leads are sent to the chat below.', 'ags-core' ) ),
			'telegram_chat_id'   => array( __( 'Telegram chat ID', 'ags-core' ), 'text', '' ),
			'whatsapp_number'    => array( __( 'AGS WhatsApp number', 'ags-core' ), 'text', __( 'Shows a floating WhatsApp button on every page. Leave empty to hide.', 'ags-core' ) ),
			'commission_percent' => array( __( 'Commission %', 'ags-core' ), 'number', __( 'Used to calculate commission when a job amount is saved.', 'ags-core' ) ),
			'lead_api_key'       => array( __( 'Lead API key', 'ags-core' ), 'text', __( 'Shared secret for the tech site and other ABCD sites to send leads here (ABCD Network plugin). Use a long random value.', 'ags-core' ) ),
		);
		echo '<div class="wrap"><h1>' . esc_html__( 'AGS Settings', 'ags-core' ) . '</h1><form method="post" action="options.php">';
		settings_fields( 'ags_settings' );
		echo '<table class="form-table">';
		foreach ( $fields as $key => $f ) {
			printf(
				'<tr><th><label for="ags-set-%1$s">%2$s</label></th><td><input class="regular-text" id="ags-set-%1$s" type="%3$s" name="ags_settings[%1$s]" value="%4$s" autocomplete="off">%5$s</td></tr>',
				esc_attr( $key ),
				esc_html( $f[0] ),
				esc_attr( $f[1] ),
				esc_attr( $s[ $key ] ),
				$f[2] ? '<p class="description">' . esc_html( $f[2] ) . '</p>' : ''
			);
		}
		echo '</table>';
		submit_button();
		echo '</form><h2>' . esc_html__( 'Shortcodes', 'ags-core' ) . '</h2><ul>';
		foreach ( array( '[ags_request_form]', '[ags_track_request]', '[ags_customer_dashboard]', '[ags_provider_dashboard]', '[ags_provider_signup]', '[ags_directory]', '[ags_service_grid]', '[ags_lead_form source="tech.agservices.in"]' ) as $code ) {
			echo '<li><code>' . esc_html( $code ) . '</code></li>';
		}
		echo '</ul></div>';
	}

	public static function request_columns( $cols ) {
		$cols['ags_status']   = __( 'Status', 'ags-core' );
		$cols['ags_customer'] = __( 'Customer', 'ags-core' );
		return $cols;
	}

	public static function request_column( $col, $post_id ) {
		if ( 'ags_status' === $col ) {
			echo AGS_Shortcodes::status_badge( AGS_Meta::get( $post_id, 'status' ) ); // phpcs:ignore WordPress.Security.EscapeOutput
		} elseif ( 'ags_customer' === $col ) {
			echo esc_html( AGS_Meta::get( $post_id, 'customer_name' ) . ' · ' . AGS_Meta::get( $post_id, 'phone' ) );
		}
	}
}
