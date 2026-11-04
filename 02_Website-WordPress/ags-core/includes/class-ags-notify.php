<?php
/**
 * Team alerts (email + optional Telegram) and customer / provider emails.
 *
 * @package AGS_Core
 */

defined( 'ABSPATH' ) || exit;

class AGS_Notify {

	public static function boot() {
		add_action( 'ags_request_created', array( __CLASS__, 'request_created' ) );
		add_action( 'ags_request_assigned', array( __CLASS__, 'request_assigned' ), 10, 2 );
		add_action( 'ags_request_status_changed', array( __CLASS__, 'status_changed' ), 10, 3 );
		add_action( 'ags_provider_signed_up', array( __CLASS__, 'provider_signed_up' ) );
		add_action( 'ags_lead_created', array( __CLASS__, 'lead_created' ) );
	}

	public static function settings() {
		return wp_parse_args(
			get_option( 'ags_settings', array() ),
			array(
				'team_email'         => get_option( 'admin_email' ),
				'telegram_bot_token' => '',
				'telegram_chat_id'   => '',
				'whatsapp_number'    => '',
				'commission_percent' => '10',
				'lead_api_key'       => '',
			)
		);
	}

	public static function team( $subject, $lines, $admin_link = '' ) {
		$s    = self::settings();
		$body = implode( "\n", array_filter( $lines ) ) . ( $admin_link ? "\n\n" . $admin_link : '' );
		if ( is_email( $s['team_email'] ) ) {
			wp_mail( $s['team_email'], '[AGS] ' . $subject, $body );
		}
		self::telegram( "🔔 {$subject}\n\n{$body}" );
	}

	public static function telegram( $text ) {
		$s = self::settings();
		if ( '' === $s['telegram_bot_token'] || '' === $s['telegram_chat_id'] ) {
			return;
		}
		wp_remote_post(
			'https://api.telegram.org/bot' . rawurlencode( $s['telegram_bot_token'] ) . '/sendMessage',
			array(
				'timeout'  => 8,
				'blocking' => false,
				'body'     => array(
					'chat_id'                  => $s['telegram_chat_id'],
					'text'                     => $text,
					'disable_web_page_preview' => 'true',
				),
			)
		);
	}

	private static function terms_line( $post_id, $tax ) {
		$names = wp_get_post_terms( $post_id, $tax, array( 'fields' => 'names' ) );
		return is_wp_error( $names ) ? '' : implode( ', ', $names );
	}

	public static function request_created( $id ) {
		self::team(
			sprintf( 'New request %s', AGS_Requests::reference( $id ) ),
			array(
				'Service: ' . self::terms_line( $id, 'ags_service' ),
				'Mandal: ' . self::terms_line( $id, 'ags_mandal' ),
				'Name: ' . AGS_Meta::get( $id, 'customer_name' ),
				'Phone: ' . AGS_Meta::get( $id, 'phone' ),
				'Time: ' . AGS_Meta::get( $id, 'preferred_time' ),
				'Details: ' . AGS_Meta::get( $id, 'details' ),
			),
			admin_url( 'admin.php?page=ags-board' )
		);
	}

	public static function request_assigned( $id, $provider_id ) {
		$user = get_userdata( (int) AGS_Meta::get( $provider_id, 'user_id' ) );
		if ( $user && is_email( $user->user_email ) ) {
			wp_mail(
				$user->user_email,
				sprintf( 'New AGS job %s', AGS_Requests::reference( $id ) ),
				implode(
					"\n",
					array(
						'You have a new job from AGS.',
						'Service: ' . self::terms_line( $id, 'ags_service' ),
						'Area: ' . self::terms_line( $id, 'ags_mandal' ),
						'Preferred time: ' . AGS_Meta::get( $id, 'preferred_time' ),
						'',
						'Accept or decline here: ' . AGS_Install::page_url( 'provider' ),
					)
				)
			);
		}
	}

	public static function status_changed( $id, $status, $old ) {
		if ( $status === $old ) {
			return;
		}
		$customer = get_userdata( (int) AGS_Meta::get( $id, 'customer_id' ) );
		if ( $customer && is_email( $customer->user_email ) && in_array( $status, array( 'assigned', 'on_the_way', 'completed', 'cancelled' ), true ) ) {
			wp_mail(
				$customer->user_email,
				sprintf( 'Your AGS request %s: %s', AGS_Requests::reference( $id ), AGS_Statuses::request_label( $status ) ),
				sprintf( "Your request is now: %s\n\nTrack it here: %s", AGS_Statuses::request_label( $status ), AGS_Install::page_url( 'account' ) )
			);
		}
		if ( in_array( $status, array( 'completed', 'cancelled' ), true ) || ( 'new' === $status && 'new' !== $old ) ) {
			self::team(
				sprintf( '%s is now %s', AGS_Requests::reference( $id ), AGS_Statuses::request_label( $status ) ),
				array(),
				admin_url( 'admin.php?page=ags-board' )
			);
		}
	}

	public static function provider_signed_up( $provider_id ) {
		self::team(
			'New provider application: ' . get_the_title( $provider_id ),
			array(
				'Service: ' . self::terms_line( $provider_id, 'ags_service' ),
				'Phone: ' . AGS_Meta::get( $provider_id, 'phone' ),
				'Verify, then publish the provider.',
			),
			admin_url( 'post.php?action=edit&post=' . $provider_id )
		);
	}

	public static function lead_created( $lead_id ) {
		self::team(
			'New lead: ' . get_the_title( $lead_id ),
			array(
				'Phone: ' . AGS_Meta::get( $lead_id, 'phone' ),
				'Need: ' . AGS_Meta::get( $lead_id, 'need' ),
				'Source: ' . AGS_Meta::get( $lead_id, 'source' ),
			),
			admin_url( 'admin.php?page=ags-leads' )
		);
	}
}

AGS_Notify::boot();
