<?php
/**
 * Title: Empty Mini Cart
 * Slug: assembler/hidden-empty-mini-cart
 * Inserter: no
 */
declare( strict_types = 1 );
?>

<!-- wp:woocommerce/empty-mini-cart-contents-block -->
<div class="wp-block-woocommerce-empty-mini-cart-contents-block">
	<!-- wp:paragraph {"align":"center"} -->
	<p class="has-text-align-center"><?php esc_html_e('Your basket is currently empty!', 'assembler');?></p>
	<!-- /wp:paragraph -->

	<!-- wp:woocommerce/mini-cart-shopping-button-block -->
		<div class="wp-block-woocommerce-mini-cart-shopping-button-block"></div>
	<!-- /wp:woocommerce/mini-cart-shopping-button-block -->
</div>
<!-- /wp:woocommerce/empty-mini-cart-contents-block -->
