<?php
/**
 * Service request statuses and lead statuses.
 *
 * @package AGS_Core
 */

defined( 'ABSPATH' ) || exit;

class AGS_Statuses {

	/**
	 * Request statuses in workflow order.
	 *
	 * @return array<string,string>
	 */
	public static function request() {
		return array(
			'new'         => __( 'New', 'ags-core' ),
			'assigned'    => __( 'Assigned', 'ags-core' ),
			'accepted'    => __( 'Accepted by provider', 'ags-core' ),
			'on_the_way'  => __( 'On the way', 'ags-core' ),
			'in_progress' => __( 'Work in progress', 'ags-core' ),
			'completed'   => __( 'Completed', 'ags-core' ),
			'cancelled'   => __( 'Cancelled', 'ags-core' ),
		);
	}

	/**
	 * Statuses a provider may move a job to.
	 *
	 * @return string[]
	 */
	public static function provider_allowed() {
		return array( 'accepted', 'on_the_way', 'in_progress', 'completed' );
	}

	/**
	 * Lead statuses.
	 *
	 * @return array<string,string>
	 */
	public static function lead() {
		return array(
			'new'       => __( 'New', 'ags-core' ),
			'contacted' => __( 'Contacted', 'ags-core' ),
			'quoted'    => __( 'Quoted', 'ags-core' ),
			'won'       => __( 'Won', 'ags-core' ),
			'lost'      => __( 'Lost', 'ags-core' ),
		);
	}

	public static function request_label( $status ) {
		$all = self::request();
		return isset( $all[ $status ] ) ? $all[ $status ] : $status;
	}

	public static function lead_label( $status ) {
		$all = self::lead();
		return isset( $all[ $status ] ) ? $all[ $status ] : $status;
	}

	public static function is_request_status( $status ) {
		return array_key_exists( $status, self::request() );
	}
}
